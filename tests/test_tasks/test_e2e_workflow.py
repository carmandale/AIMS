"""End-to-end tests for weekly task management workflow"""

import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient

from src.api.main import app
from src.db.models import TaskTemplate, TaskInstance
from src.db.session import get_db
from src.services.tasks import TaskService


class TestE2EWorkflow:
    """End-to-end tests for complete weekly workflow"""

    def setup_method(self):
        """Set up test service"""
        self.task_service = TaskService()

    def test_complete_weekly_workflow(self, client: TestClient):
        """Test the complete weekly task workflow from setup to closure"""

        # Step 1: Create task templates
        daily_template_data = {
            "name": "Daily Morning Review",
            "rrule": "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8",
            "description": "Review morning signals",
            "is_blocking": False,
            "category": "daily",
            "priority": 1,
        }

        weekly_blocking_template_data = {
            "name": "Weekly Portfolio Review",
            "rrule": "RRULE:FREQ=WEEKLY;BYDAY=FR;BYHOUR=14",
            "description": "Review portfolio performance",
            "is_blocking": True,
            "category": "weekly",
            "priority": 1,
        }

        # Create templates via API
        daily_resp = client.post("/api/tasks/templates", json=daily_template_data)
        assert daily_resp.status_code == 200

        weekly_resp = client.post("/api/tasks/templates", json=weekly_blocking_template_data)
        assert weekly_resp.status_code == 200

        # Step 2: Generate task instances for the week
        today = date.today()
        week_start = today - timedelta(days=today.weekday())  # Monday
        week_end = week_start + timedelta(days=6)  # Sunday

        generate_resp = client.post(
            f"/api/tasks/generate?start_date={week_start.isoformat()}&end_date={week_end.isoformat()}"
        )
        assert generate_resp.status_code == 200
        assert generate_resp.json()["count"] > 0

        # Step 3: Check weekly readiness (should not be ready due to blocking tasks)
        readiness_resp = client.get("/api/tasks/weekly-readiness")
        assert readiness_resp.status_code == 200
        readiness_data = readiness_resp.json()
        assert readiness_data["is_ready"] is False
        assert len(readiness_data["blocking_tasks"]) > 0

        # Step 4: Get pending tasks
        tasks_resp = client.get("/api/tasks/")
        assert tasks_resp.status_code == 200
        tasks = tasks_resp.json()
        assert len(tasks) > 0

        # Step 5: Complete daily tasks
        daily_tasks = [t for t in tasks if not t["is_blocking"]]
        for task in daily_tasks:
            complete_resp = client.post(
                f"/api/tasks/{task['id']}/complete", json={"notes": "Completed during test"}
            )
            assert complete_resp.status_code == 200

        # Step 6: Check compliance metrics
        compliance_resp = client.get(
            f"/api/tasks/compliance?start_date={week_start.isoformat()}&end_date={week_end.isoformat()}"
        )
        assert compliance_resp.status_code == 200
        compliance_data = compliance_resp.json()
        assert compliance_data["daily_compliance_rate"] > 0

        # Step 7: Attempt to check weekly readiness (still not ready - blocking tasks incomplete)
        readiness_resp = client.get("/api/tasks/weekly-readiness")
        assert readiness_resp.status_code == 200
        assert readiness_resp.json()["is_ready"] is False

        # Step 8: Complete blocking tasks
        blocking_tasks = [t for t in tasks if t["is_blocking"]]
        for task in blocking_tasks:
            complete_resp = client.post(
                f"/api/tasks/{task['id']}/complete", json={"notes": "Weekly review completed"}
            )
            assert complete_resp.status_code == 200

        # Step 9: Verify weekly readiness (should now be ready)
        readiness_resp = client.get("/api/tasks/weekly-readiness")
        assert readiness_resp.status_code == 200
        final_readiness = readiness_resp.json()
        assert final_readiness["is_ready"] is True
        assert len(final_readiness["blocking_tasks"]) == 0

        # Step 10: Verify final compliance
        final_compliance_resp = client.get(
            f"/api/tasks/compliance?start_date={week_start.isoformat()}&end_date={week_end.isoformat()}"
        )
        assert final_compliance_resp.status_code == 200
        final_compliance = final_compliance_resp.json()
        assert final_compliance["blocking_tasks_complete"] is True
        assert final_compliance["weekly_compliance_rate"] == 100.0

    def test_blocking_task_prevents_cycle_closure(self, client: TestClient):
        """Test that incomplete blocking tasks prevent weekly cycle closure"""

        # Create a blocking task template
        template_data = {
            "name": "Critical Weekly Task",
            "rrule": "RRULE:FREQ=WEEKLY;BYDAY=FR",
            "is_blocking": True,
            "category": "weekly",
            "priority": 1,
        }

        template_resp = client.post("/api/tasks/templates", json=template_data)
        assert template_resp.status_code == 200

        # Generate instances
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        generate_resp = client.post(
            f"/api/tasks/generate?start_date={week_start.isoformat()}&end_date={week_end.isoformat()}"
        )
        assert generate_resp.status_code == 200

        # Check blocking status
        blocking_resp = client.get("/api/tasks/blocking-status")
        assert blocking_resp.status_code == 200
        blocking_data = blocking_resp.json()
        assert blocking_data["all_complete"] is False
        assert blocking_data["total_blocking"] > 0

        # Verify weekly readiness is false
        readiness_resp = client.get("/api/tasks/weekly-readiness")
        assert readiness_resp.status_code == 200
        assert readiness_resp.json()["is_ready"] is False

    def test_task_skip_functionality(self, client: TestClient):
        """Test that tasks can be skipped with reasons"""

        # Create and generate a task
        template_data = {
            "name": "Optional Daily Task",
            "rrule": "RRULE:FREQ=DAILY",
            "is_blocking": False,
            "category": "daily",
            "priority": 3,
        }

        template_resp = client.post("/api/tasks/templates", json=template_data)
        assert template_resp.status_code == 200

        # Generate instance
        today = date.today()
        generate_resp = client.post(
            f"/api/tasks/generate?start_date={today.isoformat()}&end_date={today.isoformat()}"
        )
        assert generate_resp.status_code == 200

        # Get the task
        tasks_resp = client.get("/api/tasks/")
        tasks = tasks_resp.json()
        task = next(t for t in tasks if t["name"] == "Optional Daily Task")

        # Skip the task
        skip_resp = client.post(
            f"/api/tasks/{task['id']}/skip",
            json={"reason": "Not applicable due to market conditions"},
        )
        assert skip_resp.status_code == 200
        skipped_task = skip_resp.json()
        assert skipped_task["status"] == "skipped"
        assert skipped_task["notes"] == "Not applicable due to market conditions"

        # Verify it counts toward compliance
        compliance_resp = client.get(
            f"/api/tasks/compliance?start_date={today.isoformat()}&end_date={today.isoformat()}"
        )
        compliance_data = compliance_resp.json()
        assert compliance_data["skipped_tasks"] > 0
        assert compliance_data["compliance_rate"] == 100.0  # Skipped tasks count as compliant

    def test_overdue_task_handling(self, client: TestClient):
        """Test that overdue tasks are properly identified and handled"""

        # Create a task template for yesterday
        template_data = {
            "name": "Overdue Task",
            "rrule": "RRULE:FREQ=DAILY",
            "is_blocking": True,
            "category": "daily",
            "priority": 1,
        }

        template_resp = client.post("/api/tasks/templates", json=template_data)
        assert template_resp.status_code == 200

        # Generate task for yesterday (making it overdue)
        yesterday = date.today() - timedelta(days=1)
        generate_resp = client.post(
            f"/api/tasks/generate?start_date={yesterday.isoformat()}&end_date={yesterday.isoformat()}"
        )
        assert generate_resp.status_code == 200

        # Get overdue tasks
        overdue_resp = client.get("/api/tasks/overdue")
        assert overdue_resp.status_code == 200
        overdue_tasks = overdue_resp.json()
        assert len(overdue_tasks) > 0
        assert any(t["name"] == "Overdue Task" for t in overdue_tasks)

        # Check that overdue blocking tasks prevent cycle closure
        readiness_resp = client.get("/api/tasks/weekly-readiness")
        assert readiness_resp.status_code == 200
        assert readiness_resp.json()["is_ready"] is False
