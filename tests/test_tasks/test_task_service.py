from datetime import timedelta

"""Unit tests for TaskService"""

import pytest
from datetime import date, datetime
from unittest.mock import Mock, MagicMock, patch
from sqlalchemy.orm import Session
from datetime import timedelta

from src.services.tasks.task_service import TaskService, ComplianceMetrics
from src.db.models import TaskTemplate, TaskInstance, TaskAuditLog


class TestTaskService:
    """Test cases for TaskService"""

    def setup_method(self):
        """Set up test fixtures"""
        self.service = TaskService()
        self.mock_db = Mock(spec=Session)

    def test_create_task_template_valid(self):
        """Test creating a valid task template"""
        # Mock the RRULE validation
        self.service.rrule_parser.validate_rrule = Mock()
        self.service.rrule_parser.validate_rrule.return_value.is_valid = True

        # Mock database operations
        self.mock_db.add = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()

        template = self.service.create_task_template(
            self.mock_db,
            name="Test Task",
            rrule="RRULE:FREQ=DAILY",
            description="Test description",
            is_blocking=True,
            category="daily",
            priority=1,
            estimated_duration=30,
        )

        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()

    def test_create_task_template_invalid_rrule(self):
        """Test creating task template with invalid RRULE"""
        # Mock invalid RRULE validation
        self.service.rrule_parser.validate_rrule = Mock()
        self.service.rrule_parser.validate_rrule.return_value.is_valid = False
        self.service.rrule_parser.validate_rrule.return_value.error_message = "Invalid syntax"

        with pytest.raises(ValueError, match="Invalid RRULE"):
            self.service.create_task_template(self.mock_db, name="Test Task", rrule="INVALID_RRULE")

    def test_update_task_template(self):
        """Test updating an existing task template"""
        # Mock existing template
        mock_template = Mock(spec=TaskTemplate)
        mock_template.id = 1
        mock_template.name = "Old Name"

        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_template
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()

        # Mock RRULE validation for update
        self.service.rrule_parser.validate_rrule = Mock()
        self.service.rrule_parser.validate_rrule.return_value.is_valid = True

        updated = self.service.update_task_template(
            self.mock_db, template_id=1, name="New Name", rrule="RRULE:FREQ=WEEKLY"
        )

        assert mock_template.name == "New Name"
        assert mock_template.rrule == "RRULE:FREQ=WEEKLY"
        self.mock_db.commit.assert_called_once()

    def test_update_task_template_not_found(self):
        """Test updating non-existent task template"""
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="Task template 999 not found"):
            self.service.update_task_template(self.mock_db, template_id=999)

    def test_delete_task_template(self):
        """Test soft deleting a task template"""
        mock_template = Mock(spec=TaskTemplate)
        mock_template.is_active = True

        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_template
        self.mock_db.commit = Mock()

        result = self.service.delete_task_template(self.mock_db, template_id=1)

        assert result is True
        assert mock_template.is_active is False
        self.mock_db.commit.assert_called_once()

    def test_delete_task_template_not_found(self):
        """Test deleting non-existent task template"""
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        result = self.service.delete_task_template(self.mock_db, template_id=999)

        assert result is False

    def test_get_task_templates_active_only(self):
        """Test getting active task templates"""
        mock_templates = [Mock(spec=TaskTemplate), Mock(spec=TaskTemplate)]
        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_templates

        templates = self.service.get_task_templates(self.mock_db, active_only=True)

        assert len(templates) == 2
        # Verify filter was called for active templates
        self.mock_db.query.return_value.filter.assert_called_once()

    def test_generate_task_instances(self):
        """Test generating task instances from templates"""
        # Mock active templates
        mock_template = Mock(spec=TaskTemplate)
        mock_template.id = 1
        mock_template.name = "Daily Task"
        mock_template.rrule = "RRULE:FREQ=DAILY"
        mock_template.is_blocking = False
        mock_template.priority = 1
        mock_template.description = "Test"

        self.service.get_task_templates = Mock(return_value=[mock_template])

        # Mock RRULE occurrences
        mock_occurrences = [datetime(2025, 7, 16, 10, 0), datetime(2025, 7, 17, 10, 0)]
        self.service.rrule_parser.generate_occurrences = Mock(return_value=mock_occurrences)

        # Mock existing task check
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        self.mock_db.add = Mock()
        self.mock_db.commit = Mock()

        instances = self.service.generate_task_instances(
            self.mock_db, date(2025, 7, 16), date(2025, 7, 17)
        )

        assert len(instances) == 2
        assert self.mock_db.add.call_count == 2
        self.mock_db.commit.assert_called_once()

    def test_generate_task_instances_skip_existing(self):
        """Test that existing task instances are not duplicated"""
        mock_template = Mock(spec=TaskTemplate)
        mock_template.id = 1
        mock_template.rrule = "RRULE:FREQ=DAILY"

        self.service.get_task_templates = Mock(return_value=[mock_template])
        self.service.rrule_parser.generate_occurrences = Mock(
            return_value=[datetime(2025, 7, 16, 10, 0)]
        )

        # Mock existing task
        self.mock_db.query.return_value.filter.return_value.first.return_value = Mock()

        instances = self.service.generate_task_instances(
            self.mock_db, date(2025, 7, 16), date(2025, 7, 16)
        )

        assert len(instances) == 0  # No new instances created
        self.mock_db.add.assert_not_called()

    def test_get_pending_tasks(self):
        """Test getting pending tasks"""
        mock_tasks = [
            self._create_mock_task(1, "Task 1", "pending"),
            self._create_mock_task(2, "Task 2", "in_progress"),
        ]

        query_mock = Mock()
        query_mock.filter.return_value.order_by.return_value.all.return_value = mock_tasks
        self.mock_db.query.return_value = query_mock

        tasks = self.service.get_pending_tasks(self.mock_db)

        assert len(tasks) == 2
        query_mock.filter.assert_called_once()
        query_mock.filter.return_value.order_by.assert_called_once()

    def test_get_overdue_tasks(self):
        """Test getting overdue tasks"""
        mock_tasks = [self._create_mock_task(1, "Overdue Task", "pending")]

        query_mock = Mock()
        query_mock.filter.return_value.order_by.return_value.all.return_value = mock_tasks
        self.mock_db.query.return_value = query_mock

        tasks = self.service.get_overdue_tasks(self.mock_db)

        assert len(tasks) == 1
        # Verify filter was called with overdue criteria
        query_mock.filter.assert_called_once()

    def test_complete_task(self):
        """Test completing a task"""
        mock_task = self._create_mock_task(1, "Test Task", "pending")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_task
        self.mock_db.add = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()

        completed_task = self.service.complete_task(
            self.mock_db, task_id=1, user_id="test_user", notes="Completed successfully"
        )

        assert mock_task.status == "completed"
        assert mock_task.completed_by == "test_user"
        assert mock_task.notes == "Completed successfully"
        assert mock_task.completed_at is not None
        self.mock_db.add.assert_called_once()  # Audit log added
        self.mock_db.commit.assert_called_once()

    def test_complete_task_not_found(self):
        """Test completing non-existent task"""
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="Task 999 not found"):
            self.service.complete_task(self.mock_db, task_id=999, user_id="test")

    def test_skip_task(self):
        """Test skipping a task"""
        mock_task = self._create_mock_task(1, "Test Task", "pending")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_task
        self.mock_db.add = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()

        skipped_task = self.service.skip_task(
            self.mock_db, task_id=1, user_id="test_user", reason="Not applicable today"
        )

        assert mock_task.status == "skipped"
        assert mock_task.notes == "Not applicable today"
        self.mock_db.add.assert_called_once()  # Audit log added
        self.mock_db.commit.assert_called_once()

    def test_get_compliance_metrics(self):
        """Test getting compliance metrics"""
        # Mock tasks
        mock_tasks = [
            self._create_mock_task(1, "Task 1", "completed", is_blocking=False),
            self._create_mock_task(2, "Task 2", "skipped", is_blocking=False),
            self._create_mock_task(3, "Task 3", "pending", is_blocking=True),
            self._create_mock_task(4, "Task 4", "completed", is_blocking=True),
        ]

        # Set overdue for task 3
        mock_tasks[2].due_date = datetime.now() - timedelta(days=1)

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_tasks

        # Mock blocking status check
        self.service.compliance_checker.check_blocking_tasks_complete = Mock()
        self.service.compliance_checker.check_blocking_tasks_complete.return_value.all_complete = (
            False
        )

        metrics = self.service.get_compliance_metrics(
            self.mock_db, date(2025, 7, 14), date(2025, 7, 20)
        )

        assert metrics.total_tasks == 4
        assert metrics.completed_tasks == 2
        assert metrics.skipped_tasks == 1
        assert metrics.overdue_tasks == 1
        assert metrics.compliance_rate == 75.0  # 3 out of 4 completed/skipped
        assert metrics.daily_compliance_rate == 100.0  # Both daily tasks done
        assert metrics.weekly_compliance_rate == 50.0  # 1 of 2 weekly done
        assert metrics.blocking_tasks_complete is False

    def _create_mock_task(self, task_id, name, status, is_blocking=False):
        """Helper to create a mock TaskInstance"""
        task = Mock(spec=TaskInstance)
        task.id = task_id
        task.name = name
        task.status = status
        task.is_blocking = is_blocking
        task.due_date = datetime.now()
        task.completed_at = datetime.now() if status == "completed" else None
        return task
