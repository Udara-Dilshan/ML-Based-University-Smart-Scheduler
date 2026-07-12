from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.connection import get_db
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.utils.dependencies import get_current_user, require_admin_user

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])



@router.get("")
def get_audit_logs(
    action: Optional[str] = None,
    user_role: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    query = db.query(AuditLog, User.email).outerjoin(User, AuditLog.user_id == User.user_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if user_role:
        query = query.filter(AuditLog.user_role == user_role)
        
    query = query.order_by(desc(AuditLog.timestamp)).limit(limit)
    results = query.all()
    
    response = []
    for log, email in results:
        response.append({
            "log_id": log.log_id,
            "user_id": log.user_id,
            "user_email": email or "System/Guest",
            "action": log.action,
            "ip_address": log.ip_address,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "user_role": log.user_role,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        })
        
    return response
