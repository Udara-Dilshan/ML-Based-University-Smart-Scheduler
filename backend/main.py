from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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
    return {"message": "Welcome to Smart Scheduling System API"}


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
def test_db_connection():
    return {
        "database": "MySQL connection test",
        "status": "Configured for ML data storage"
    }

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )