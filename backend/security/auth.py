import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from passlib.context import CryptContext
import jwt
from dotenv import load_dotenv
from backend.database import get_db_connection, get_db_cursor

load_dotenv()

# JWT Config
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-proposal-generator-2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# API Key Config
API_KEY = os.getenv("API_KEY", "proposal-generator-api-key-2026")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the provided password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of the password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT token signed with the secret key."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decode a JWT and return its payload if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to validate JWT from Bearer header and return current user details.
    """
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject information",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    conn = get_db_connection()
    try:
        with get_db_cursor(conn) as cursor:
            cursor.execute("SELECT id, username, role FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return user
    finally:
        conn.close()

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency to enforce admin-only role-based access control (RBAC).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin role required.",
        )
    return current_user

async def validate_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Dependency to validate system API key for third-party client authentication.
    """
    if not api_key or api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return api_key