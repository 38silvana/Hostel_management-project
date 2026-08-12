import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_module_5_student_profile_view():
    print("=" * 70)
    print(" TESTING MODULE 5: STUDENT PROFILE VIEW & SECURITY ")
    print("=" * 70)

    # 1. Setup Admin Account & Login
    client.post("/auth/setup-initial-admin", json={
        "email": "admin@hostel.com",
        "password": "AdminPassword123!",
        "full_name": "Chief Warden Admin",
        "role": "admin"
    })
    admin_login = client.post("/auth/login", json={
        "email": "admin@hostel.com",
        "password": "AdminPassword123!"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[1] Admin logged in successfully.")

    # 2. Create Student 1 (Charlie) and Student 2 (Diana)
    s1_res = client.post("/students", json={
        "email": "charlie.m5@hostel.com",
        "password": "CharliePassword123!",
        "full_name": "Charlie Chaplin",
        "room_number": "501-A",
        "permanent_address": "501 Comedy St",
        "personal_contact": "+5555555555",
        "emergency_contact": "+6666666666",
        "fee_status": "pending"
    }, headers=admin_headers)
    if s1_res.status_code == 400:
        list_res = client.get("/students", headers=admin_headers)
        s1_data = [p for p in list_res.json() if p["email"] == "charlie.m5@hostel.com"][0]
    else:
        s1_data = s1_res.json()
    s1_id = s1_data["id"]

    s2_res = client.post("/students", json={
        "email": "diana.m5@hostel.com",
        "password": "DianaPassword123!",
        "full_name": "Diana Prince",
        "room_number": "502-B",
        "permanent_address": "502 Wonder St",
        "personal_contact": "+7777777777",
        "emergency_contact": "+8888888888",
        "fee_status": "paid"
    }, headers=admin_headers)
    if s2_res.status_code == 400:
        list_res = client.get("/students", headers=admin_headers)
        s2_data = [p for p in list_res.json() if p["email"] == "diana.m5@hostel.com"][0]
    else:
        s2_data = s2_res.json()
    s2_id = s2_data["id"]

    print("[2] Students Charlie and Diana registered.")

    # Log in as Charlie
    c_login = client.post("/auth/login", json={"email": "charlie.m5@hostel.com", "password": "CharliePassword123!"})
    assert c_login.status_code == 200
    c_token = c_login.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}
    print("[3] Charlie logged in.")

    # 3. Student Viewing Own Profile (/students/me and /students/profile)
    print("\n[4] Student (Charlie) viewing own profile (/students/me and /students/profile)...")
    me_resp = client.get("/students/me", headers=c_headers)
    assert me_resp.status_code == 200
    profile_data = me_resp.json()
    assert profile_data["full_name"] == "Charlie Chaplin"
    assert profile_data["room_number"] == "501-A"
    assert "fee_status" not in profile_data, "SECURITY VIOLATION: fee_status must be omitted for Student response!"

    alias_resp = client.get("/students/profile", headers=c_headers)
    assert alias_resp.status_code == 200
    assert alias_resp.json()["full_name"] == "Charlie Chaplin"
    print(" -> SUCCESS: Charlie viewed own profile via both endpoints. Billing info (fee_status) correctly omitted!")

    # 4. Strict IDOR Security Protection Check
    print("\n[5] Testing IDOR Security: Charlie attempting to view Diana's profile ID...")
    idor_resp = client.get(f"/students/{s2_id}", headers=c_headers)
    assert idor_resp.status_code == 403, f"Expected HTTP 403 Forbidden, got {idor_resp.status_code}"
    print(f" -> SUCCESS: IDOR attack blocked (HTTP 403 Forbidden)! Detail: {idor_resp.json()['detail']}")

    # 5. Student Attempting to List All Students
    print("\n[6] Testing RBAC: Charlie attempting to list all students...")
    list_try = client.get("/students", headers=c_headers)
    assert list_try.status_code == 403
    print(" -> SUCCESS: Student prohibited from listing all students (HTTP 403 Forbidden)!")

    # 6. Admin Search Functionality
    print("\n[7] Testing Admin Search Filtering (by name, email, room number)...")
    # Search by name "Diana"
    search_name = client.get("/students?search=Diana", headers=admin_headers)
    assert search_name.status_code == 200
    results_name = search_name.json()
    assert any(s["full_name"] == "Diana Prince" for s in results_name)

    # Search by room number "501-A"
    search_room = client.get("/students?search=501-A", headers=admin_headers)
    assert search_room.status_code == 200
    results_room = search_room.json()
    assert any(s["room_number"] == "501-A" for s in results_room)

    # Search by email "charlie.m5"
    search_email = client.get("/students?email=charlie.m5", headers=admin_headers)
    assert search_email.status_code == 200
    results_email = search_email.json()
    assert len(results_email) == 1
    assert results_email[0]["full_name"] == "Charlie Chaplin"
    print(" -> SUCCESS: Admin search filtering across name, email, and room number verified!")

    # 7. Admin Retrieving Single Student Profile by ID
    print("\n[8] Admin retrieving single student profile by ID...")
    admin_get_s1 = client.get(f"/students/{s1_id}", headers=admin_headers)
    assert admin_get_s1.status_code == 200
    s1_admin_view = admin_get_s1.json()
    assert s1_admin_view["full_name"] == "Charlie Chaplin"
    assert "fee_status" in s1_admin_view, "Fee status MUST be included for Admin view!"
    print(" -> SUCCESS: Admin retrieved single profile including fee_status!")

    # 8. Non-Existent Student Request (HTTP 404)
    print("\n[9] Testing Non-Existent Student Request (HTTP 404)...")
    not_found_resp = client.get("/students/999999", headers=admin_headers)
    assert not_found_resp.status_code == 404, f"Expected HTTP 404, got {not_found_resp.status_code}"
    print(" -> SUCCESS: Non-existent profile returned HTTP 404 Not Found!")

    # 9. Authentication Security Checks (Missing & Invalid JWTs)
    print("\n[10] Testing Authentication Security (Missing & Invalid JWT)...")
    no_jwt = client.get("/students/me")
    assert no_jwt.status_code == 401, f"Expected HTTP 401 for missing JWT, got {no_jwt.status_code}"

    bad_jwt = client.get("/students/me", headers={"Authorization": "Bearer invalid_token_123"})
    assert bad_jwt.status_code == 401, f"Expected HTTP 401 for invalid JWT, got {bad_jwt.status_code}"
    print(" -> SUCCESS: Authentication security verified (HTTP 401 for missing/invalid tokens)!")

    print("\n" + "=" * 70)
    print(" MODULE 5: ALL PROFILE VIEW & SECURITY TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_module_5_student_profile_view()
    sys.exit(0 if success else 1)
