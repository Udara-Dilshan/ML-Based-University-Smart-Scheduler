from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User

def _save_audit_log(db_factory, user_id: int, user_role: str, action: str, entity_type: str, entity_id: int, ip_address: str, details: str):
    try:
        db = next(db_factory())
        log = AuditLog(
            user_id=user_id,
            user_role=user_role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address,
            details=details
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to save audit log: {e}")

def log_action(background_tasks: BackgroundTasks, db_factory, user: User, action: str, entity_type: str = None, entity_id: int = None, ip_address: str = None, details: str = None):
    """
    Safely logs an action to the database using a background task.
    db_factory is expected to be `app.database.get_db` to get a fresh session in the background thread.
    """
    user_id = user.user_id if user else None
    user_role = user.role if user and user.role else None

    background_tasks.add_task(
        _save_audit_log,
        db_factory,
        user_id,
        user_role,
        action,
        entity_type,
        entity_id,
        ip_address,
        details
    )
