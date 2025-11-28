from fastapi import APIRouter, Depends, HTTPException, status
from supabase_auth.errors import AuthApiError

from ...database import supabase
from ...config import settings
from ...services.auth import create_jwt_token, sync_user
from ...schemas.user import UserCreate, UserLogin, UserProfile, Token, SupabaseAuthSession
from ...dependencies import User, get_current_user

router = APIRouter(tags=["auth"])

@router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_new_user(user_data: UserCreate):
    try:
        # Supabase Auth Register
        res = supabase.auth.sign_up(
            email=user_data.email, 
            password=user_data.password
        )
        
        # Sync user to our database and issue JWT
        # The Supabase client's sign_up returns a user object
        db_user: User = await sync_user(res.user.model_dump())
        jwt_token = create_jwt_token(db_user)
        
        return Token(
            access_token=jwt_token, 
            token_type="bearer", 
            user=UserProfile(id=db_user.id, email=db_user.email, role=db_user.role, plan=db_user.plan)
        )
    except AuthApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        # Catch all other exceptions for now
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")

@router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    try:
        # Supabase Auth Login
        res = supabase.auth.sign_in_with_password(
            email=user_data.email, 
            password=user_data.password
        )
        
        # Sync user to our database and issue JWT
        db_user: User = await sync_user(res.user.model_dump())
        jwt_token = create_jwt_token(db_user)
        
        return Token(
            access_token=jwt_token, 
            token_type="bearer", 
            user=UserProfile(id=db_user.id, email=db_user.email, role=db_user.role, plan=db_user.plan)
        )
    except AuthApiError:
        # Supabase returns 400 for invalid credentials. Map to 401.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")

@router.post("/auth/session", response_model=Token)
async def create_session(supabase_session: SupabaseAuthSession):
    """Exchanges a Supabase session token (from social login, refresh, etc.) for a custom backend JWT."""
    try:
        # Use Supabase's existing session to get the user object
        user_info = supabase.auth.get_user(supabase_session.access_token)

        # Sync user to our database and issue JWT
        db_user: User = await sync_user(user_info.model_dump())
        jwt_token = create_jwt_token(db_user)
        
        return Token(
            access_token=jwt_token, 
            token_type="bearer", 
            user=UserProfile(id=db_user.id, email=db_user.email, role=db_user.role, plan=db_user.plan)
        )
    except AuthApiError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase session token")

@router.get("/auth/me", response_model=UserProfile)
async def get_me(user: User = Depends(get_current_user)):
    """Gets the current authenticated user's profile."""
    return UserProfile(id=user.id, email=user.email, role=user.role, plan=user.plan)

@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(user: User = Depends(get_current_user)):
    # Note: For JWT, logout is mostly handled client-side by deleting the token.
    # We can add an optional server-side token revocation/blacklist if needed.
    return