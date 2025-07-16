"""Compliance checking and blocking logic for task management"""
import logging
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel

from src.db.models import TaskInstance, TaskAuditLog

logger = logging.getLogger(__name__)


class CycleReadinessStatus(BaseModel):
    """Status of weekly cycle readiness"""
    is_ready: bool
    blocking_tasks: List[Dict[str, Any]]
    message: str


class BlockingTasksStatus(BaseModel):
    """Status of blocking tasks"""
    all_complete: bool
    incomplete_tasks: List[Dict[str, Any]]
    total_blocking: int
    completed_blocking: int


class WeeklyCompliance(BaseModel):
    """Weekly compliance metrics"""
    week_start: date
    week_end: date
    total_tasks: int
    completed_tasks: int
    skipped_tasks: int
    compliance_rate: float
    blocking_complete: bool


class ComplianceChecker:
    """Handles compliance checking and blocking logic"""
    
    async def check_weekly_cycle_ready(
        self, 
        db: Session, 
        check_date: Optional[date] = None
    ) -> CycleReadinessStatus:
        """Check if weekly cycle is ready to close
        
        Args:
            db: Database session
            check_date: Date to check (defaults to today)
            
        Returns:
            CycleReadinessStatus with readiness status and blocking tasks
        """
        if check_date is None:
            check_date = date.today()
        
        # Get the week's date range (Monday to Sunday)
        week_start = check_date - timedelta(days=check_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Get all blocking tasks for the week
        blocking_tasks = db.query(TaskInstance).filter(
            and_(
                TaskInstance.is_blocking == True,
                TaskInstance.due_date >= datetime.combine(week_start, datetime.min.time()),
                TaskInstance.due_date <= datetime.combine(week_end, datetime.max.time())
            )
        ).all()
        
        # Check which are incomplete
        incomplete_tasks = []
        for task in blocking_tasks:
            if task.status not in ["completed", "skipped"]:
                incomplete_tasks.append({
                    "id": task.id,
                    "name": task.name,
                    "due_date": task.due_date.isoformat(),
                    "status": task.status,
                    "priority": task.priority
                })
        
        is_ready = len(incomplete_tasks) == 0
        
        if is_ready:
            message = "All blocking tasks completed. Weekly cycle can be closed."
        else:
            message = f"Cannot close weekly cycle: {len(incomplete_tasks)} blocking tasks incomplete"
        
        return CycleReadinessStatus(
            is_ready=is_ready,
            blocking_tasks=incomplete_tasks,
            message=message
        )
    
    async def get_blocking_tasks(
        self, 
        db: Session, 
        check_date: Optional[date] = None
    ) -> List[TaskInstance]:
        """Get all blocking tasks for a given date's week
        
        Args:
            db: Database session
            check_date: Date to check (defaults to today)
            
        Returns:
            List of blocking TaskInstance objects
        """
        if check_date is None:
            check_date = date.today()
        
        # Get the week's date range
        week_start = check_date - timedelta(days=check_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        return db.query(TaskInstance).filter(
            and_(
                TaskInstance.is_blocking == True,
                TaskInstance.due_date >= datetime.combine(week_start, datetime.min.time()),
                TaskInstance.due_date <= datetime.combine(week_end, datetime.max.time())
            )
        ).all()
    
    async def check_blocking_tasks_complete(
        self, 
        db: Session, 
        check_date: Optional[date] = None
    ) -> BlockingTasksStatus:
        """Check if all blocking tasks are complete for a date
        
        Args:
            db: Database session
            check_date: Date to check (defaults to today)
            
        Returns:
            BlockingTasksStatus with completion status
        """
        blocking_tasks = await self.get_blocking_tasks(db, check_date)
        
        incomplete_tasks = []
        completed_count = 0
        
        for task in blocking_tasks:
            if task.status in ["completed", "skipped"]:
                completed_count += 1
            else:
                incomplete_tasks.append({
                    "id": task.id,
                    "name": task.name,
                    "due_date": task.due_date.isoformat(),
                    "status": task.status,
                    "priority": task.priority
                })
        
        return BlockingTasksStatus(
            all_complete=len(incomplete_tasks) == 0,
            incomplete_tasks=incomplete_tasks,
            total_blocking=len(blocking_tasks),
            completed_blocking=completed_count
        )
    
    async def calculate_compliance_rate(
        self, 
        db: Session, 
        start_date: date, 
        end_date: date
    ) -> float:
        """Calculate compliance rate for a date range
        
        Args:
            db: Database session
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            Compliance rate as a percentage (0-100)
        """
        # Get all tasks in the date range
        tasks = db.query(TaskInstance).filter(
            and_(
                TaskInstance.due_date >= datetime.combine(start_date, datetime.min.time()),
                TaskInstance.due_date <= datetime.combine(end_date, datetime.max.time())
            )
        ).all()
        
        if not tasks:
            return 100.0  # No tasks means 100% compliance
        
        completed_count = sum(1 for task in tasks if task.status in ["completed", "skipped"])
        compliance_rate = (completed_count / len(tasks)) * 100
        
        return round(compliance_rate, 2)
    
    async def get_compliance_trends(
        self, 
        db: Session, 
        weeks: int = 12
    ) -> List[WeeklyCompliance]:
        """Get compliance trends for the past N weeks
        
        Args:
            db: Database session
            weeks: Number of weeks to analyze
            
        Returns:
            List of weekly compliance metrics
        """
        trends = []
        today = date.today()
        
        for i in range(weeks):
            # Calculate week boundaries
            week_end = today - timedelta(days=i * 7)
            week_start = week_end - timedelta(days=6)
            
            # Get tasks for the week
            tasks = db.query(TaskInstance).filter(
                and_(
                    TaskInstance.due_date >= datetime.combine(week_start, datetime.min.time()),
                    TaskInstance.due_date <= datetime.combine(week_end, datetime.max.time())
                )
            ).all()
            
            # Calculate metrics
            total_tasks = len(tasks)
            completed_tasks = sum(1 for task in tasks if task.status == "completed")
            skipped_tasks = sum(1 for task in tasks if task.status == "skipped")
            compliance_rate = 0.0
            
            if total_tasks > 0:
                compliance_rate = ((completed_tasks + skipped_tasks) / total_tasks) * 100
            
            # Check if blocking tasks were complete
            blocking_status = await self.check_blocking_tasks_complete(db, week_end)
            
            trends.append(WeeklyCompliance(
                week_start=week_start,
                week_end=week_end,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                skipped_tasks=skipped_tasks,
                compliance_rate=round(compliance_rate, 2),
                blocking_complete=blocking_status.all_complete
            ))
        
        return trends