"""Integration tests for task management API endpoints"""

import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient

from src.api.main import app
from src.db.models import TaskTemplate, TaskInstance
from src.db.session import get_db


class TestTaskAPI:
    """Integration tests for task API endpoints"""

    @pytest.fixture(autouse=True)
    def setup_method(self, test_db_session):
        """Set up test database"""
        self.db = test_db_session

        # Create test data
        self._create_test_data()

    def _create_test_data(self):
        """Create test templates and instances"""
        # Create templates
        template1 = TaskTemplate(
            id=1,
            name="Daily Task",
            rrule="RRULE:FREQ=DAILY",
            is_blocking=False,
            category="daily",
            priority=1,
        )
        template2 = TaskTemplate(
            id=2,
            name="Weekly Blocking Task",
            rrule="RRULE:FREQ=WEEKLY;BYDAY=FR",
            is_blocking=True,
            category="weekly",
            priority=1,
        )

        # Create task instances
        task1 = TaskInstance(
            id=1,
            template_id=1,
            name="Daily Task",
            due_date=datetime.now().replace(hour=10, minute=0),
            status="pending",
            is_blocking=False,
            priority=1,
        )
        task2 = TaskInstance(
            id=2,
            template_id=2,
            name="Weekly Blocking Task",
            due_date=datetime.now().replace(hour=14, minute=0),
            status="pending",
            is_blocking=True,
            priority=1,
        )

        self.db.add_all([template1, template2, task1, task2])
        self.db.commit()

    def test_get_pending_tasks(self, client: TestClient):
        """Test getting pending tasks"""
        response = client.get("/api/tasks/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["status"] == "pending"
        assert data[1]["status"] == "pending"

    def test_get_pending_tasks_with_filters(self, client: TestClient):
        """Test getting tasks with date filters"""
        today = date.today().isoformat()
        response = client.get(f"/api/tasks/?start_date={today}&end_date={today}")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_get_overdue_tasks(self, client: TestClient):
        """Test getting overdue tasks"""
        # Create an overdue task
        overdue_task = TaskInstance(
            id=3,
            template_id=1,
            name="Overdue Task",
            due_date=datetime.now().replace(hour=8) - timedelta(days=1),
            status="pending",
            is_blocking=False,
            priority=1,
        )
        self.db.add(overdue_task)
        self.db.commit()

        response = client.get("/api/tasks/overdue")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(task["name"] == "Overdue Task" for task in data)

    def test_complete_task(self, client: TestClient):
        """Test completing a task"""
        response = client.post(
            "/api/tasks/1/complete", json={"notes": "Task completed successfully"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["notes"] == "Task completed successfully"

        # Verify in database
        task = self.db.query(TaskInstance).filter(TaskInstance.id == 1).first()
        assert task.status == "completed"
        assert task.completed_at is not None

    def test_complete_nonexistent_task(self, client: TestClient):
        """Test completing a task that doesn't exist"""
        response = client.post("/api/tasks/999/complete", json={})

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_skip_task(self, client: TestClient):
        """Test skipping a task"""
        response = client.post("/api/tasks/1/skip", json={"reason": "Not applicable today"})

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "skipped"
        assert data["notes"] == "Not applicable today"

    def test_update_task_status(self, client: TestClient):
        """Test updating task status"""
        response = client.put("/api/tasks/1/status", json={"status": "in_progress"})

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"

    def test_update_task_invalid_status(self, client: TestClient):
        """Test updating task with invalid status"""
        response = client.put("/api/tasks/1/status", json={"status": "invalid_status"})

        assert response.status_code == 422  # Validation error

    def test_get_compliance_metrics(self, client: TestClient):
        """Test getting compliance metrics"""
        start_date = date.today().isoformat()
        end_date = date.today().isoformat()

        response = client.get(f"/api/tasks/compliance?start_date={start_date}&end_date={end_date}")

        assert response.status_code == 200
        data = response.json()
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "compliance_rate" in data
        assert "blocking_tasks_complete" in data

    def test_get_blocking_status(self, client: TestClient):
        """Test getting blocking tasks status"""
        response = client.get("/api/tasks/blocking-status")

        assert response.status_code == 200
        data = response.json()
        assert "all_complete" in data
        assert "incomplete_tasks" in data
        assert "total_blocking" in data
        assert data["total_blocking"] >= 1  # We have at least one blocking task

    def test_get_weekly_readiness(self, client: TestClient):
        """Test checking weekly readiness"""
        response = client.get("/api/tasks/weekly-readiness")

        assert response.status_code == 200
        data = response.json()
        assert "is_ready" in data
        assert "blocking_tasks" in data
        assert "message" in data

    def test_create_task_template(self, client: TestClient):
        """Test creating a new task template"""
        template_data = {
            "name": "New Test Task",
            "rrule": "RRULE:FREQ=DAILY;BYHOUR=10",
            "description": "Test description",
            "is_blocking": False,
            "category": "daily",
            "priority": 2,
            "estimated_duration": 30,
        }

        response = client.post("/api/tasks/templates", json=template_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Test Task"
        assert data["is_active"] is True

    def test_create_template_invalid_rrule(self, client: TestClient):
        """Test creating template with invalid RRULE"""
        template_data = {"name": "Invalid Task", "rrule": "INVALID_RRULE"}

        response = client.post("/api/tasks/templates", json=template_data)

        assert response.status_code == 400
        assert "Invalid RRULE" in response.json()["detail"]

    def test_get_task_templates(self, client: TestClient):
        """Test getting task templates"""
        response = client.get("/api/tasks/templates")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(template["is_active"] for template in data)

    def test_update_task_template(self, client: TestClient):
        """Test updating a task template"""
        update_data = {"name": "Updated Task Name", "priority": 3}

        response = client.put("/api/tasks/templates/1", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Task Name"
        assert data["priority"] == 3

    def test_delete_task_template(self, client: TestClient):
        """Test deleting (soft delete) a task template"""
        response = client.delete("/api/tasks/templates/1")

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify it's soft deleted
        template = self.db.query(TaskTemplate).filter(TaskTemplate.id == 1).first()
        assert template.is_active is False

    def test_generate_task_instances(self, client: TestClient):
        """Test generating task instances"""
        start_date = date.today().isoformat()
        end_date = (date.today() + timedelta(days=7)).isoformat()

        response = client.post(f"/api/tasks/generate?start_date={start_date}&end_date={end_date}")

        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert data["count"] >= 0

    def test_get_task_audit_log(self, client: TestClient):
        """Test getting audit log for a task"""
        # First complete a task to create audit entry
        client.post("/api/tasks/1/complete", json={"notes": "Done"})

        response = client.get("/api/tasks/1/audit")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["action"] == "completed"
