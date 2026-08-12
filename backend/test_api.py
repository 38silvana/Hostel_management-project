import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("=" * 60)
    print(" Testing FastAPI Endpoints (/ and /health) ")
    print("=" * 60)

    # Test root endpoint
    root_resp = client.get("/")
    print(f" GET /        : HTTP {root_resp.status_code}")
    print(f" Response     : {root_resp.json()}")
    print("-" * 60)

    # Test health endpoint
    health_resp = client.get("/health")
    print(f" GET /health  : HTTP {health_resp.status_code}")
    print(f" Response     : {health_resp.json()}")
    print("=" * 60)

    if root_resp.status_code == 200 and health_resp.status_code == 200:
        print(" ALL ENDPOINT TESTS PASSED SUCCESSFULLY!")
        return True
    else:
        print(" HEALTH CHECK FAILED!")
        return False

if __name__ == "__main__":
    success = test_endpoints()
    sys.exit(0 if success else 1)
