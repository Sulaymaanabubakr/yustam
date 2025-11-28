from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..config import settings
# Import User from schemas to avoid circular dependency with services
from .schemas.user import User

# We import get_user_by_jwt inside the function or use a deferred import if needed,
# but now that User is moved, the circular dependency on the type hint is resolved.
# However, to be safe and cleaner, we keep this import here as services depends on schemas now.
from ..services.auth import get_user_by_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Dependency that extracts and validates the custom backend JWT."""
    user = await get_user_by_jwt(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_vendor(user: User = Depends(get_current_user)) -> User:
    """Dependency for vendor-only endpoints."""
    if user.role != "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be a vendor to perform this action",
        )
    return user

async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency for admin-only endpoints."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be an admin to perform this action",
        )
    return user