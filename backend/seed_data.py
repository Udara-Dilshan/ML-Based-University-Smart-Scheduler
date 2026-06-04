"""
Seeder script to populate database with initial data
Run: python seed_data.py
"""

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.settings import SystemSetting
from app.utils.auth import hash_password
import sys


APP_TO_DB_ROLE = {
    UserRole.SUPER_ADMIN.value: "SUPER_ADMIN",
    UserRole.SCHEDULER.value: "SCHEDULER",
    UserRole.LECTURER.value: "LECTURER",
    UserRole.STUDENT.value: "STUDENT",
    UserRole.RESOURCE_MANAGER.value: "RESOURCE_MANAGER",
}


# -----------------------------
# ADMIN USER
# -----------------------------
def create_admin_user(db: Session):

    existing_admin = db.query(User).filter(User.email == "admin@uwu.ac.lk").first()

    if existing_admin:
        print("Admin user already exists")
        return existing_admin

    admin = User(
        email="admin@uwu.ac.lk",
        password_hash=hash_password("admin1234"),
        first_name="System",
        last_name="Administrator",
        role=APP_TO_DB_ROLE[UserRole.SUPER_ADMIN.value],
        contact_number="+94712345678",
        is_active=True
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    print("Admin user created")
    return admin


# -----------------------------
# SAMPLE USERS
# -----------------------------
def create_sample_users(db: Session):

    users_data = [
        {
            "email": "scheduler@uwu.ac.lk",
            "password": "scheduler123",
            "first_name": "Academic",
            "last_name": "Scheduler",
            "role": APP_TO_DB_ROLE[UserRole.SCHEDULER.value]
        },
        {
            "email": "lecturer@uwu.ac.lk",
            "password": "lecturer123",
            "first_name": "Kasun",
            "last_name": "Perera",
            "role": APP_TO_DB_ROLE[UserRole.LECTURER.value]
        },
        {
            "email": "student@uwu.ac.lk",
            "password": "student123",
            "first_name": "Nimal",
            "last_name": "Silva",
            "role": APP_TO_DB_ROLE[UserRole.STUDENT.value]
        },
        {
            "email": "resource@uwu.ac.lk",
            "password": "resource123",
            "first_name": "Resource",
            "last_name": "Manager",
            "role": APP_TO_DB_ROLE[UserRole.RESOURCE_MANAGER.value]
        },
    ]

    created = []

    for user in users_data:

        existing = db.query(User).filter(User.email == user["email"]).first()

        if not existing:

            password = user.pop("password")

            new_user = User(
                **user,
                password_hash=hash_password(password),
                is_active=True
            )

            db.add(new_user)
            created.append((user["email"], password))

    db.commit()

    print("Sample users created")


# -----------------------------
# SYSTEM SETTINGS (DROPDOWNS)
# -----------------------------
def create_system_settings(db: Session):

    settings_data = [
        # Resource Types
        {"category": "RESOURCE_TYPES", "value": "Auditorium"},
        {"category": "RESOURCE_TYPES", "value": "Computer Lab"},
        {"category": "RESOURCE_TYPES", "value": "Lab"},
        {"category": "RESOURCE_TYPES", "value": "Lecture Hall"},
        
        # Locations
        {"category": "LOCATIONS", "value": "A Block"},
        {"category": "LOCATIONS", "value": "ASB (Behind G Canteen)"},
        {"category": "LOCATIONS", "value": "B Block"},
        {"category": "LOCATIONS", "value": "C Block"},
        {"category": "LOCATIONS", "value": "D Block"},
        {"category": "LOCATIONS", "value": "E Block"},
        {"category": "LOCATIONS", "value": "F Block"},
        {"category": "LOCATIONS", "value": "FTS Building"},
        {"category": "LOCATIONS", "value": "G Block"},
        
        # Facilities
        {"category": "FACILITIES", "value": "AC"},
        {"category": "FACILITIES", "value": "Computers"},
        {"category": "FACILITIES", "value": "Fans"},
        {"category": "FACILITIES", "value": "GIS Software"},
        {"category": "FACILITIES", "value": "Huge Space"},
        {"category": "FACILITIES", "value": "Interactive Board"},
        {"category": "FACILITIES", "value": "Main Lecture Theatre"},
        {"category": "FACILITIES", "value": "Smart Board"},
    ]

    for item in settings_data:
        existing = db.query(SystemSetting).filter(
            SystemSetting.category == item["category"],
            SystemSetting.value == item["value"]
        ).first()

        if not existing:
            new_setting = SystemSetting(**item)
            db.add(new_setting)

    db.commit()
    print("System dropdown settings created")


# -----------------------------
# MAIN SEED FUNCTION
# -----------------------------
def seed_database():

    print("Seeding database")

    db = SessionLocal()

    try:

        create_admin_user(db)

        create_sample_users(db)

        create_system_settings(db)

        print("Database seeded successfully")

    except Exception as e:

        print("Seeder error:", str(e))
        db.rollback()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
