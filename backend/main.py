import os
import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv

from backend.database import get_db_connection, get_db_cursor
from backend.security.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_admin_user,
    security,
    api_key_header,
    API_KEY
)
from backend.rag.engine import (
    generate_proposal_pipeline,
    retrieve_similar_proposals,
    llm
)

load_dotenv()

app = FastAPI(
    title="AI Business Proposal Generator API",
    description="FastAPI Backend for RAG-driven business proposal generation and evaluation",
    version="1.0.0"
)

# Enable CORS for frontend integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global API Requests counter for usage monitoring
API_REQUEST_LOGS = []

def log_api_call(endpoint: str, user: str):
    """Log API request for usage monitoring in Admin Dashboard."""
    API_REQUEST_LOGS.append({
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "endpoint": endpoint,
        "user": user
    })

# Unified authentication dependency: accepts either JWT Bearer token OR X-API-Key
async def get_authenticated_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Depends(api_key_header)
) -> dict:
    # 1. API Key Auth
    if x_api_key and x_api_key == API_KEY:
        return {"id": 0, "username": "api_key_client", "role": "admin"}
    
    # 2. JWT Bearer Auth
    if credentials:
        return await get_current_user(credentials)
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Valid JWT Bearer token or X-API-Key is required"
    )

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Business Proposal Generator API",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================

@app.post("/api/auth/signup")
async def signup(payload: dict):
    username = payload.get("username")
    password = payload.get("password")
    role = payload.get("role", "user") # Default to user, but allow custom role setting
    
    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Username and password are required"
        )
        
    conn = get_db_connection()
    try:
        with get_db_cursor(conn) as cursor:
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Username is already registered"
                )
            
            # Hash password and insert
            password_hash = get_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s) RETURNING id, username, role",
                (username, password_hash, role)
            )
            new_user = cursor.fetchone()
            conn.commit()
            return {"message": "User registered successfully", "user": new_user}
    finally:
        conn.close()

@app.post("/api/auth/login")
async def login(payload: dict):
    username = payload.get("username")
    password = payload.get("password")
    
    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Username and password are required"
        )
        
    conn = get_db_connection()
    try:
        with get_db_cursor(conn) as cursor:
            cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            if not user or not verify_password(password, user["password_hash"]):
                raise HTTPException(
                    status_code=401,
                    detail="Incorrect username or password"
                )
            
            # Generate JWT token
            access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "username": user["username"],
                    "role": user["role"]
                }
            }
    finally:
        conn.close()

# ==========================================
# PROPOSAL GENERATION ENDPOINTS
# ==========================================

@app.post("/api/generate-proposal")
async def generate_proposal(requirements: dict, user: dict = Depends(get_authenticated_user)):
    log_api_call("/api/generate-proposal", user["username"])
    try:
        proposal = generate_proposal_pipeline(requirements)
        return proposal
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/generate-sow")
async def generate_sow(requirements: dict, user: dict = Depends(get_authenticated_user)):
    log_api_call("/api/generate-sow", user["username"])
    prompt = f"""Based on the requirements: {requirements.get('description', '')}
    Create a comprehensive Statement of Work (SOW). Include:
    - Scope of work
    - Deliverables
    - Acceptance criteria
    - Key assumptions and constraints"""
    try:
        res = llm.invoke(prompt)
        return {"sow": res.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/estimate-pricing")
async def estimate_pricing(requirements: dict, user: dict = Depends(get_authenticated_user)):
    log_api_call("/api/estimate-pricing", user["username"])
    prompt = f"""Estimate details pricing for project: {requirements.get('description', '')}
    Provide estimated cost for UI development, Backend setup, Devops, and project QA.
    You MUST respond with a JSON array of objects with keys "category", "details", and "cost". Do not include formatting."""
    try:
        res = llm.invoke(prompt)
        clean = res.content.strip().replace("```json", "").replace("```", "")
        import json
        return {"pricing": json.loads(clean)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/plan-timeline")
async def plan_timeline(requirements: dict, user: dict = Depends(get_authenticated_user)):
    log_api_call("/api/plan-timeline", user["username"])
    prompt = f"""Provide project schedule timeline for: {requirements.get('description', '')}
    You MUST respond with a JSON array of objects with keys "phase", "start_week", "end_week", "deliverables", "status"."""
    try:
        res = llm.invoke(prompt)
        clean = res.content.strip().replace("```json", "").replace("```", "")
        import json
        return {"timeline": json.loads(clean)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-risks")
async def analyze_risks(requirements: dict, user: dict = Depends(get_authenticated_user)):
    log_api_call("/api/analyze-risks", user["username"])
    prompt = f"""Identify risks for: {requirements.get('description', '')}
    Provide JSON array of objects with keys "risk", "severity" (Low/Medium/High), and "mitigation"."""
    try:
        res = llm.invoke(prompt)
        clean = res.content.strip().replace("```json", "").replace("```", "")
        import json
        return {"risks": json.loads(clean)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect-scope")
async def detect_scope(requirements: dict, user: dict = Depends(get_authenticated_user)):
    log_api_call("/api/detect-scope", user["username"])
    prompt = f"""Determine scope boundaries for: {requirements.get('description', '')}
    Clearly state:
    - IN SCOPE
    - OUT OF SCOPE
    - Key assumptions"""
    try:
        res = llm.invoke(prompt)
        return {"scope": res.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ADMINISTRATIVE CRUD & MONITORING
# ==========================================

@app.get("/api/proposals", response_model=List[dict])
async def list_proposals(user: dict = Depends(get_authenticated_user)):
    """Fetch all saved proposals from PostgreSQL database."""
    conn = get_db_connection()
    try:
        with get_db_cursor(conn) as cursor:
            cursor.execute(
                "SELECT id, title, content, pricing, timeline, risks, created_at FROM proposals ORDER BY created_at DESC"
            )
            proposals = cursor.fetchall()
            return proposals
    finally:
        conn.close()

@app.delete("/api/proposals/{proposal_id}")
async def delete_proposal(proposal_id: int, user: dict = Depends(get_authenticated_user)):
    """Delete a proposal by its ID."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM proposals WHERE id = %s RETURNING id", (proposal_id,))
            deleted = cursor.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Proposal not found")
            conn.commit()
            return {"message": "Proposal deleted successfully", "id": proposal_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/users", response_model=List[dict])
async def list_users(user: dict = Depends(get_admin_user)):
    """List all registered users (Admin only)."""
    conn = get_db_connection()
    try:
        with get_db_cursor(conn) as cursor:
            cursor.execute("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC")
            users = cursor.fetchall()
            return users
    finally:
        conn.close()

@app.put("/api/users/{user_id}/role")
async def update_user_role(user_id: int, payload: dict, user: dict = Depends(get_admin_user)):
    """Update a user's role (Admin only)."""
    new_role = payload.get("role")
    if new_role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'admin'.")
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET role = %s WHERE id = %s RETURNING id, username, role",
                (new_role, user_id)
            )
            updated = cursor.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="User not found")
            conn.commit()
            return {"message": "User role updated successfully", "user": {"id": updated[0], "username": updated[1], "role": updated[2]}}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/monitoring/usage")
async def get_api_usage(user: dict = Depends(get_admin_user)):
    """Retrieve API usage and statistics (Admin only)."""
    # Create some dynamic/mock statistics for visualization
    now = datetime.datetime.utcnow()
    total_calls = len(API_REQUEST_LOGS)
    
    # Calculate mock hourly distributions or list of requests
    return {
        "total_requests": total_calls,
        "active_users_count": len(set(log["user"] for log in API_REQUEST_LOGS)) if total_calls > 0 else 0,
        "average_latency_ms": 320, # mock latency
        "logs": API_REQUEST_LOGS[-50:], # return last 50 entries
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))