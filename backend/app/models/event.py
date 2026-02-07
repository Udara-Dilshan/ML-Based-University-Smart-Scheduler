"""
Vehicle and Event Management Models
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class RequestStatus(str, enum.Enum):
    """Request status enumeration"""
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class Vehicle(Base):
    """Vehicle model"""
    __tablename__ = "vehicles"

    vehicle_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reg_number = Column(String(20), nullable=False, unique=True)
    type = Column(String(50), nullable=True)
    capacity = Column(Integer, nullable=False)
    driver_name = Column(String(100), nullable=True)
    is_available = Column(Boolean, default=True)

    # Relationships
    vehicle_requests = relationship("VehicleRequest", back_populates="vehicle")

    def __repr__(self):
        return f"<Vehicle {self.reg_number}>"


class VehicleRequest(Base):
    """Vehicle request model"""
    __tablename__ = "vehicle_requests"

    req_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    vehicle_type_needed = Column(String(50), nullable=True)
    passenger_count = Column(Integer, nullable=True)
    trip_date = Column(DateTime, nullable=False)
    destination = Column(String(255), nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    assigned_vehicle_id = Column(Integer, ForeignKey("vehicles.vehicle_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    requester = relationship("User", back_populates="vehicle_requests")
    vehicle = relationship("Vehicle", back_populates="vehicle_requests")

    def __repr__(self):
        return f"<VehicleRequest {self.req_id} - {self.status}>"


class Event(Base):
    """Event model for auditorium/ground bookings"""
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    organizer_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    event_name = Column(String(150), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)

    # Relationships
    resource = relationship("Resource", back_populates="events")
    organizer = relationship("User", back_populates="events")

    def __repr__(self):
        return f"<Event {self.event_name}>"
