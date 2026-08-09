import pytest
from fastapi.testclient import TestClient
import sys, os
from datetime import date

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, Student, Room, MealPrice, MealSelection, MonthlyBill
from app.auth import get_password_hash

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Clean up test database
    db.query(MonthlyBill).delete()
    db.query(MealSelection).delete()
    db.query(Student).delete()
    db.query(User).delete()
    db.query(Room).delete()
    db.query(MealPrice).delete()
    db.commit()

    # Create admin
    admin = User(username="admin_test", hashed_password=get_password_hash("pass123"), role="admin")
    db.add(admin)
    
    # Create room
    room = Room(room_number="T101", capacity=2, occupied=0)
    db.add(room)

    # Create meal price
    price = MealPrice(breakfast_price=50.0, lunch_price=80.0, dinner_price=70.0)
    db.add(price)
    db.commit()
    db.close()
    yield

def test_auth_login_admin():
    response = client.post("/api/auth/login", json={"username": "admin_test", "password": "pass123"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "admin"
    assert "access_token" in data

def test_student_and_room_creation():
    # Login admin
    res_login = client.post("/api/auth/login", json={"username": "admin_test", "password": "pass123"})
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create student
    student_payload = {
        "username": "student_test1",
        "password": "stpass123",
        "name": "Test Student",
        "roll_no": "ROLL001",
        "room_number": "T101",
        "phone": "1234567890",
        "address": "Test City"
    }
    res_stu = client.post("/api/students/", json=student_payload, headers=headers)
    assert res_stu.status_code == 201
    stu_data = res_stu.json()
    assert stu_data["name"] == "Test Student"
    assert stu_data["room_number"] == "T101"

    # Verify room occupied updated to 1
    res_rooms = client.get("/api/rooms/", headers=headers)
    assert res_rooms.status_code == 200
    rooms = res_rooms.json()
    t101 = next(r for r in rooms if r["room_number"] == "T101")
    assert t101["occupied"] == 1

def test_student_meal_selection_and_kitchen():
    # Login student
    res_login = client.post("/api/auth/login", json={"username": "student_test1", "password": "stpass123"})
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Save meal selection for today
    today_str = str(date.today())
    meal_payload = {
        "date": today_str,
        "breakfast": True,
        "lunch": False,
        "dinner": True
    }
    res_meal = client.post("/api/meals/selection", json=meal_payload, headers=headers)
    assert res_meal.status_code == 200
    assert res_meal.json()["lunch"] == False

    # Kitchen count check
    res_kitchen = client.get(f"/api/meals/kitchen?target_date={today_str}", headers=headers)
    assert res_kitchen.status_code == 200
    kdata = res_kitchen.json()
    assert kdata["total_breakfast"] == 1
    assert kdata["total_lunch"] == 0
    assert kdata["total_dinner"] == 1

def test_module_4_monthly_mess_billing():
    # Admin logins
    res_admin = client.post("/api/auth/login", json={"username": "admin_test", "password": "pass123"})
    admin_token = res_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Generate monthly bill for 2026-08
    gen_payload = {"month": "2026-08"}
    res_gen = client.post("/api/billing/generate", json=gen_payload, headers=admin_headers)
    assert res_gen.status_code == 200
    bills = res_gen.json()
    assert len(bills) >= 1
    bill = bills[0]
    assert bill["month"] == "2026-08"
    assert bill["payment_status"] == "UNPAID"
    assert bill["total_amount"] > 0

    # Admin updates payment status to PAID
    bill_id = bill["id"]
    res_update = client.put(f"/api/billing/{bill_id}/status", json={"payment_status": "PAID"}, headers=admin_headers)
    assert res_update.status_code == 200
    assert res_update.json()["payment_status"] == "PAID"

    # Student views their own bills
    res_stu_login = client.post("/api/auth/login", json={"username": "student_test1", "password": "stpass123"})
    stu_token = res_stu_login.json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    res_stu_bills = client.get("/api/billing/student", headers=stu_headers)
    assert res_stu_bills.status_code == 200
    stu_bills = res_stu_bills.json()
    assert len(stu_bills) >= 1
    assert stu_bills[0]["payment_status"] == "PAID"
