"""
University Smart Scheduling System - Main Application
FastAPI Backend Server
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
import uvicorn
import os

# Load environment variables
load_dotenv()

# Import database dependencies
from app.database import get_db, engine
from app.models import Base

# Initialize FastAPI app
app = FastAPI(
    title="Smart Scheduling System API",
    description="Machine Learning Based Smart Scheduling System for University",
    version="1.0.0"
)

# Configure CORS - IMPORTANT for React integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Create a root endpoint
@app.get("/")
def read_root():
    return {
        "message": "Welcome to Smart Scheduling System API",
        "version": "1.0.0",
        "status": "active"
    }


# # Create a test endpoint for ML scheduling
# @app.get("/api/schedule/test")
# def test_schedule():
#     return {
#         "message": "ML Scheduling endpoint is working",
#         "data": {
#             "predicted_schedule": "Sample schedule data",
#             "confidence_score": 0.95
#         }
#     }

# Create a database connection test endpoint
@app.get("/api/db/test")
def test_db_connection(db: Session = Depends(get_db)):
    """Test database connection"""
    try:
        # Try to execute a simple query
        db.execute(text("SELECT 1"))
        return {
            "status": "success",
            "message": "Database connection successful",
            "database": os.getenv("DB_NAME", "university_scheduler")
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}"
        }

# Get database statistics
@app.get("/api/db/stats")
def get_database_stats(db: Session = Depends(get_db)):
    """Get database statistics - count of records in each table"""
    try:
        from app.models.user import User
        from app.models.academic import Faculty, Department, Degree, Batch, Module
        from app.models.resource import Resource
        
        stats = {
            "users": db.query(User).count(),
            "faculties": db.query(Faculty).count(),
            "departments": db.query(Department).count(),
            "degrees": db.query(Degree).count(),
            "batches": db.query(Batch).count(),
            "modules": db.query(Module).count(),
            "resources": db.query(Resource).count(),
        }
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to get statistics: {str(e)}"
        }

# Application startup event
@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    print("=" * 50)
    print("🚀 University Smart Scheduling System API")
    print("=" * 50)
    print(f"📊 Database: {os.getenv('DB_NAME', 'university_scheduler')}")
    print(f"🔧 Debug Mode: {os.getenv('DEBUG', 'False')}")
    print("=" * 50)

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )