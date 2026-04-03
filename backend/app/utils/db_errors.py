from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError


def commit_delete_or_raise(db, detail: str) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)