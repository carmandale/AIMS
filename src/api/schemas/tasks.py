"""Pydantic schemas for task management"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator


class TaskTemplateBase(BaseModel):
    """Base schema for task templates"""
    name: str = Field(..., max_length=255, description="Task name")
    description: Optional[str] = Field(None, description="Task description")
    rrule: str = Field(..., max_length=500, description="RRULE format for scheduling")
    is_blocking: bool = Field(False, description="Whether task blocks weekly cycle")
    category: str = Field("general", max_length=50, description="Task category")
    priority: int = Field(1, ge=1, le=3, description="Priority: 1=high, 2=medium, 3=low")
    estimated_duration: Optional[int] = Field(None, ge=1, description="Estimated duration in minutes")


class TaskTemplateCreate(TaskTemplateBase):
    """Schema for creating task templates"""
    pass


class TaskTemplateUpdate(BaseModel):
    """Schema for updating task templates"""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    rrule: Optional[str] = Field(None, max_length=500)
    is_blocking: Optional[bool] = None
    category: Optional[str] = Field(None, max_length=50)
    priority: Optional[int] = Field(None, ge=1, le=3)
    estimated_duration: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class TaskTemplateResponse(TaskTemplateBase):
    """Schema for task template responses"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskInstanceBase(BaseModel):
    """Base schema for task instances"""
    name: str
    description: Optional[str]
    due_date: datetime
    is_blocking: bool
    priority: int


class TaskInstanceResponse(TaskInstanceBase):
    """Schema for task instance responses"""
    id: int
    template_id: int
    status: str
    completed_at: Optional[datetime]
    completed_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    overdue: bool = False
    color_code: str = "green"
    
    @validator("overdue", always=True)
    def calculate_overdue(cls, v, values):
        """Calculate if task is overdue"""
        if "status" in values and values["status"] in ["completed", "skipped"]:
            return False
        if "due_date" in values:
            return values["due_date"] < datetime.now()
        return False
    
    @validator("color_code", always=True)
    def calculate_color(cls, v, values):
        """Calculate color code based on status and due date"""
        if "status" in values:
            if values["status"] in ["completed"]:
                return "green"
            elif values["status"] == "skipped":
                return "gray"
        
        if "due_date" in values and "status" in values:
            if values["status"] in ["pending", "in_progress"]:
                now = datetime.now()
                if values["due_date"] < now:
                    return "red"  # Overdue
                elif values["due_date"] < now.replace(hour=23, minute=59, second=59):
                    return "yellow"  # Due today
        
        return "green"
    
    class Config:
        from_attributes = True


class TaskCompleteRequest(BaseModel):
    """Request to complete a task"""
    notes: Optional[str] = Field(None, max_length=1000, description="Completion notes")


class TaskSkipRequest(BaseModel):
    """Request to skip a task"""
    reason: str = Field(..., max_length=1000, description="Reason for skipping")


class TaskStatusUpdateRequest(BaseModel):
    """Request to update task status"""
    status: str = Field(..., pattern="^(pending|in_progress|completed|skipped)$")


class ComplianceMetricsResponse(BaseModel):
    """Response schema for compliance metrics"""
    period_start: date
    period_end: date
    total_tasks: int
    completed_tasks: int
    skipped_tasks: int
    overdue_tasks: int
    compliance_rate: float
    daily_compliance_rate: float
    weekly_compliance_rate: float
    blocking_tasks_complete: bool
    
    class Config:
        from_attributes = True


class BlockingTasksStatusResponse(BaseModel):
    """Response schema for blocking tasks status"""
    all_complete: bool
    incomplete_tasks: List[Dict[str, Any]]
    total_blocking: int
    completed_blocking: int
    
    class Config:
        from_attributes = True


class CycleReadinessStatusResponse(BaseModel):
    """Response schema for weekly cycle readiness"""
    is_ready: bool
    blocking_tasks: List[Dict[str, Any]]
    message: str
    
    class Config:
        from_attributes = True


class WeeklyComplianceResponse(BaseModel):
    """Response schema for weekly compliance trends"""
    week_start: date
    week_end: date
    total_tasks: int
    completed_tasks: int
    skipped_tasks: int
    compliance_rate: float
    blocking_complete: bool
    
    class Config:
        from_attributes = True


class TaskAuditLogResponse(BaseModel):
    """Response schema for task audit log entries"""
    id: int
    task_instance_id: int
    action: str
    old_status: Optional[str]
    new_status: Optional[str]
    user_id: Optional[str]
    notes: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True