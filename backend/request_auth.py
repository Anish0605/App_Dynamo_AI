"""Request-scoped Firebase authentication helpers.

The browser may send a Supabase user UUID for backwards compatibility, but
authorization must be based on a verified Firebase ID token instead.
"""

from contextvars import ContextVar

from fastapi import HTTPException


_firebase_uid = ContextVar("firebase_uid", default=None)
_auth_invalid = ContextVar("auth_invalid", default=False)


def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and return its decoded claims."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests
        import config

        if not config.FIREBASE_PROJECT_ID:
            raise RuntimeError("FIREBASE_PROJECT_ID is not configured")

        decoded = id_token.verify_firebase_token(
            token,
            grequests.Request(),
            audience=config.FIREBASE_PROJECT_ID,
        )
        if not decoded.get("user_id") and not decoded.get("sub"):
            raise RuntimeError("Firebase token has no subject")
        return decoded
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Valid Firebase authentication is required.") from exc


def begin_request(token: str | None):
    """Set request auth context and return reset tokens for middleware."""
    uid = None
    invalid = False
    if token:
        try:
            claims = verify_firebase_token(token)
            uid = claims.get("user_id") or claims.get("sub")
        except HTTPException:
            invalid = True
    return (
        _firebase_uid.set(uid),
        _auth_invalid.set(invalid),
    )


def end_request(tokens):
    _firebase_uid.reset(tokens[0])
    _auth_invalid.reset(tokens[1])


def require_authenticated_user(requested_user_id: str | None, lookup_user):
    """Resolve the authenticated Supabase row and reject identity mismatches."""
    if _auth_invalid.get() or not _firebase_uid.get():
        raise HTTPException(status_code=401, detail="Valid Firebase authentication is required.")

    user = lookup_user(_firebase_uid.get())
    if not user:
        raise HTTPException(status_code=403, detail="Authenticated user is not registered.")

    if requested_user_id and requested_user_id != user.get("id"):
        raise HTTPException(status_code=403, detail="Authenticated user does not match the requested account.")

    return user
