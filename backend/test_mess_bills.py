import sys
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_module_4_mess_bills():
    print("=" * 70)
    print(" TESTING MODULE 4: MONTHLY MESS BILL CALCULATION ")
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

    # 2. Register Students (Student A and Student B)
    s1_res = client.post("/students", json={
        "email": "studentA.bills@hostel.com",
        "password": "StudentPassword123!",
        "full_name": "Student A (Low Ticks)",
        "room_number": "301",
        "permanent_address": "Addr A",
        "personal_contact": "+111111111",
        "emergency_contact": "+222222222",
        "fee_status": "pending"
    }, headers=admin_headers)
    if s1_res.status_code == 400:
        list_res = client.get("/students", headers=admin_headers)
        s1_data = [p for p in list_res.json() if p["email"] == "studentA.bills@hostel.com"][0]
    else:
        s1_data = s1_res.json()
    s1_id = s1_data["id"]

    s2_res = client.post("/students", json={
        "email": "studentB.bills@hostel.com",
        "password": "StudentPassword123!",
        "full_name": "Student B (High Ticks)",
        "room_number": "302",
        "permanent_address": "Addr B",
        "personal_contact": "+333333333",
        "emergency_contact": "+444444444",
        "fee_status": "paid"
    }, headers=admin_headers)
    if s2_res.status_code == 400:
        list_res = client.get("/students", headers=admin_headers)
        s2_data = [p for p in list_res.json() if p["email"] == "studentB.bills@hostel.com"][0]
    else:
        s2_data = s2_res.json()
    s2_id = s2_data["id"]

    print("[2] Students A and B registered.")

    # Log in as Student A
    student_login = client.post("/auth/login", json={"email": "studentA.bills@hostel.com", "password": "StudentPassword123!"})
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    test_year = 2026
    test_month = 7

    # Clean up any existing test bills AND test meals for (2026, 7) for test idempotency
    from app.database import SessionLocal
    from app.models.bill import MessBill
    from app.models.meal import MealSelection
    db_clean = SessionLocal()
    db_clean.query(MessBill).filter(MessBill.year == test_year, MessBill.month == test_month).delete()
    db_clean.query(MealSelection).filter(MealSelection.student_profile_id == s2_id).delete()
    db_clean.commit()
    db_clean.close()

    # 4. Generate Initial Bills for (2026, 7)
    print("\n[3] Admin generating initial bills for 07/2026...")
    gen_res1 = client.post("/bills/generate", json={"year": test_year, "month": test_month}, headers=admin_headers)
    assert gen_res1.status_code == 200, f"Generate bills failed: {gen_res1.text}"
    summary1 = gen_res1.json()
    print(f" -> Generated bills for {summary1['total_students_billed']} students.")
    # With 0 ticks, students should get base bill of 1800.0
    for b in summary1["bills"]:
        assert b["amount"] == 1800.0, f"Expected 1800.0 for <= 30 ticks, got {b['amount']}"
    print(" -> SUCCESS: Base bill of 1800.0 verified for <= 30 ticks!")

    # 5. Add meal selections for Student B to simulate > 30 ticks (e.g. 35 ticks)
    # 35 ticks -> Bill = 1800.0 + (35 - 30) * 55 = 1800 + 275 = 2075.0
    db = SessionLocal()

    # Clear existing test meals for Student B in month 7
    db.query(MealSelection).filter(MealSelection.student_profile_id == s2_id).delete()
    # Add 18 days of breakfast + dinner = 36 ticks
    for day in range(1, 19):
        m = MealSelection(
            student_profile_id=s2_id,
            meal_date=date(test_year, test_month, day),
            breakfast=True,
            dinner=(day <= 17)  # 18 breakfasts + 17 dinners = 35 total ticks
        )
        db.add(m)
    db.commit()
    db.close()
    print("\n[4] Populated 35 meal ticks for Student B in 07/2026.")

    # 6. Regenerate Bills Before Finalization
    print("\n[5] Admin regenerating bills before finalization...")
    gen_res2 = client.post("/bills/generate", json={"year": test_year, "month": test_month}, headers=admin_headers)
    assert gen_res2.status_code == 200
    summary2 = gen_res2.json()

    # Find Student B's updated bill
    b_bill = [b for b in summary2["bills"] if b["student_profile_id"] == s2_id][0]
    assert b_bill["total_ticks"] == 35, f"Expected 35 ticks, got {b_bill['total_ticks']}"
    expected_amount = 1800.0 + (35 - 30) * 55.0  # 1800 + 275 = 2075.0
    assert b_bill["amount"] == expected_amount, f"Expected {expected_amount}, got {b_bill['amount']}"
    print(f" -> SUCCESS: Regenerated Bill for Student B verified! Ticks: {b_bill['total_ticks']}, Amount: {b_bill['amount']}")

    # 7. Finalize Bills
    print("\n[6] Admin finalizing 07/2026 mess bills...")
    fin_res = client.post("/bills/finalize", json={"year": test_year, "month": test_month}, headers=admin_headers)
    assert fin_res.status_code == 200
    assert fin_res.json()["is_finalized"] is True
    print(" -> SUCCESS: Bills for 07/2026 finalized and locked!")

    # 8. Attempt Regeneration After Finalization (Should fail HTTP 400)
    print("\n[7] Testing regeneration block after finalization...")
    regen_after_fin = client.post("/bills/generate", json={"year": test_year, "month": test_month}, headers=admin_headers)
    assert regen_after_fin.status_code == 400, f"Expected 400 Bad Request, got {regen_after_fin.status_code}"
    print(f" -> SUCCESS: Regeneration blocked after finalization (HTTP 400)! Detail: {regen_after_fin.json()['detail']}")

    # 9. Admin Query Bills Summary & Student Billing History
    print("\n[8] Admin retrieving monthly bills summary & student billing history...")
    get_bills_res = client.get(f"/bills?year={test_year}&month={test_month}", headers=admin_headers)
    assert get_bills_res.status_code == 200

    history_res = client.get(f"/bills/student/{s2_id}", headers=admin_headers)
    assert history_res.status_code == 200
    assert len(history_res.json()) >= 1
    print(" -> SUCCESS: Monthly summary & student billing history verified!")

    # 10. Verify RBAC Controls (Student Rejections)
    print("\n[9] Testing RBAC: Verifying Students are forbidden from viewing or generating billing info...")
    student_gen = client.post("/bills/generate", json={"year": test_year, "month": test_month}, headers=student_headers)
    assert student_gen.status_code == 403, f"Expected 403, got {student_gen.status_code}"

    student_fin = client.post("/bills/finalize", json={"year": test_year, "month": test_month}, headers=student_headers)
    assert student_fin.status_code == 403, f"Expected 403, got {student_fin.status_code}"

    student_get_all = client.get(f"/bills?year={test_year}&month={test_month}", headers=student_headers)
    assert student_get_all.status_code == 403, f"Expected 403, got {student_get_all.status_code}"

    student_get_hist = client.get(f"/bills/student/{s2_id}", headers=student_headers)
    assert student_get_hist.status_code == 403, f"Expected 403, got {student_get_hist.status_code}"
    print(" -> SUCCESS: All billing endpoints strictly reject Student access (HTTP 403 Forbidden)!")

    print("\n" + "=" * 70)
    print(" MODULE 4: ALL MONTHLY MESS BILL TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_module_4_mess_bills()
    sys.exit(0 if success else 1)
