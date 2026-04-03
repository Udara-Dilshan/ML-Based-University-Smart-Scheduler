from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.academic import Batch, Degree, Department, Faculty, Module
from ..utils.db_errors import commit_delete_or_raise
from ..utils.dependencies import require_admin_user

router = APIRouter(
    prefix="/academic",
    tags=["academic"],
    dependencies=[Depends(require_admin_user)],
)


class FacultyBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    dean_name: Optional[str] = None


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    dean_name: Optional[str] = None


class FacultyOut(BaseModel):
    faculty_id: int
    name: str
    code: Optional[str] = None
    dean_name: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    faculty_id: int


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    faculty_id: Optional[int] = None


class DepartmentOut(DepartmentBase):
    dept_id: int
    faculty: FacultyOut

    class Config:
        from_attributes = True


class ModuleBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    dept_id: int
    credits: int = Field(gt=0)


class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    dept_id: Optional[int] = None
    credits: Optional[int] = Field(default=None, gt=0)


class ModuleOut(ModuleBase):
    module_id: int
    department: DepartmentOut

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_code: str = Field(min_length=1)
    degree_id: int
    student_count: int = Field(ge=0)
    current_semester: int = Field(gt=0)


class BatchUpdate(BaseModel):
    batch_code: Optional[str] = None
    degree_id: Optional[int] = None
    student_count: Optional[int] = Field(default=None, ge=0)
    current_semester: Optional[int] = Field(default=None, gt=0)


class DegreeBase(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    dept_id: int
    duration_years: int = Field(gt=0)


class DegreeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    dept_id: Optional[int] = None
    duration_years: Optional[int] = Field(default=None, gt=0)


class DegreeOut(BaseModel):
    degree_id: int
    code: str
    dept_id: int
    name: str
    duration_years: int

    class Config:
        from_attributes = True


class BatchOut(BatchBase):
    batch_id: int
    degree_id: int
    student_count: int
    current_semester: int
    name: str
    academic_year: int
    degree: Optional[DegreeOut] = None

    class Config:
        from_attributes = True


@router.post("/faculties", response_model=FacultyOut, status_code=status.HTTP_201_CREATED)
def create_faculty(payload: FacultyBase, db: Session = Depends(get_db)):
    duplicate = (
        db.query(Faculty)
        .filter((Faculty.code == payload.code) | (Faculty.name == payload.name))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Faculty name or code already exists")

    item = Faculty(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        dean_name=payload.dean_name.strip() if payload.dean_name else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/faculties", response_model=List[FacultyOut])
def get_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).order_by(Faculty.name.asc()).all()


@router.put("/faculties/{faculty_id}", response_model=FacultyOut)
def update_faculty(faculty_id: int, payload: FacultyUpdate, db: Session = Depends(get_db)):
    item = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Faculty not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()
    if "dean_name" in data and data["dean_name"]:
        data["dean_name"] = data["dean_name"].strip()

    if "name" in data or "code" in data:
        duplicate_query = db.query(Faculty).filter(Faculty.faculty_id != faculty_id)
        if "name" in data:
            duplicate_query = duplicate_query.filter(Faculty.name == data["name"])
            if duplicate_query.first():
                raise HTTPException(status_code=409, detail="Faculty name already exists")
        if "code" in data:
            duplicate_query = db.query(Faculty).filter(
                Faculty.code == data["code"], Faculty.faculty_id != faculty_id
            )
            if duplicate_query.first():
                raise HTTPException(status_code=409, detail="Faculty code already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/faculties/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    item = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Faculty not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete faculty because it is linked to other records. Delete dependent departments first.")


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentBase, db: Session = Depends(get_db)):
    faculty = db.query(Faculty).filter(Faculty.faculty_id == payload.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    duplicate = (
        db.query(Department)
        .filter((Department.code == payload.code) | (Department.name == payload.name))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Department name or code already exists")

    item = Department(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        faculty_id=payload.faculty_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/degrees", response_model=List[DegreeOut])
def get_degrees(db: Session = Depends(get_db)):
    return db.query(Degree).order_by(Degree.name.asc()).all()


@router.post("/degrees", response_model=DegreeOut, status_code=status.HTTP_201_CREATED)
def create_degree(payload: DegreeBase, db: Session = Depends(get_db)):
    department = db.query(Department).filter(Department.dept_id == payload.dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    code = payload.code.strip().upper()
    duplicate_code = db.query(Degree).filter(Degree.code == code).first()
    if duplicate_code:
        raise HTTPException(status_code=409, detail="Degree code already exists")

    duplicate = db.query(Degree).filter(
        Degree.name == payload.name.strip(),
        Degree.dept_id == payload.dept_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Degree already exists in this department")

    item = Degree(
        code=code,
        name=payload.name.strip(),
        dept_id=payload.dept_id,
        duration_years=payload.duration_years,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/degrees/{degree_id}", response_model=DegreeOut)
def update_degree(degree_id: int, payload: DegreeUpdate, db: Session = Depends(get_db)):
    item = db.query(Degree).filter(Degree.degree_id == degree_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Degree not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()
    if "dept_id" in data:
        department = db.query(Department).filter(Department.dept_id == data["dept_id"]).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    if "code" in data:
        duplicate_code = db.query(Degree).filter(
            Degree.degree_id != degree_id,
            Degree.code == data["code"],
        ).first()
        if duplicate_code:
            raise HTTPException(status_code=409, detail="Degree code already exists")

    target_name = data.get("name", item.name)
    target_dept = data.get("dept_id", item.dept_id)
    duplicate = db.query(Degree).filter(
        Degree.degree_id != degree_id,
        Degree.name == target_name,
        Degree.dept_id == target_dept,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Degree already exists in this department")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/degrees/{degree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_degree(degree_id: int, db: Session = Depends(get_db)):
    item = db.query(Degree).filter(Degree.degree_id == degree_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Degree not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete degree because it is linked to batches or other records.")


@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.name.asc()).all()


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    item = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Department not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()

    if "faculty_id" in data:
        faculty = db.query(Faculty).filter(Faculty.faculty_id == data["faculty_id"]).first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")

    if "code" in data:
        duplicate = db.query(Department).filter(
            Department.code == data["code"], Department.dept_id != dept_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Department code already exists")

    if "name" in data:
        duplicate = db.query(Department).filter(
            Department.name == data["name"], Department.dept_id != dept_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Department name already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    item = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete department because it is linked to other records. Delete dependent courses or batches first.")


@router.post("/modules", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
def create_module(payload: ModuleBase, db: Session = Depends(get_db)):
    department = db.query(Department).filter(Department.dept_id == payload.dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    duplicate = db.query(Module).filter((Module.code == payload.code) | (Module.name == payload.name))
    if duplicate.first():
        raise HTTPException(status_code=409, detail="Course name or code already exists")

    item = Module(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        dept_id=payload.dept_id,
        credits=payload.credits,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/modules", response_model=List[ModuleOut])
def get_modules(db: Session = Depends(get_db)):
    return db.query(Module).order_by(Module.name.asc()).all()


@router.put("/modules/{module_id}", response_model=ModuleOut)
def update_module(module_id: int, payload: ModuleUpdate, db: Session = Depends(get_db)):
    item = db.query(Module).filter(Module.module_id == module_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Course not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()

    if "dept_id" in data:
        department = db.query(Department).filter(Department.dept_id == data["dept_id"]).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    if "code" in data:
        duplicate = db.query(Module).filter(
            Module.code == data["code"], Module.module_id != module_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Course code already exists")

    if "name" in data:
        duplicate = db.query(Module).filter(
            Module.name == data["name"], Module.module_id != module_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Course name already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(module_id: int, db: Session = Depends(get_db)):
    item = db.query(Module).filter(Module.module_id == module_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete course because it is linked to other records.")


@router.post("/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchBase, db: Session = Depends(get_db)):
    degree = db.query(Degree).filter(Degree.degree_id == payload.degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    duplicate = db.query(Batch).filter(Batch.batch_code == payload.batch_code.strip()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Batch code already exists")

    item = Batch(
        batch_code=payload.batch_code.strip(),
        degree_id=payload.degree_id,
        student_count=payload.student_count,
        current_semester=payload.current_semester,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/batches", response_model=List[BatchOut])
def get_batches(db: Session = Depends(get_db)):
    return db.query(Batch).order_by(Batch.batch_id.desc()).all()


@router.put("/batches/{batch_id}", response_model=BatchOut)
def update_batch(batch_id: int, payload: BatchUpdate, db: Session = Depends(get_db)):
    item = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Batch not found")

    data = payload.model_dump(exclude_unset=True)
    if "batch_code" in data:
        data["batch_code"] = data["batch_code"].strip()
    if "degree_id" in data:
        degree = db.query(Degree).filter(Degree.degree_id == data["degree_id"]).first()
        if not degree:
            raise HTTPException(status_code=404, detail="Degree not found")

    if "batch_code" in data:
        duplicate = db.query(Batch).filter(
            Batch.batch_code == data["batch_code"], Batch.batch_id != batch_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Batch code already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    item = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete batch because it is linked to other records.")
