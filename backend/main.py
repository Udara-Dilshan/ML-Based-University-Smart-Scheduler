from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

from app.database.connection import initialize_database
from app.routers import (
    auth, user, dashboard, academic,
    resource, lecturer_availability, timetable
)

app = FastAPI(title="University Smart Scheduling System API")


# Combined startup event
@app.on_event("startup")
async def startup_event():
    initialize_database()

    print("=" * 50)
    print("🚀 University Smart Scheduling System API")
    print("=" * 50)
    print(f"📊 Database: {os.getenv('DB_NAME', 'university_scheduler')}")
    print(f"🔧 Debug Mode: {os.getenv('DEBUG', 'False')}")
    print("=" * 50)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(dashboard.router)
app.include_router(academic.router)
app.include_router(resource.router)
app.include_router(lecturer_availability.router)
app.include_router(timetable.router)


@app.get("/")
def read_root():
    return {"message": "API is running successfully"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )