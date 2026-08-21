from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.resource_engine import ResourceEngine

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.get("")
def get_resource_demands(db: Session = Depends(get_db)):
    return ResourceEngine.aggregate_resource_demands(db)
