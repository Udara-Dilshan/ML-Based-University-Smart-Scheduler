"""
Seeder script to populate database with initial data
Run: python seed_data.py
"""

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.academic import Faculty, Department, Degree, Batch
from app.utils.auth import hash_password
import sys


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
        role=UserRole.SUPER_ADMIN,
        contact_number="+94712345678",
        is_active=True
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    print("Admin user created")
    return admin


# -----------------------------
# FACULTIES
# -----------------------------
def create_sample_faculties(db: Session):

    faculties_data = [
        {"name": "Faculty of Animal Science and Export Agriculture"},
        {"name": "Faculty of Applied Sciences"},
        {"name": "Faculty of Management"},
        {"name": "Faculty of Technological Studies"},

    ]

    created = []

    for data in faculties_data:

        existing = db.query(Faculty).filter(Faculty.name == data["name"]).first()

        if not existing:
            faculty = Faculty(**data)
            db.add(faculty)
            created.append(faculty)

    db.commit()

    if created:
        print(f"{len(created)} faculties created")
    else:
        print("Faculties already exist")

    return db.query(Faculty).all()


# -----------------------------
# DEPARTMENTS
# -----------------------------
def create_sample_departments(db: Session, faculties):

    faculty_map = {f.name: f for f in faculties}

    departments_data = [

        # Animal Science and Export Agriculture
        {"name": "Department of Animal Science", "faculty_id": faculty_map["Faculty of Animal Science and Export Agriculture"].faculty_id},
        {"name": "Department of Export Agriculture", "faculty_id": faculty_map["Faculty of Animal Science and Export Agriculture"].faculty_id},

        # Applied Sciences
        {"name": "Department of Computer Science and Informatics", "faculty_id": faculty_map["Faculty of Applied Sciences"].faculty_id},
        {"name": "Department of Science and Technology", "faculty_id": faculty_map["Faculty of Applied Sciences"].faculty_id},
        {"name": "Department of Applied Earth Sciences", "faculty_id": faculty_map["Faculty of Applied Sciences"].faculty_id},

        # Management
        {"name": "Department of Management Sciences", "faculty_id": faculty_map["Faculty of Management"].faculty_id},
        {"name": "Department of Tourism Studies", "faculty_id": faculty_map["Faculty of Management"].faculty_id},

        # Technological Studies
        {"name": "Department of Biosystems Technology", "faculty_id": faculty_map["Faculty of Technological Studies"].faculty_id},
        {"name": "Department of Engineering Technology", "faculty_id": faculty_map["Faculty of Technological Studies"].faculty_id},
        {"name": "Department of Information and Communication Technology", "faculty_id": faculty_map["Faculty of Technological Studies"].faculty_id},
    ]

    created = []

    for dept in departments_data:

        existing = db.query(Department).filter(Department.name == dept["name"]).first()

        if not existing:
            department = Department(**dept)
            db.add(department)
            created.append(department)

    db.commit()

    if created:
        print(f"{len(created)} departments created")
    else:
        print("Departments already exist")

    return db.query(Department).all()


# -----------------------------
# DEGREE PROGRAMS
# -----------------------------
def create_sample_degrees(db: Session):

    degrees_data = [

        {"name": "BSc Animal Production and Food Technology", "code": "APFT"},
        {"name": "BSc Export Agriculture", "code": "EAG"},
        {"name": "BSc Aquatic Resources Technology", "code": "AQT"},
        {"name": "BSc Computer Science and Technology", "code": "CST"},
        {"name": "BSc Science and Technology", "code": "SCT"},
        {"name": "BSc Mineral Resources and Technology", "code": "MRT"},
        {"name": "Bachelor of Industrial Information Technology", "code": "IIT"},
        {"name": "BBM Entrepreneurship and Management", "code": "EMG"},
        {"name": "BBM Hospitality Tourism and Events Management", "code": "HTE"},
        {"name": "Bachelor of Information and Communication Technology", "code": "BICT"},
        {"name": "Bachelor of Engineering Technology", "code": "BET"},
        {"name": "Bachelor of Biosystems Technology", "code": "BST"},
    ]

    created = []

    for degree in degrees_data:

        existing = db.query(Degree).filter(Degree.code == degree["code"]).first()

        if not existing:
            d = Degree(**degree)
            db.add(d)
            created.append(d)

    db.commit()

    if created:
        print(f"{len(created)} degrees created")
    else:
        print("Degrees already exist")


# -----------------------------
# BATCHES
# -----------------------------
def create_sample_batches(db: Session):

    batches = [
        {"year": 2021},
        {"year": 2022},
        {"year": 2023},
        {"year": 2024},
        {"year": 2025},
    ]

    for batch in batches:

        existing = db.query(Batch).filter(Batch.year == batch["year"]).first()

        if not existing:
            db.add(Batch(**batch))

    db.commit()

    print("Batches seeded")


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
            "role": UserRole.SCHEDULER
        },
        {
            "email": "lecturer@uwu.ac.lk",
            "password": "lecturer123",
            "first_name": "Kasun",
            "last_name": "Perera",
            "role": UserRole.LECTURER
        },
        {
            "email": "student@uwu.ac.lk",
            "password": "student123",
            "first_name": "Nimal",
            "last_name": "Silva",
            "role": UserRole.STUDENT
        },
        {
            "email": "resource@uwu.ac.lk",
            "password": "resource123",
            "first_name": "Resource",
            "last_name": "Manager",
            "role": UserRole.RESOURCE_MANAGER
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
# MAIN SEED FUNCTION
# -----------------------------
def seed_database():

    print("Seeding database")

    db = SessionLocal()

    try:

        create_admin_user(db)

        faculties = create_sample_faculties(db)

        create_sample_departments(db, faculties)

        # Skip degrees and batches for now - they need more complex setup
        # create_sample_degrees(db)
        # create_sample_batches(db)

        create_sample_users(db)

        print("Database seeded successfully")

    except Exception as e:

        print("Seeder error:", str(e))
        db.rollback()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()