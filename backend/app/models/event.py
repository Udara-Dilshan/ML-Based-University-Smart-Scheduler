"""
Vehicle, Event, and Request Management Models
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, DateTime, Text, Date, Time
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class RequestStatus(str, enum.Enum):
    """Request status enumeration"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


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
    """Vehicle request model — submitted by Lecturers"""
    __tablename__ = "vehicle_requests"

    req_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    vehicle_type_needed = Column(String(50), nullable=True)
    passenger_count = Column(Integer, nullable=True)
    trip_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    destination = Column(String(255), nullable=True)
    purpose = Column(Text, nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    assigned_vehicle_id = Column(Integer, ForeignKey("vehicles.vehicle_id", ondelete="SET NULL"), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Relationships
    requester = relationship("User", back_populates="vehicle_requests")
    vehicle = relationship("Vehicle", back_populates="vehicle_requests")

    def __repr__(self):
        return f"<VehicleRequest {self.req_id} - {self.status}>"


class EventRequest(Base):
    """Event/Venue request model — submitted by Lecturers, approved by Resource Manager"""
    __tablename__ = "event_requests"

    req_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    event_name = Column(String(150), nullable=False)
    event_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    participant_count = Column(Integer, nullable=False)
    purpose = Column(Text, nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    rejection_reason = Column(Text, nullable=True)
    # If manager approves with an alternative venue, this holds the actual allocated resource
    allocated_resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    requester = relationship("User", back_populates="event_requests")
    resource = relationship("Resource", foreign_keys=[resource_id], back_populates="event_requests")
    allocated_resource = relationship("Resource", foreign_keys=[allocated_resource_id])

    def __repr__(self):
        return f"<EventRequest {self.req_id} - {self.event_name} - {self.status}>"


class Event(Base):
    """Approved event model — source of truth for all approved bookings (admin-created or approved requests)"""
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    organizer_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True)
    event_name = Column(String(150), nullable=False)
    event_date = Column(Date, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(50), nullable=True)   # e.g. "Academic", "Sports", "Cultural"
    status = Column(Enum(RequestStatus), default=RequestStatus.APPROVED)
    # Link back to originating event request (if created via approval workflow)
    source_request_id = Column(Integer, ForeignKey("event_requests.req_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    resource = relationship("Resource", back_populates="events")
    organizer = relationship("User", back_populates="events")

    def __repr__(self):
        return f"<Event {self.event_name}>"
