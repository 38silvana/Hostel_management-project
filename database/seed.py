import sys
import os
from datetime import date, timedelta

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.db import SessionLocal, engine, Base
from app.models import User, Student, Room, MealPrice, MealSelection, MonthlyBill
from app.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("Seeding database...")

    # 1. Admin User
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("Created Admin user (admin / admin123)")

    # 2. Rooms
    rooms_data = [
        {"room_number": "101", "capacity": 2},
        {"room_number": "102", "capacity": 2},
        {"room_number": "201", "capacity": 3},
    ]
    for r in rooms_data:
        existing = db.query(Room).filter(Room.room_number == r["room_number"]).first()
        if not existing:
            db.add(Room(room_number=r["room_number"], capacity=r["capacity"], occupied=0))
    db.commit()

    # 3. Meal Prices
    prices = db.query(MealPrice).first()
    if not prices:
        prices = MealPrice(breakfast_price=40.0, lunch_price=70.0, dinner_price=60.0)
        db.add(prices)
        db.commit()
        print("Created default meal prices (Breakfast: 40, Lunch: 70, Dinner: 60)")

    # 4. Demo Students
    students_data = [
        {
            "username": "student1",
            "password": "student123",
            "name": "Rahul Sharma",
            "roll_no": "CS202601",
            "room_number": "101",
            "phone": "9876543210",
            "address": "Delhi, India"
        },
        {
            "username": "student2",
            "password": "student123",
            "name": "Priya Patel",
            "roll_no": "CS202602",
            "room_number": "101",
            "phone": "9876543211",
            "address": "Ahmedabad, India"
        },
        {
            "username": "student3",
            "password": "student123",
            "name": "Amit Kumar",
            "roll_no": "EE202603",
            "room_number": "102",
            "phone": "9876543212",
            "address": "Jaipur, India"
        }
    ]

    for s_data in students_data:
        u = db.query(User).filter(User.username == s_data["username"]).first()
        if not u:
            u = User(
                username=s_data["username"],
                hashed_password=get_password_hash(s_data["password"]),
                role="student"
            )
            db.add(u)
            db.flush()

            room = db.query(Room).filter(Room.room_number == s_data["room_number"]).first()
            if room:
                room.occupied += 1

            student = Student(
                user_id=u.id,
                name=s_data["name"],
                roll_no=s_data["roll_no"],
                room_number=s_data["room_number"],
                phone=s_data["phone"],
                address=s_data["address"],
                fee_status="PAID"
            )
            db.add(student)
            db.commit()
            print(f"Created student: {s_data['name']} ({s_data['username']} / {s_data['password']})")

    # 5. Seed Meal Selections for August 2026
    student1 = db.query(Student).filter(Student.roll_no == "CS202601").first()
    if student1:
        today = date.today()
        for i in range(5):
            d = today + timedelta(days=i)
            sel = db.query(MealSelection).filter(MealSelection.student_id == student1.id, MealSelection.date == d).first()
            if not sel:
                db.add(MealSelection(
                    student_id=student1.id,
                    date=d,
                    breakfast=True,
                    lunch=(i % 2 == 0),
                    dinner=True
                ))
        db.commit()

    # 6. Seed Demo Monthly Bill (Module 4)
    if student1:
        existing_bill = db.query(MonthlyBill).filter(MonthlyBill.student_id == student1.id, MonthlyBill.month == "2026-08").first()
        if not existing_bill:
            total_b, total_l, total_d = 31, 28, 30
            total_amt = (total_b * 40.0) + (total_l * 70.0) + (total_d * 60.0)
            bill = MonthlyBill(
                student_id=student1.id,
                month="2026-08",
                total_breakfasts=total_b,
                total_lunches=total_l,
                total_dinners=total_d,
                breakfast_rate=40.0,
                lunch_rate=70.0,
                dinner_rate=60.0,
                total_amount=total_amt,
                payment_status="UNPAID"
            )
            db.add(bill)
            db.commit()
            print(f"Created seed bill for {student1.name}: Rs. {total_amt}")

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
