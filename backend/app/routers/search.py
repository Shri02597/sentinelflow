from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security.deps import get_current_user

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
def search(q: str = Query(..., min_length=1, max_length=500), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    A normal application feature (search). The logging middleware captures
    `q` transiently and feeds it to the suspicious-input detector — the
    value itself is never persisted in RequestLog.
    This is a placeholder search over a trivial in-memory catalog for demo purposes.
    """
    catalog = ["firewall rules", "incident response plan", "password policy", "vpn setup guide"]
    matches = [item for item in catalog if q.lower() in item.lower()]
    return {"query": q, "results": matches}
