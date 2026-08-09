from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.models import Room, User
from app.schemas import RoomCreate, RoomResponse
from app.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

@router.get("/", response_model=List[RoomResponse])
def list_rooms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rooms = db.query(Room).all()
    return rooms

@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_data: RoomCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    existing = db.query(Room).filter(Room.room_number == room_data.room_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    room = Room(room_number=room_data.room_number, capacity=room_data.capacity, occupied=0)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.occupied > 0:
        raise HTTPException(status_code=400, detail="Cannot delete room with assigned students")
    
    db.delete(room)
    db.commit()
    return {"message": "Room deleted successfully"}
