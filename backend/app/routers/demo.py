from fastapi import APIRouter
from app.database import reset_paper_database

router = APIRouter(prefix="/api/demo", tags=["Demo"])

@router.post("/reset")
def reset_demo():
    """Resets the demo paper account back to $10,000 cash and clears all paper trade history."""
    reset_paper_database()
    return {
        "success": True,
        "message": "Paper account reset to $10,000 simulated cash. All paper trade records cleared."
    }
