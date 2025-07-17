"""Unit tests for ComplianceChecker (async version)"""

import pytest
from datetime import date, datetime, timedelta
from unittest.mock import Mock, AsyncMock
from sqlalchemy.orm import Session

from src.services.tasks.compliance_checker import ComplianceChecker
from src.db.models import TaskInstance


class TestComplianceCheckerAsync:
    """Test cases for ComplianceChecker with async support"""

    def setup_method(self):
        """Set up test fixtures"""
        self.checker = ComplianceChecker()
        self.mock_db = Mock(spec=Session)

    @pytest.mark.asyncio
    async def test_check_weekly_cycle_ready_all_complete(self):
        """Test weekly cycle ready when all blocking tasks complete"""
        # Mock blocking tasks - all completed
        mock_tasks = [
            self._create_mock_task(1, "Task 1", True, "completed"),
            self._create_mock_task(2, "Task 2", True, "completed"),
        ]

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_tasks

        result = await self.checker.check_weekly_cycle_ready(self.mock_db)

        assert result.is_ready is True
        assert len(result.blocking_tasks) == 0
        assert "can be closed" in result.message

    @pytest.mark.asyncio
    async def test_check_weekly_cycle_ready_incomplete_tasks(self):
        """Test weekly cycle not ready when blocking tasks incomplete"""
        # Mock blocking tasks - some incomplete
        mock_tasks = [
            self._create_mock_task(1, "Task 1", True, "completed"),
            self._create_mock_task(2, "Task 2", True, "pending"),
            self._create_mock_task(3, "Task 3", True, "in_progress"),
        ]

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_tasks

        result = await self.checker.check_weekly_cycle_ready(self.mock_db)

        assert result.is_ready is False
        assert len(result.blocking_tasks) == 2
        assert result.blocking_tasks[0]["name"] == "Task 2"
        assert result.blocking_tasks[1]["name"] == "Task 3"
        assert "Cannot close weekly cycle" in result.message

    @pytest.mark.asyncio
    async def test_get_blocking_tasks_for_week(self):
        """Test getting blocking tasks for a specific week"""
        check_date = date(2025, 7, 16)  # Wednesday
        mock_tasks = [
            self._create_mock_task(1, "Task 1", True, "pending"),
            self._create_mock_task(2, "Task 2", True, "completed"),
        ]

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_tasks

        tasks = await self.checker.get_blocking_tasks(self.mock_db, check_date)

        assert len(tasks) == 2
        # Verify the query was called with correct date range (Monday to Sunday)
        self.mock_db.query.assert_called_once()

    @pytest.mark.asyncio
    async def test_check_blocking_tasks_complete_all_done(self):
        """Test checking if all blocking tasks are complete"""
        mock_tasks = [
            self._create_mock_task(1, "Task 1", True, "completed"),
            self._create_mock_task(2, "Task 2", True, "skipped"),
        ]

        # Mock the get_blocking_tasks method as async
        self.checker.get_blocking_tasks = AsyncMock(return_value=mock_tasks)

        result = await self.checker.check_blocking_tasks_complete(self.mock_db)

        assert result.all_complete is True
        assert len(result.incomplete_tasks) == 0
        assert result.total_blocking == 2
        assert result.completed_blocking == 2

    @pytest.mark.asyncio
    async def test_check_blocking_tasks_complete_some_incomplete(self):
        """Test checking blocking tasks with some incomplete"""
        mock_tasks = [
            self._create_mock_task(1, "Task 1", True, "completed"),
            self._create_mock_task(2, "Task 2", True, "pending"),
            self._create_mock_task(3, "Task 3", True, "in_progress"),
        ]

        self.checker.get_blocking_tasks = AsyncMock(return_value=mock_tasks)

        result = await self.checker.check_blocking_tasks_complete(self.mock_db)

        assert result.all_complete is False
        assert len(result.incomplete_tasks) == 2
        assert result.total_blocking == 3
        assert result.completed_blocking == 1

    @pytest.mark.asyncio
    async def test_calculate_compliance_rate_all_complete(self):
        """Test compliance rate calculation with all tasks complete"""
        mock_tasks = [
            self._create_mock_task(1, "Task 1", False, "completed"),
            self._create_mock_task(2, "Task 2", False, "completed"),
            self._create_mock_task(3, "Task 3", False, "skipped"),
        ]

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_tasks

        rate = await self.checker.calculate_compliance_rate(
            self.mock_db, date(2025, 7, 14), date(2025, 7, 20)
        )

        assert rate == 100.0

    @pytest.mark.asyncio
    async def test_calculate_compliance_rate_partial(self):
        """Test compliance rate calculation with partial completion"""
        mock_tasks = [
            self._create_mock_task(1, "Task 1", False, "completed"),
            self._create_mock_task(2, "Task 2", False, "pending"),
            self._create_mock_task(3, "Task 3", False, "skipped"),
            self._create_mock_task(4, "Task 4", False, "in_progress"),
        ]

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_tasks

        rate = await self.checker.calculate_compliance_rate(
            self.mock_db, date(2025, 7, 14), date(2025, 7, 20)
        )

        assert rate == 50.0  # 2 out of 4 tasks completed/skipped

    @pytest.mark.asyncio
    async def test_calculate_compliance_rate_no_tasks(self):
        """Test compliance rate when no tasks exist"""
        self.mock_db.query.return_value.filter.return_value.all.return_value = []

        rate = await self.checker.calculate_compliance_rate(
            self.mock_db, date(2025, 7, 14), date(2025, 7, 20)
        )

        assert rate == 100.0  # No tasks means 100% compliance

    @pytest.mark.asyncio
    async def test_get_compliance_trends(self):
        """Test getting compliance trends for multiple weeks"""
        # Mock tasks for different weeks
        week1_tasks = [
            self._create_mock_task(1, "Task 1", False, "completed"),
            self._create_mock_task(2, "Task 2", False, "completed"),
        ]
        week2_tasks = [
            self._create_mock_task(3, "Task 3", False, "completed"),
            self._create_mock_task(4, "Task 4", False, "pending"),
        ]

        # Set up mock to return different tasks for different date ranges
        self.mock_db.query.return_value.filter.return_value.all.side_effect = [
            week1_tasks,
            week2_tasks,
        ]

        # Mock check_blocking_tasks_complete as async
        mock_blocking_status = Mock()
        mock_blocking_status.all_complete = True
        self.checker.check_blocking_tasks_complete = AsyncMock(return_value=mock_blocking_status)

        trends = await self.checker.get_compliance_trends(self.mock_db, weeks=2)

        assert len(trends) == 2
        assert trends[0].compliance_rate == 100.0  # First week
        assert trends[1].compliance_rate == 50.0  # Second week
        assert trends[0].blocking_complete is True
        assert trends[1].blocking_complete is True

    def _create_mock_task(self, task_id, name, is_blocking, status):
        """Helper to create a mock TaskInstance"""
        task = Mock(spec=TaskInstance)
        task.id = task_id
        task.name = name
        task.is_blocking = is_blocking
        task.status = status
        task.due_date = datetime.now()
        task.priority = 1
        return task
