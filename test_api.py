import requests
import sys
import json

def test_api():
    base_url = "http://localhost:8000"
    
    print("=== Testing Root Endpoint ===")
    r = requests.get(f"{base_url}/")
    print(r.status_code, r.json())
    
    username = "test_user_2026"
    password = "secret_password"
    
    print("\n=== Testing Registration ===")
    payload = {"username": username, "password": password, "role": "admin"}
    r = requests.post(f"{base_url}/api/auth/signup", json=payload)
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except:
        print("Raw:", r.text)
        
    print("\n=== Testing Login ===")
    r = requests.post(f"{base_url}/api/auth/login", json=payload)
    print("Status:", r.status_code)
    try:
        res = r.json()
        print("Response:", res)
        token = res["access_token"]
    except Exception as e:
        print("Failed to login:", e)
        sys.exit(1)
        
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== Testing Proposal Generation ===")
    req_payload = {
        "description": "Develop a React application utilizing FastAPI and a pgvector database for RAG context.",
        "deliverables": "Frontend UI components, Backend REST endpoints, Database vector models",
        "budget_range": "$10,000 - $35,000",
        "timeline_preferences": "12 weeks"
      }
    
    r = requests.post(f"{base_url}/api/generate-proposal", json=req_payload, headers=headers)
    print("Status:", r.status_code)
    try:
        proposal = r.json()
        print("Generated Proposal Title:", proposal.get("title"))
        print("Keys returned:", list(proposal.keys()))
        print("\nSOW Excerpt:", proposal.get("sow")[:200] if proposal.get("sow") else "None")
        print("\nPricing Items count:", len(proposal.get("pricing", [])))
        print("\nTimeline Phases count:", len(proposal.get("timeline", [])))
        print("\nRisks count:", len(proposal.get("risks", [])))
    except Exception as e:
        print("Failed to decode response:", e)
        print("Raw:", r.text)
        sys.exit(1)

    print("\n=== Testing Proposal List Retrieval ===")
    r = requests.get(f"{base_url}/api/proposals", headers=headers)
    print("Status:", r.status_code)
    try:
        proposals_list = r.json()
        print("Proposals in DB:", len(proposals_list))
    except:
        print("Failed to fetch list:", r.text)
        
    print("\n=== Testing API Usage telemetry (Admin Only) ===")
    r = requests.get(f"{base_url}/api/monitoring/usage", headers=headers)
    print("Status:", r.status_code)
    try:
        usage = r.json()
        print("Total log entries count:", usage.get("total_requests"))
        print("Usage Logs list:", usage.get("logs"))
    except:
        print("Failed to fetch usage:", r.text)
        
    print("\nAPI Testing Completed successfully!")

if __name__ == "__main__":
    test_api()
