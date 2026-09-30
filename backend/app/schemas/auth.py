from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime
    # Populated only by /register. Signing the user in as part of registration
    # saves a second bcrypt verification plus a round trip, which is the bulk
    # of the wait on the register form.
    access_token: str | None = None
    refresh_token: str | None = None

    class Config:
        from_attributes = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    # Populated by /login. The client used to call /me immediately afterwards
    # just to learn the role that decides which console to render — a second
    # round trip for data the server already had in hand. Optional so refresh
    # responses and existing clients are unaffected.
    user: UserOut | None = None


class TokenPayload(BaseModel):
    sub: str          # user id as string
    role: str
    exp: int
    type: str          # "access" | "refresh"
