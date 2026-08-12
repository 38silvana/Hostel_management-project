import sys
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_module_3_meal_management():
    print("=" * 70)
    print(" TESTING MODULE 3: MEAL MANAGEMENT & 10 PM CUTOFF ")
    print("=" * 70)

    # 1. Admin Setup & Login
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

    # 2. Create Two Students (Alice & Bob)
    s1_res = client.post("/students", json={
        "email": "alice.meals@hostel.com",
        "password": "AlicePassword123!",
        "full_name": "Alice MealTest",
        "room_number": "201",
        "permanent_address": "Addr 1",
        "personal_contact": "+111111111",
        "emergency_contact": "+222222222",
        "fee_status": "paid"
    }, headers=admin_headers)
    if s1_res.status_code == 400:
        list_res = client.get("/students", headers=admin_headers)
        s1_data = [p for p in list_res.json() if p["email"] == "alice.meals@hostel.com"][0]
    else:
        s1_data = s1_res.json()

    s2_res = client.post("/students", json={
        "email": "bob.meals@hostel.com",
        "password": "BobPassword123!",
        "full_name": "Bob MealTest",
        "room_number": "202",
        "permanent_address": "Addr 2",
        "personal_contact": "+333333333",
        "emergency_contact": "+444444444",
        "fee_status": "pending"
    }, headers=admin_headers)
    if s2_res.status_code == 400:
        list_res = client.get("/students", headers=admin_headers)
        s2_data = [p for p in list_res.json() if p["email"] == "bob.meals@hostel.com"][0]
    else:
        s2_data = s2_res.json()

    print("[2] Students Alice and Bob registered.")

    # 3. Log in as Alice and Bob
    alice_login = client.post("/auth/login", json={"email": "alice.meals@hostel.com", "password": "AlicePassword123!"})
    alice_token = alice_login.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    bob_login = client.post("/auth/login", json={"email": "bob.meals@hostel.com", "password": "BobPassword123!"})
    bob_token = bob_login.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    print("[3] Alice and Bob logged in.")

    # 4. Alice Selects Tomorrow's Meals Before 10 PM (Hour: 19)
    print("\n[4] Alice selecting tomorrow's meals before 10 PM (Breakfast: True, Dinner: False)...")
    alice_meal_1 = client.post("/meals/tomorrow?simulated_hour=19", json={
        "breakfast": True,
        "dinner": False
    }, headers=alice_headers)
    assert alice_meal_1.status_code == 200, f"Failed Alice meal submission: {alice_meal_1.text}"
    print(f" -> SUCCESS: Alice selected meals (Breakfast: {alice_meal_1.json()['breakfast']}, Dinner: {alice_meal_1.json()['dinner']})")

    # 5. Alice Modifies Selection Before 10 PM (Hour: 21) -> Verifies Upsert (Single Record)
    print("\n[5] Alice modifying selection before 10 PM (Breakfast: True, Dinner: True)...")
    alice_meal_2 = client.post("/meals/tomorrow?simulated_hour=21", json={
        "breakfast": True,
        "dinner": True
    }, headers=alice_headers)
    assert alice_meal_2.status_code == 200
    assert alice_meal_2.json()["id"] == alice_meal_1.json()["id"], "MUST update existing record (1 record per student per date)!"
    print(" -> SUCCESS: Alice updated selection! Single record updated cleanly.")

    # 6. Bob Selects Tomorrow's Meals Before 10 PM (Breakfast: False, Dinner: True)
    print("\n[6] Bob selecting tomorrow's meals before 10 PM...")
    bob_meal = client.post("/meals/tomorrow?simulated_hour=20", json={
        "breakfast": False,
        "dinner": True
    }, headers=bob_headers)
    assert bob_meal.status_code == 200
    print(" -> SUCCESS: Bob selected meals (Breakfast: False, Dinner: True)")

    # 7. Test 10 PM Cutoff Enforcement (Hour: 22 - 10:00 PM) -> Expect HTTP 400 Bad Request
    print("\n[7] Testing 10 PM cutoff enforcement (simulating 10:00 PM / Hour 22)...")
    cutoff_try = client.post("/meals/tomorrow?simulated_hour=22", json={
        "breakfast": False,
        "dinner": False
    }, headers=alice_headers)
    assert cutoff_try.status_code == 400, f"Expected HTTP 400, got {cutoff_try.status_code}"
    print(f" -> SUCCESS: Submission rejected after 10 PM cutoff (HTTP 400)! Response: {cutoff_try.json()['detail']}")

    # 8. Student View Own Selection
    print("\n[8] Alice viewing own selection for tomorrow...")
    alice_get_meal = client.get("/meals/my-selection/tomorrow", headers=alice_headers)
    assert alice_get_meal.status_code == 200
    assert alice_get_meal.json()["breakfast"] is True
    assert alice_get_meal.json()["dinner"] is True
    print(" -> SUCCESS: Alice verified own tomorrow meal choices.")

    # 9. Admin Kitchen Dashboard Counts Verification
    print("\n[9] Admin checking tomorrow's Kitchen Dashboard Counts...")
    counts_res = client.get("/meals/counts/tomorrow", headers=admin_headers)
    assert counts_res.status_code == 200
    counts = counts_res.json()
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
    assert counts["meal_date"] == tomorrow_str
    assert counts["total_breakfast_count"] == 1  # Alice (True) + Bob (False) = 1
    assert counts["total_dinner_count"] == 2     # Alice (True) + Bob (True) = 2
    assert counts["total_students_selected"] == 2
    print(f" -> KITCHEN DASHBOARD COUNTS VERIFIED FOR {counts['meal_date']}:")
    print(f"    - Total Breakfasts : {counts['total_breakfast_count']}")
    print(f"    - Total Dinners    : {counts['total_dinner_count']}")
    print(f"    - Total Submissions: {counts['total_students_selected']}")

    # 10. RBAC Protection Checks
    print("\n[10] Verifying RBAC protections...")
    # Admin cannot submit student meal choices
    admin_submit = client.post("/meals/tomorrow", json={"breakfast": True, "dinner": True}, headers=admin_headers)
    assert admin_submit.status_code == 403, f"Expected 403 Forbidden, got {admin_submit.status_code}"

    # Student cannot view Kitchen Dashboard Counts
    student_dashboard = client.get("/meals/counts/tomorrow", headers=alice_headers)
    assert student_dashboard.status_code == 403, f"Expected 403 Forbidden, got {student_dashboard.status_code}"
    print(" -> SUCCESS: RBAC rules enforced! Admin restricted from student posts; Student restricted from kitchen counts.")

    print("\n" + "=" * 70)
    print(" MODULE 3: ALL MEAL MANAGEMENT TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_module_3_meal_management()
    sys.exit(0 if success else 1)
