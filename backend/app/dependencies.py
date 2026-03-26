# ══════════════════════════════════════════════════════════════════════
# app/dependencies.py  — CREATE THIS NEW FILE
# Reusable auth dependency for all FastAPI routes
# ══════════════════════════════════════════════════════════════════════
import os
from fastapi import Header, HTTPException, Depends
from supabase import create_client


def get_supabase_admin():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


async def require_auth(authorization: str = Header(None)):
    """
    Verifies the Supabase JWT sent by the frontend.
    Returns the verified user object.

    Usage on any route:
        @router.post("/my-route")
        async def my_route(body: MyModel, user=Depends(require_auth)):
            user.id   ← verified user ID, safe to use
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        sb = get_supabase_admin()
        result = sb.auth.get_user(token)
        if not result or not result.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return result.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")


async def optional_auth(authorization: str = Header(None)):
    """
    Like require_auth but doesn't block unauthenticated requests.
    Returns the user if logged in, or None if not.
    Use for routes that work for both guests and logged-in users.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await require_auth(authorization)
    except HTTPException:
        return None