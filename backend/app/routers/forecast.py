from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import pickle
import os
import json
from datetime import datetime, timedelta
from typing import List, Dict

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

class ForecastRequest(BaseModel):
    start_date: str
    end_date: str

class ForecastResponse(BaseModel):
    date: str
    total_predicted: int
    breakdown: Dict[str, int]

def load_model():
    model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "vehicle_demand_model.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=500, detail="Prediction model not found. Please train the model first.")
    with open(model_path, 'rb') as f:
        return pickle.load(f)

@router.post("/vehicles", response_model=List[ForecastResponse])
def forecast_vehicles(request: ForecastRequest):
    try:
        start = datetime.strptime(request.start_date, "%Y-%m-%d").date()
        end = datetime.strptime(request.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before end date.")
        
    delta = end - start
    if delta.days > 365:
        raise HTTPException(status_code=400, detail="Date range too large. Maximum 365 days allowed.")

    model = load_model()
    # the target columns we trained on
    valid_types = ['Car', 'Van', 'Mini Bus', 'Bus', 'Truck']
    
    predictions = []
    
    for i in range(delta.days + 1):
        current_date = start + timedelta(days=i)
        
        # Extract features matching the model
        day_of_week = current_date.weekday()
        month = current_date.month
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Prepare input for model
        input_data = pd.DataFrame([{
            'DayOfWeek': day_of_week,
            'Month': month,
            'IsWeekend': is_weekend
        }])
        
        # Predict
        pred_array = model.predict(input_data)[0]
        
        breakdown = {}
        total = 0
        for idx, v_type in enumerate(valid_types):
            count = max(0, int(round(pred_array[idx])))
            breakdown[v_type] = count
            total += count
        
        predictions.append(ForecastResponse(
            date=current_date.isoformat(),
            total_predicted=total,
            breakdown=breakdown
        ))
        
    return predictions

@router.get("/metrics")
def get_model_metrics():
    metrics_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "metrics.json")
    if not os.path.exists(metrics_path):
        return {"confidence_score": 0, "raw_r2": 0}
        
    with open(metrics_path, 'r') as f:
        return json.load(f)

