from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User

def _save_notification(db_factory, user_id: int, title: str, message: str, type: str, entity_type: str = None, entity_id: int = None):
    try:
        db = next(db_factory())
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            entity_type=entity_type,
            entity_id=entity_id
        )
        db.add(notification)
        db.commit()
    except Exception as e:
        print(f"Failed to save notification: {e}")
    finally:
        db.close() # Close to prevent connection leaks if next(db_factory()) doesn't auto-close

def create_notification(background_tasks: BackgroundTasks, db_factory, user_id: int, title: str, message: str, type: str, entity_type: str = None, entity_id: int = None):
    """Safely queues a single notification to be saved in the background."""
    if not user_id:
        return
    background_tasks.add_task(
        _save_notification,
        db_factory,
        user_id,
        title,
        message,
        type,
        entity_type,
        entity_id
    )

def notify_role(background_tasks: BackgroundTasks, db_factory, db: Session, role: str, title: str, message: str, type: str, entity_type: str = None, entity_id: int = None):
    """Notifies all users matching a specific role."""
    users = db.query(User.user_id).filter(User.role == role).all()
    for (uid,) in users:
        create_notification(background_tasks, db_factory, uid, title, message, type, entity_type, entity_id)

def notify_users(background_tasks: BackgroundTasks, db_factory, user_ids: list[int], title: str, message: str, type: str, entity_type: str = None, entity_id: int = None):
    """Notifies a specific list of user IDs in bulk."""
    for uid in set(user_ids):
        if uid:
            create_notification(background_tasks, db_factory, uid, title, message, type, entity_type, entity_id)
