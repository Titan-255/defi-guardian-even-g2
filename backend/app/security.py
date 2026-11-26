import secrets
from fastapi import Header, HTTPException, Request
from typing import Optional
from app.config import settings

def verify_mutating_request(
    request: Request,
    x_session_token: Optional[str] = Header(default=None, alias="X-Session-Token")
):
    """
    Protects mutating endpoints against CSRF and untrusted cross-origin requests.
    1. If an Origin header is present, it must match an explicitly allowed CORS origin.
    2. Requires a valid per-session X-Session-Token issued by /api/health.
    """
    origin = request.headers.get("origin")
    if origin and origin not in settings.CORS_ORIGINS:
        raise HTTPException(
            status_code=403,
            detail=f"Untrusted origin '{origin}' is not permitted to perform mutating operations."
        )

    if not x_session_token or not secrets.compare_digest(x_session_token, settings.SESSION_TOKEN):
        raise HTTPException(
            status_code=403,
            detail="Missing or invalid X-Session-Token for mutating operation."
        )
