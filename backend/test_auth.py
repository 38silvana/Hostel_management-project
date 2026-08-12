import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_module_1_authentication():
    print("=" * 70)
    print(" TESTING MODULE 1: AUTHENTICATION (ADMIN & STUDENT) ")
    print("=" * 70)

    # 1. Setup Initial Admin
    admin_payload = {
        "email": "admin@hostel.com",
        "password": "AdminPassword123!",
        "full_name": "Chief Warden Admin",
        "role": "admin"
    }
    print("[1] Setting up initial Admin account...")
    res = client.post("/auth/setup-initial-admin", json=admin_payload)
    if res.status_code in [201, 400]:
        print(f" -> Admin Setup Status: {res.status_code} ({res.json() if res.status_code == 201 else 'Admin already exists'})")
    else:
        print(f" FAILED Admin setup: {res.status_code} {res.text}")
        return False

    # 2. Login as Admin
    print("\n[2] Logging in as Admin...")
    login_admin = client.post("/auth/login", json={
        "email": "admin@hostel.com",
        "password": "AdminPassword123!"
    })
    assert login_admin.status_code == 200, f"Admin login failed: {login_admin.text}"
    admin_token = login_admin.json()["access_token"]
    print(f" -> SUCCESS: Admin logged in! JWT token acquired.")

    # 3. Test Unauthenticated/Public Creation Denial
    print("\n[3] Verifying public creation denial...")
    student_payload = {
        "email": "john.student@hostel.com",
        "password": "StudentPassword123!",
        "full_name": "John Doe",
        "role": "student"
    }
    unauth_create = client.post("/auth/create-user", json=student_payload)
    assert unauth_create.status_code == 401, f"Expected HTTP 401, got {unauth_create.status_code}"
    print(" -> SUCCESS: Unauthenticated student creation correctly rejected (HTTP 401)!")

    # 4. Admin Creating Student Account
    print("\n[4] Admin creating Student account...")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    create_student = client.post("/auth/create-user", json=student_payload, headers=admin_headers)
    if create_student.status_code == 400 and "already exists" in create_student.text:
        print(" -> Student already exists in DB.")
    else:
        assert create_student.status_code == 201, f"Failed student creation: {create_student.text}"
        print(" -> SUCCESS: Student account created by Admin!")

    # 5. Student Login with Credentials Created by Admin
    print("\n[5] Student logging in with Admin-created credentials...")
    login_student = client.post("/auth/login", json={
        "email": "john.student@hostel.com",
        "password": "StudentPassword123!"
    })
    assert login_student.status_code == 200, f"Student login failed: {login_student.text}"
    student_token = login_student.json()["access_token"]
    print(" -> SUCCESS: Student logged in with Admin-created credentials!")

    # 6. Verify Profile & Roles
    print("\n[6] Verifying user profile /auth/me for Student...")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    me_resp = client.get("/auth/me", headers=student_headers)
    assert me_resp.status_code == 200
    profile = me_resp.json()
    assert profile["email"] == "john.student@hostel.com"
    assert profile["role"] == "student"
    print(f" -> Profile Verified: {profile['full_name']} (Role: {profile['role']})")

    # 7. Student Forbidden from Creating Users
    print("\n[7] Verifying Student is forbidden from creating new users...")
    student_try_create = client.post("/auth/create-user", json={
        "email": "fake.student@hostel.com",
        "password": "Password123!",
        "full_name": "Fake Student",
        "role": "student"
    }, headers=student_headers)
    assert student_try_create.status_code == 403, f"Expected 403 Forbidden, got {student_try_create.status_code}"
    print(" -> SUCCESS: Student creation forbidden for non-admin users (HTTP 403)!")

    print("\n" + "=" * 70)
    print(" MODULE 1: ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_module_1_authentication()
    sys.exit(0 if success else 1)
