from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
from app.routers import auth, students, rooms, meals, billing

# Create tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Hostel Management System API",
    description="Backend API for Hostel Student, Room, Meal, and Monthly Mess Billing Management",
    version="1.0.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(rooms.router)
app.include_router(meals.router)
app.include_router(billing.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Hostel Management System API is running",
        "version": "1.0.0"
    }
