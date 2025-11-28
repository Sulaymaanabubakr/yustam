from pydantic import BaseModel, Field
from typing import Optional

class UserBase(BaseModel):
    email: str = Field(..., example="jane@example.com")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(UserBase):
    password: str

class UserProfile(UserBase):
    id: str = Field(..., example="a5b7c9d1-e2f4-g6h8-i0j2-k4l6m8n0p2r4")
    role: str = Field(..., example="buyer")
    plan: str = Field(..., example="free")
    # Add other fields like first_name, last_name, etc.

    model_config = {"from_attributes": True}

class SupabaseAuthSession(BaseModel):
    access_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    refresh_token: Optional[str] = None
    expires_in: int = Field(..., example=3600)
    # The 'user' field is present in the response from Supabase but will not be used to create the Token here
    # The user object is fetched/synced from our DB in the backend on 'session' creation.

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class User:
    def __init__(self, id: str, email: str, role: str, plan: str):
        self.id = id
        self.email = email
        self.role = role
        self.plan = plan