"""Core service for task management operations"""

import logging
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from src.db.models import TaskTemplate, TaskInstance, TaskAuditLog
from .rrule_parser import RRuleParser
from .compliance_checker import ComplianceChecker, BlockingTasksStatus, CycleReadinessStatus

logger = logging.getLogger(__name__)


class ComplianceMetrics:
    """Compliance metrics for a date range"""

    def __init__(
        self,
        period_start: date,
        period_end: date,
        total_tasks: int,
        completed_tasks: int,
        skipped_tasks: int,
        overdue_tasks: int,
        compliance_rate: float,
        daily_compliance_rate: float,
        weekly_compliance_rate: float,
        blocking_tasks_complete: bool,
    ):
        self.period_start = period_start
        self.period_end = period_end
        self.total_tasks = total_tasks
        self.completed_tasks = completed_tasks
        self.skipped_tasks = skipped_tasks
        self.overdue_tasks = overdue_tasks
        self.compliance_rate = compliance_rate
        self.daily_compliance_rate = daily_compliance_rate
        self.weekly_compliance_rate = weekly_compliance_rate
        self.blocking_tasks_complete = blocking_tasks_complete


class TaskService:
    """Core service for task management operations"""

    def __init__(self):
        self.rrule_parser = RRuleParser()
        self.compliance_checker = ComplianceChecker()

    async def create_task_template(
        self,
        db: Session,
        name: str,
        rrule: str,
        description: Optional[str] = None,
        is_blocking: bool = False,
        category: str = "general",
        priority: int = 1,
        estimated_duration: Optional[int] = None,
    ) -> TaskTemplate:
        """Create a new task template

        Args:
            db: Database session
            name: Task name
            rrule: RRULE string for scheduling
            description: Optional task description
            is_blocking: Whether task blocks weekly cycle
            category: Task category (daily, weekly, monthly)
            priority: Task priority (1=high, 2=medium, 3=low)
            estimated_duration: Estimated duration in minutes

        Returns:
            Created TaskTemplate
        """
        # Validate RRULE
        validation = self.rrule_parser.validate_rrule(rrule)
        if not validation.is_valid:
            raise ValueError(f"Invalid RRULE: {validation.error_message}")

        # Create template
        template = TaskTemplate(
            name=name,
            description=description,
            rrule=rrule,
            is_blocking=is_blocking,
            category=category,
            priority=priority,
            estimated_duration=estimated_duration,
            is_active=True,
        )

        db.add(template)
        db.commit()
        db.refresh(template)

        logger.info(f"Created task template: {template.name} (ID: {template.id})")
        return template

    async def update_task_template(self, db: Session, template_id: int, **kwargs) -> TaskTemplate:
        """Update an existing task template

        Args:
            db: Database session
            template_id: Template ID to update
            **kwargs: Fields to update

        Returns:
            Updated TaskTemplate
        """
        template = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
        if not template:
            raise ValueError(f"Task template {template_id} not found")

        # Validate RRULE if being updated
        if "rrule" in kwargs:
            validation = self.rrule_parser.validate_rrule(kwargs["rrule"])
            if not validation.is_valid:
                raise ValueError(f"Invalid RRULE: {validation.error_message}")

        # Update fields
        for key, value in kwargs.items():
            if hasattr(template, key):
                setattr(template, key, value)

        db.commit()
        db.refresh(template)

        logger.info(f"Updated task template: {template.name} (ID: {template.id})")
        return template

    async def delete_task_template(self, db: Session, template_id: int) -> bool:
        """Delete a task template

        Args:
            db: Database session
            template_id: Template ID to delete

        Returns:
            True if deleted successfully
        """
        template = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
        if not template:
            return False

        # Soft delete by marking as inactive
        template.is_active = False  # type: ignore[assignment]
        db.commit()

        logger.info(f"Deleted task template: {template.name} (ID: {template.id})")
        return True

    async def get_task_templates(self, db: Session, active_only: bool = True) -> List[TaskTemplate]:
        """Get all task templates

        Args:
            db: Database session
            active_only: Whether to return only active templates

        Returns:
            List of TaskTemplate objects
        """
        query = db.query(TaskTemplate)
        if active_only:
            query = query.filter(TaskTemplate.is_active == True)

        return query.all()

    async def generate_task_instances(
        self, db: Session, start_date: date, end_date: date
    ) -> List[TaskInstance]:
        """Generate task instances from templates for a date range

        Args:
            db: Database session
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of created TaskInstance objects
        """
        # Get active templates
        templates = await self.get_task_templates(db, active_only=True)
        created_instances = []

        for template in templates:
            # Generate occurrences for this template
            occurrences = self.rrule_parser.generate_occurrences(
                template.rrule, start_date, end_date
            )

            for occurrence in occurrences:
                # Check if instance already exists
                existing = (
                    db.query(TaskInstance)
                    .filter(
                        and_(
                            TaskInstance.template_id == template.id,
                            TaskInstance.due_date == occurrence,
                        )
                    )
                    .first()
                )

                if not existing:
                    # Create new instance
                    instance = TaskInstance(
                        template_id=template.id,
                        name=template.name,
                        description=template.description,
                        due_date=occurrence,
                        is_blocking=template.is_blocking,
                        priority=template.priority,
                        status="pending",
                    )
                    db.add(instance)
                    created_instances.append(instance)

        db.commit()

        logger.info(
            f"Generated {len(created_instances)} task instances for {start_date} to {end_date}"
        )
        return created_instances

    async def get_pending_tasks(
        self, db: Session, user_id: Optional[str] = None
    ) -> List[TaskInstance]:
        """Get all pending tasks

        Args:
            db: Database session
            user_id: Optional user ID filter

        Returns:
            List of pending TaskInstance objects
        """
        query = (
            db.query(TaskInstance)
            .filter(TaskInstance.status.in_(["pending", "in_progress"]))
            .order_by(TaskInstance.due_date, TaskInstance.priority)
        )

        return query.all()

    async def get_overdue_tasks(
        self, db: Session, user_id: Optional[str] = None
    ) -> List[TaskInstance]:
        """Get all overdue tasks

        Args:
            db: Database session
            user_id: Optional user ID filter

        Returns:
            List of overdue TaskInstance objects
        """
        now = datetime.now()

        query = (
            db.query(TaskInstance)
            .filter(
                and_(
                    TaskInstance.status.in_(["pending", "in_progress"]), TaskInstance.due_date < now
                )
            )
            .order_by(TaskInstance.due_date, TaskInstance.priority)
        )

        return query.all()

    async def complete_task(
        self, db: Session, task_id: int, user_id: str, notes: Optional[str] = None
    ) -> TaskInstance:
        """Mark a task as complete

        Args:
            db: Database session
            task_id: Task instance ID
            user_id: User completing the task
            notes: Optional completion notes

        Returns:
            Updated TaskInstance
        """
        task = db.query(TaskInstance).filter(TaskInstance.id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")

        old_status = task.status
        task.status = "completed"  # type: ignore[assignment]
        task.completed_at = datetime.now()  # type: ignore[assignment]
        task.completed_by = user_id  # type: ignore[assignment]
        if notes:
            task.notes = notes  # type: ignore[assignment]

        # Create audit log entry
        audit = TaskAuditLog(
            task_instance_id=task_id,
            action="completed",
            old_status=old_status,
            new_status="completed",
            user_id=user_id,
            notes=notes,
        )
        db.add(audit)

        db.commit()
        db.refresh(task)

        logger.info(f"Task completed: {task.name} (ID: {task_id}) by {user_id}")
        return task

    async def skip_task(self, db: Session, task_id: int, user_id: str, reason: str) -> TaskInstance:
        """Skip a task

        Args:
            db: Database session
            task_id: Task instance ID
            user_id: User skipping the task
            reason: Reason for skipping

        Returns:
            Updated TaskInstance
        """
        task = db.query(TaskInstance).filter(TaskInstance.id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")

        old_status = task.status
        task.status = "skipped"  # type: ignore[assignment]
        task.notes = reason  # type: ignore[assignment]

        # Create audit log entry
        audit = TaskAuditLog(
            task_instance_id=task_id,
            action="skipped",
            old_status=old_status,
            new_status="skipped",
            user_id=user_id,
            notes=reason,
        )
        db.add(audit)

        db.commit()
        db.refresh(task)

        logger.info(f"Task skipped: {task.name} (ID: {task_id}) by {user_id}")
        return task

    async def update_task_status(
        self, db: Session, task_id: int, status: str, user_id: str
    ) -> TaskInstance:
        """Update task status

        Args:
            db: Database session
            task_id: Task instance ID
            status: New status
            user_id: User updating the task

        Returns:
            Updated TaskInstance
        """
        task = db.query(TaskInstance).filter(TaskInstance.id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")

        old_status = task.status
        task.status = status  # type: ignore[assignment]

        # Create audit log entry
        audit = TaskAuditLog(
            task_instance_id=task_id,
            action="modified",
            old_status=old_status,
            new_status=status,
            user_id=user_id,
        )
        db.add(audit)

        db.commit()
        db.refresh(task)

        logger.info(
            f"Task status updated: {task.name} (ID: {task_id}) from {old_status} to {status}"
        )
        return task

    async def get_compliance_metrics(
        self, db: Session, start_date: date, end_date: date
    ) -> ComplianceMetrics:
        """Get compliance metrics for a date range

        Args:
            db: Database session
            start_date: Start of date range
            end_date: End of date range

        Returns:
            ComplianceMetrics object
        """
        # Get all tasks in range
        tasks = (
            db.query(TaskInstance)
            .filter(
                and_(
                    TaskInstance.due_date >= datetime.combine(start_date, datetime.min.time()),
                    TaskInstance.due_date <= datetime.combine(end_date, datetime.max.time()),
                )
            )
            .all()
        )

        # Calculate metrics
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == "completed")
        skipped_tasks = sum(1 for t in tasks if t.status == "skipped")
        overdue_tasks = sum(
            1
            for t in tasks
            if t.status in ["pending", "in_progress"] and t.due_date < datetime.now()
        )

        compliance_rate = 0.0
        if total_tasks > 0:
            compliance_rate = ((completed_tasks + skipped_tasks) / total_tasks) * 100

        # Calculate daily vs weekly compliance
        daily_tasks = [t for t in tasks if t.is_blocking == False]
        weekly_tasks = [t for t in tasks if t.is_blocking == True]

        daily_compliance_rate = 0.0
        if daily_tasks:
            daily_completed = sum(1 for t in daily_tasks if t.status in ["completed", "skipped"])
            daily_compliance_rate = (daily_completed / len(daily_tasks)) * 100

        weekly_compliance_rate = 0.0
        if weekly_tasks:
            weekly_completed = sum(1 for t in weekly_tasks if t.status in ["completed", "skipped"])
            weekly_compliance_rate = (weekly_completed / len(weekly_tasks)) * 100

        # Check blocking tasks
        blocking_status = await self.compliance_checker.check_blocking_tasks_complete(db, end_date)

        return ComplianceMetrics(
            period_start=start_date,
            period_end=end_date,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            skipped_tasks=skipped_tasks,
            overdue_tasks=overdue_tasks,
            compliance_rate=round(compliance_rate, 2),
            daily_compliance_rate=round(daily_compliance_rate, 2),
            weekly_compliance_rate=round(weekly_compliance_rate, 2),
            blocking_tasks_complete=blocking_status.all_complete,
        )

    async def check_blocking_tasks_complete(
        self, db: Session, check_date: Optional[date] = None
    ) -> BlockingTasksStatus:
        """Check if blocking tasks are complete

        Args:
            db: Database session
            check_date: Date to check (defaults to today)

        Returns:
            BlockingTasksStatus
        """
        return await self.compliance_checker.check_blocking_tasks_complete(db, check_date)
