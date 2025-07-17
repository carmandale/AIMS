"""Task management API routes"""

import logging
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.db.models import TaskTemplate, TaskInstance, TaskAuditLog
from src.services.tasks import TaskService
from src.api.schemas.tasks import (
    TaskTemplateCreate,
    TaskTemplateUpdate,
    TaskTemplateResponse,
    TaskInstanceResponse,
    TaskCompleteRequest,
    TaskSkipRequest,
    TaskStatusUpdateRequest,
    ComplianceMetricsResponse,
    BlockingTasksStatusResponse,
    CycleReadinessStatusResponse,
    WeeklyComplianceResponse,
    TaskAuditLogResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])

# Initialize task service
task_service = TaskService()


@router.get("/", response_model=List[TaskInstanceResponse])
async def get_pending_tasks(
    db: Session = Depends(get_db),
    include_completed: bool = Query(False, description="Include completed tasks"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
):
    """Get all pending tasks"""
    try:
        if include_completed:
            # Get all tasks in date range
            query = db.query(TaskInstance)

            if start_date:
                query = query.filter(
                    TaskInstance.due_date >= datetime.combine(start_date, datetime.min.time())
                )
            if end_date:
                query = query.filter(
                    TaskInstance.due_date <= datetime.combine(end_date, datetime.max.time())
                )

            tasks = query.order_by(TaskInstance.due_date, TaskInstance.priority).all()
        else:
            tasks = await task_service.get_pending_tasks(db)

        return tasks
    except Exception as e:
        logger.error(f"Failed to get pending tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue", response_model=List[TaskInstanceResponse])
async def get_overdue_tasks(db: Session = Depends(get_db)):
    """Get all overdue tasks"""
    try:
        tasks = await task_service.get_overdue_tasks(db)
        return tasks
    except Exception as e:
        logger.error(f"Failed to get overdue tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance", response_model=ComplianceMetricsResponse)
async def get_compliance_metrics(
    db: Session = Depends(get_db),
    start_date: date = Query(..., description="Start date for metrics"),
    end_date: date = Query(..., description="End date for metrics"),
):
    """Get compliance metrics for a date range"""
    try:
        metrics = await task_service.get_compliance_metrics(db, start_date, end_date)
        return metrics
    except Exception as e:
        logger.error(f"Failed to get compliance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/trends", response_model=List[WeeklyComplianceResponse])
async def get_compliance_trends(
    db: Session = Depends(get_db),
    weeks: int = Query(12, ge=1, le=52, description="Number of weeks to analyze"),
):
    """Get weekly compliance trends"""
    try:
        trends = await task_service.compliance_checker.get_compliance_trends(db, weeks)
        return trends
    except Exception as e:
        logger.error(f"Failed to get compliance trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/complete", response_model=TaskInstanceResponse)
async def complete_task(
    task_id: int = Path(..., description="Task instance ID"),
    request: Optional[TaskCompleteRequest] = None,
    db: Session = Depends(get_db),
):
    """Mark a task as complete"""
    try:
        # TODO: Get actual user ID from auth
        user_id = "system"
        task = await task_service.complete_task(
            db, task_id, user_id, request.notes if request else None
        )
        return task
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to complete task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/skip", response_model=TaskInstanceResponse)
async def skip_task(
    task_id: int = Path(..., description="Task instance ID"),
    request: Optional[TaskSkipRequest] = None,
    db: Session = Depends(get_db),
):
    """Skip a task with a reason"""
    try:
        # TODO: Get actual user ID from auth
        user_id = "system"
        task = await task_service.skip_task(
            db, task_id, user_id, request.reason if request else "No reason provided"
        )
        return task
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to skip task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}/status", response_model=TaskInstanceResponse)
async def update_task_status(
    task_id: int = Path(..., description="Task instance ID"),
    request: Optional[TaskStatusUpdateRequest] = None,
    db: Session = Depends(get_db),
):
    """Update task status"""
    try:
        # TODO: Get actual user ID from auth
        user_id = "system"
        task = await task_service.update_task_status(
            db, task_id, request.status if request else "pending", user_id
        )
        return task
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update task {task_id} status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Template management endpoints
@router.get("/templates", response_model=List[TaskTemplateResponse])
async def get_task_templates(
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Return only active templates"),
):
    """Get all task templates"""
    try:
        templates = await task_service.get_task_templates(db, active_only)
        return templates
    except Exception as e:
        logger.error(f"Failed to get task templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates", response_model=TaskTemplateResponse)
async def create_task_template(template: TaskTemplateCreate, db: Session = Depends(get_db)):
    """Create a new task template"""
    try:
        created_template = await task_service.create_task_template(
            db,
            name=template.name,
            rrule=template.rrule,
            description=template.description,
            is_blocking=template.is_blocking,
            category=template.category,
            priority=template.priority,
            estimated_duration=template.estimated_duration,
        )
        return created_template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create task template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/templates/{template_id}", response_model=TaskTemplateResponse)
async def update_task_template(
    template_id: int = Path(..., description="Template ID"),
    updates: Optional[TaskTemplateUpdate] = None,
    db: Session = Depends(get_db),
):
    """Update a task template"""
    try:
        # Filter out None values
        update_data = (
            {k: v for k, v in updates.dict().items() if v is not None} if updates else {}
        )

        updated_template = await task_service.update_task_template(
            db, template_id, **update_data
        )
        return updated_template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update task template {template_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/templates/{template_id}")
async def delete_task_template(
    template_id: int = Path(..., description="Template ID"), db: Session = Depends(get_db)
):
    """Delete a task template (soft delete)"""
    try:
        success = await task_service.delete_task_template(db, template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task template not found")
        return {"message": "Task template deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete task template {template_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Compliance checking endpoints
@router.get("/blocking-status", response_model=BlockingTasksStatusResponse)
async def get_blocking_status(
    db: Session = Depends(get_db),
    check_date: Optional[date] = Query(None, description="Date to check (defaults to today)"),
):
    """Check if blocking tasks are complete"""
    try:
        status = await task_service.check_blocking_tasks_complete(db, check_date)
        return status
    except Exception as e:
        logger.error(f"Failed to check blocking status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-readiness", response_model=CycleReadinessStatusResponse)
async def get_weekly_readiness(
    db: Session = Depends(get_db),
    check_date: Optional[date] = Query(None, description="Date to check (defaults to today)"),
):
    """Check if weekly cycle can close"""
    try:
        status = await task_service.compliance_checker.check_weekly_cycle_ready(db, check_date)
        return status
    except Exception as e:
        logger.error(f"Failed to check weekly readiness: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_task_instances(
    db: Session = Depends(get_db),
    start_date: date = Query(..., description="Start date for task generation"),
    end_date: date = Query(..., description="End date for task generation"),
):
    """Generate task instances from templates for a date range"""
    try:
        instances = await task_service.generate_task_instances(db, start_date, end_date)
        return {"message": f"Generated {len(instances)} task instances", "count": len(instances)}
    except Exception as e:
        logger.error(f"Failed to generate task instances: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}/audit", response_model=List[TaskAuditLogResponse])
async def get_task_audit_log(
    task_id: int = Path(..., description="Task instance ID"), db: Session = Depends(get_db)
):
    """Get audit log for a specific task"""
    try:
        audit_entries = (
            db.query(TaskAuditLog)
            .filter(TaskAuditLog.task_instance_id == task_id)
            .order_by(TaskAuditLog.timestamp.desc())
            .all()
        )

        return audit_entries
    except Exception as e:
        logger.error(f"Failed to get audit log for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
