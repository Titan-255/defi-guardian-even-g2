from fastapi import APIRouter, Depends
from app.database import reset_paper_database
from app.security import verify_mutating_request

router = APIRouter(prefix="/api/demo", tags=["Demo"])

@router.post("/reset", dependencies=[Depends(verify_mutating_request)])
def reset_demo():
    """Resets the demo paper account back to $10,000 cash and clears all paper trade history."""
    reset_paper_database()
    return {
        "success": True,
        "message": "Paper account reset to $10,000 simulated cash. All paper trade records cleared."
    }
