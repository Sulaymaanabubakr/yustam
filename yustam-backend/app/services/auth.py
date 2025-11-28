from datetime import timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from ..database import supabase
from ..config import settings
from ..utils.security import create_access_token, decode_access_token
from ..schemas.user import UserProfile, User # For internal type hinting (will be replaced by ORM model)

auth_client = supabase.auth

# Mock function for a full implementation (Supabase does the main sync)
async def get_user_by_id(user_id: str) -> Optional[User]:
    """Fetches user data from Postgres (or Supabase 'users' table)"""
    # NOTE: In a full implementation, this would fetch from a database table
    
    # Mock return for unverified token flow
    # This simulates fetching the user from the backend's synced database
    return User(id=user_id, email="synced@example.com", role="buyer", plan="free")

async def sync_user(supabase_user_data: Dict[str, Any]) -> User:
    """Syncs Supabase Auth user into the application's user database table."""
    # NOTE: In a full implementation, this would insert/update the user in Postgres
    # For now, we'll return a minimal User object from the Supabase data
    
    user_id = supabase_user_data["id"]
    email = supabase_user_data["email"]
    # Assuming role is managed in a public.users table with RLS
    
    # Mock: Always return a buyer for initial setup
    return User(id=user_id, email=email, role="buyer", plan="free")

def create_jwt_token(user: User) -> str:
    """Creates a custom JWT token for the FastAPI backend."""
    access_token_expires = timedelta(days=settings.JWT_EXPIRATION_DAYS)
    return create_access_token(
        data={"user_id": user.id, "role": user.role, "plan": user.plan},
        expires_delta=access_token_expires
    )

async def get_user_by_jwt(token: str) -> Optional[User]:
    """Validates the custom JWT and fetches the corresponding user."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token payload invalid")
        
        user = await get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        return user
    except AuthApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception:
        # JWTError is caught by security.py and re-raised, caught here
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )