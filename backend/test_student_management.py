import sys
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_module_2_student_management():
    print("=" * 70)
    print(" TESTING MODULE 2: STUDENT MANAGEMENT ")
    print("=" * 70)

    # 1. Setup / Login as Admin
    # First try setup in case DB is fresh
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
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[1] Admin logged in successfully.")

    # 2. Admin Creates Student 1 & Student 2 Profiles
    print("\n[2] Admin creating Student 1 (Alice)...")
    student1_payload = {
        "email": "alice.student.m2@hostel.com",
        "password": "AlicePassword123!",
        "full_name": "Alice Smith",
        "room_number": "101-A",
        "permanent_address": "123 Main St, Springfield",
        "personal_contact": "+1234567890",
        "emergency_contact": "+0987654321",
        "fee_status": "pending"
    }
    s1_res = client.post("/students", json=student1_payload, headers=admin_headers)
    if s1_res.status_code == 400 and "already exists" in s1_res.text:
        # Get existing profile
        list_res = client.get("/students", headers=admin_headers)
        s1_data = [p for p in list_res.json() if p["email"] == "alice.student.m2@hostel.com"][0]
        s1_id = s1_data["id"]
    else:
        assert s1_res.status_code == 201, f"Failed creating student 1: {s1_res.text}"
        s1_data = s1_res.json()
        s1_id = s1_data["id"]
    print(f" -> Created/Found Student 1: ID {s1_id}, Room {s1_data['room_number']}, Fee Status: {s1_data['fee_status']}")

    print("\n[3] Admin creating Student 2 (Bob)...")
    student2_payload = {
        "email": "bob.student.m2@hostel.com",
        "password": "BobPassword123!",
        "full_name": "Bob Jones",
        "room_number": "102-B",
        "permanent_address": "456 Elm St, Shelbyville",
        "personal_contact": "+1122334455",
        "emergency_contact": "+5544332211",
        "fee_status": "paid"
    }
    s2_res = client.post("/students", json=student2_payload, headers=admin_headers)
    if s2_res.status_code == 400 and "already exists" in s2_res.text:
        list_res = client.get("/students", headers=admin_headers)
        s2_data = [p for p in list_res.json() if p["email"] == "bob.student.m2@hostel.com"][0]
        s2_id = s2_data["id"]
    else:
        assert s2_res.status_code == 201, f"Failed creating student 2: {s2_res.text}"
        s2_data = s2_res.json()
        s2_id = s2_data["id"]
    print(f" -> Created/Found Student 2: ID {s2_id}, Room {s2_data['room_number']}")

    # 3. Test Profile Photo Upload
    print("\n[4] Uploading profile photo for Alice...")
    dummy_image = io.BytesIO(b"fake image data content")
    photo_res = client.post(
        f"/students/{s1_id}/upload-photo",
        files={"file": ("profile.jpg", dummy_image, "image/jpeg")},
        headers=admin_headers
    )
    assert photo_res.status_code == 200, f"Photo upload failed: {photo_res.text}"
    photo_path = photo_res.json()["profile_photo"]
    print(f" -> SUCCESS: Photo uploaded at {photo_path}")

    # 4. Admin List All Students
    print("\n[5] Admin listing all students...")
    list_res = client.get("/students", headers=admin_headers)
    assert list_res.status_code == 200
    students_list = list_res.json()
    assert len(students_list) >= 2
    print(f" -> Total students returned to Admin: {len(students_list)}")

    # 5. Admin Update Student 1 Profile & Fee Status
    print("\n[6] Admin updating Student 1 (room number & fee status to paid)...")
    update_res = client.put(
        f"/students/{s1_id}",
        json={"room_number": "101-B", "fee_status": "paid"},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["room_number"] == "101-B"
    assert updated_data["fee_status"] == "paid"
    print(" -> SUCCESS: Room number updated to 101-B and fee status updated to paid!")

    # 6. Student Login
    print("\n[7] Alice (Student 1) logging in...")
    s1_login = client.post("/auth/login", json={
        "email": "alice.student.m2@hostel.com",
        "password": "AlicePassword123!"
    })
    assert s1_login.status_code == 200, f"Alice login failed: {s1_login.text}"
    s1_token = s1_login.json()["access_token"]
    s1_headers = {"Authorization": f"Bearer {s1_token}"}
    print(" -> SUCCESS: Alice logged in!")

    # 7. Student View Own Profile (/students/me) - Verify Billing Info (fee_status) is Omitted
    print("\n[8] Alice viewing own profile (/students/me)...")
    my_profile_res = client.get("/students/me", headers=s1_headers)
    assert my_profile_res.status_code == 200
    my_data = my_profile_res.json()
    assert my_data["full_name"] == "Alice Smith"
    assert "fee_status" not in my_data, "SECURITY VIOLATION: fee_status should be omitted for Student!"
    print(" -> SUCCESS: Alice viewed own profile. Billing information (fee_status) correctly hidden!")

    # 8. Student Attempting to View Another Student's Profile (Bob's ID)
    print("\n[9] Alice attempting to view Bob's profile (Forbidden check)...")
    bob_view = client.get(f"/students/{s2_id}", headers=s1_headers)
    assert bob_view.status_code == 403, f"Expected 403 Forbidden, got {bob_view.status_code}"
    print(" -> SUCCESS: Alice forbidden from viewing Bob's profile (HTTP 403)!")

    # 9. Student Attempting Admin CRUD Operations (Forbidden check)
    print("\n[10] Alice attempting Admin CRUD operations (Forbidden checks)...")
    create_try = client.post("/students", json=student1_payload, headers=s1_headers)
    assert create_try.status_code == 403
    update_try = client.put(f"/students/{s2_id}", json={"room_number": "999"}, headers=s1_headers)
    assert update_try.status_code == 403
    delete_try = client.delete(f"/students/{s2_id}", headers=s1_headers)
    assert delete_try.status_code == 403
    print(" -> SUCCESS: All Admin CRUD endpoints rejected student access (HTTP 403)!")

    # 10. Admin Deletes Student 2
    print("\n[11] Admin deleting Student 2...")
    del_res = client.delete(f"/students/{s2_id}", headers=admin_headers)
    assert del_res.status_code == 204
    print(" -> SUCCESS: Student 2 deleted by Admin!")

    print("\n" + "=" * 70)
    print(" MODULE 2: ALL STUDENT MANAGEMENT TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_module_2_student_management()
    sys.exit(0 if success else 1)
