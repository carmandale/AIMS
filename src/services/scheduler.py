"""Scheduler service for automated tasks"""
import logging
from datetime import datetime, date, timedelta
import pytz

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.core.config import settings
from src.db.session import SessionLocal
from src.services.portfolio import PortfolioService
from src.services.tasks import TaskService

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing scheduled tasks"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.portfolio_service = PortfolioService()
        self.task_service = TaskService()
        self.timezone = pytz.timezone(settings.timezone)
    
    def start(self):
        """Start the scheduler with configured jobs"""
        try:
            # Schedule morning brief generation at 8 AM CT every weekday
            self.scheduler.add_job(
                self._generate_morning_brief,
                CronTrigger(
                    hour=8,
                    minute=0,
                    day_of_week="mon-fri",
                    timezone=self.timezone
                ),
                id="morning_brief",
                name="Generate Morning Brief",
                replace_existing=True
            )
            
            # Schedule cache cleanup daily at 3 AM
            self.scheduler.add_job(
                self._cleanup_cache,
                CronTrigger(
                    hour=3,
                    minute=0,
                    timezone=self.timezone
                ),
                id="cache_cleanup",
                name="Clean up expired cache",
                replace_existing=True
            )
            
            # Schedule portfolio data refresh every 15 minutes during market hours
            self.scheduler.add_job(
                self._refresh_portfolio_data,
                CronTrigger(
                    minute="*/15",
                    hour="8-16",
                    day_of_week="mon-fri",
                    timezone=self.timezone
                ),
                id="portfolio_refresh",
                name="Refresh portfolio data",
                replace_existing=True
            )
            
            # Schedule task generation daily at 6 AM
            self.scheduler.add_job(
                self._generate_daily_tasks,
                CronTrigger(
                    hour=6,
                    minute=0,
                    timezone=self.timezone
                ),
                id="task_generation",
                name="Generate daily task instances",
                replace_existing=True
            )
            
            # Schedule task cleanup weekly on Sundays at 2 AM
            self.scheduler.add_job(
                self._cleanup_old_tasks,
                CronTrigger(
                    day_of_week="sun",
                    hour=2,
                    minute=0,
                    timezone=self.timezone
                ),
                id="task_cleanup",
                name="Clean up old completed tasks",
                replace_existing=True
            )
            
            self.scheduler.start()
            logger.info("Scheduler started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
    
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler stopped")
    
    async def _generate_morning_brief(self):
        """Generate morning brief task"""
        logger.info("Generating morning brief...")
        
        db = SessionLocal()
        try:
            brief = await self.portfolio_service.generate_morning_brief(db)
            logger.info(
                f"Morning brief generated successfully. "
                f"Alerts: {len(brief.volatility_alerts)}, "
                f"Portfolio value: ${brief.portfolio_value:,.2f}"
            )
        except Exception as e:
            logger.error(f"Failed to generate morning brief: {e}")
        finally:
            db.close()
    
    async def _cleanup_cache(self):
        """Clean up expired cache entries"""
        logger.info("Cleaning up expired cache...")
        
        db = SessionLocal()
        try:
            from src.data.cache import cache_manager
            count = cache_manager.cleanup_expired(db)
            logger.info(f"Cleaned up {count} expired cache entries")
        except Exception as e:
            logger.error(f"Failed to cleanup cache: {e}")
        finally:
            db.close()
    
    async def _refresh_portfolio_data(self):
        """Refresh portfolio data during market hours"""
        logger.info("Refreshing portfolio data...")
        
        db = SessionLocal()
        try:
            # Invalidate cache
            from src.data.cache import cache_manager
            cache_manager.invalidate(db, "portfolio_")
            
            # Fetch fresh data
            summary = await self.portfolio_service.get_portfolio_summary(db)
            logger.info(f"Portfolio data refreshed. Value: ${summary['total_value']:,.2f}")
        except Exception as e:
            logger.error(f"Failed to refresh portfolio data: {e}")
        finally:
            db.close()
    
    async def _generate_daily_tasks(self):
        """Generate task instances for the upcoming week"""
        logger.info("Generating daily task instances...")
        
        db = SessionLocal()
        try:
            # Generate tasks for the next 7 days
            start_date = date.today()
            end_date = start_date + timedelta(days=7)
            
            instances = await self.task_service.generate_task_instances(
                db, start_date, end_date
            )
            
            logger.info(f"Generated {len(instances)} task instances for the next week")
        except Exception as e:
            logger.error(f"Failed to generate task instances: {e}")
        finally:
            db.close()
    
    async def _cleanup_old_tasks(self):
        """Clean up old completed tasks"""
        logger.info("Cleaning up old completed tasks...")
        
        db = SessionLocal()
        try:
            from src.db.models import TaskInstance
            
            # Delete completed tasks older than 90 days
            cutoff_date = datetime.now() - timedelta(days=90)
            
            old_tasks = db.query(TaskInstance).filter(
                TaskInstance.status.in_(["completed", "skipped"]),
                TaskInstance.completed_at < cutoff_date
            ).all()
            
            count = len(old_tasks)
            for task in old_tasks:
                db.delete(task)
            
            db.commit()
            logger.info(f"Cleaned up {count} old completed tasks")
        except Exception as e:
            logger.error(f"Failed to cleanup old tasks: {e}")
            db.rollback()
        finally:
            db.close()
    
    def get_jobs(self):
        """Get list of scheduled jobs"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        return jobs


# Global scheduler instance
scheduler_service = SchedulerService()