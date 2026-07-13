from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationOut])
def get_user_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch notifications for the current user, ordered by newest first."""
    notifications = db.query(Notification).filter(Notification.user_id == current_user.user_id).order_by(Notification.created_at.desc()).limit(50).all()
    return notifications

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark a specific notification as read and applying shared inbox behavior."""
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.user_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.type and notification.entity_type and notification.entity_id:
        db.query(Notification).filter(
            Notification.type == notification.type,
            Notification.entity_type == notification.entity_type,
            Notification.entity_id == notification.entity_id,
            Notification.is_read == False
        ).update({"is_read": True})
    else:
        notification.is_read = True

    db.commit()
    return {"status": "success"}

@router.put("/read-all")
def mark_all_as_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark all notifications as read for the current user."""
    db.query(Notification).filter(Notification.user_id == current_user.user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}
