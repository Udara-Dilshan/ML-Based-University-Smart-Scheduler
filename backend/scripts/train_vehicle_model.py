import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import pickle
import os
import json

def train_model():
    # 1. Load Real Data
    csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'vehicle_requests_2021_2025.csv')
    print(f"Loading data from {csv_path}...")
    
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print("Dataset not found!")
        return
        
    print("Preprocessing data...")
    # 2. Clean Data (filter rejected/cancelled)
    df = df[~df['status'].isin(['REJECTED', 'CANCELLED'])]
    
    # 3. Handle Dates
    df['trip_date'] = pd.to_datetime(df['trip_date'], format='mixed', errors='coerce')
    df = df.dropna(subset=['trip_date'])
    
    # 4. Group by trip_date and vehicle_type_needed
    valid_types = ['Car', 'Van', 'Mini Bus', 'Bus', 'Truck']
    df['vehicle_type_needed'] = df['vehicle_type_needed'].apply(
        lambda x: x if x in valid_types else 'Other'
    )
    
    daily_demand = df.groupby(['trip_date', 'vehicle_type_needed']).size().reset_index(name='count')
    
    # Pivot to have vehicle types as columns
    pivot_df = daily_demand.pivot(index='trip_date', columns='vehicle_type_needed', values='count').fillna(0).reset_index()
    
    # Ensure all valid vehicle types exist as columns
    for v_type in valid_types:
        if v_type not in pivot_df.columns:
            pivot_df[v_type] = 0
            
    # Extract Date Features
    pivot_df['DayOfWeek'] = pivot_df['trip_date'].dt.dayofweek
    pivot_df['Month'] = pivot_df['trip_date'].dt.month
    pivot_df['IsWeekend'] = pivot_df['DayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)
    
    # 5. Define Features (X) and Targets (Y)
    X = pivot_df[['DayOfWeek', 'Month', 'IsWeekend']]
    Y = pivot_df[valid_types]
    
    # 6. Train Test Split to compute realistic R2 score
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42)
    
    print("Training Multi-Output Random Forest Regressor...")
    base_model = RandomForestRegressor(n_estimators=100, random_state=42)
    model = MultiOutputRegressor(base_model)
    
    # Train on the training set
    model.fit(X_train, Y_train)
    
    # 7. Calculate Honest Metrics on Test Set
    Y_pred_test = model.predict(X_test)
    raw_r2 = r2_score(Y_test, Y_pred_test)
    mae = mean_absolute_error(Y_test, Y_pred_test)
    
    # Re-train on full dataset for maximum real-world prediction accuracy
    model.fit(X, Y)
    
    # Ensure models directory exists
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Save Model
    model_path = os.path.join(models_dir, 'vehicle_demand_model.pkl')
    print(f"Saving multi-output model to {model_path}...")
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    # Save Metrics
    metrics_path = os.path.join(models_dir, 'metrics.json')
    print(f"Saving metrics to {metrics_path}...")
    with open(metrics_path, 'w') as f:
        json.dump({
            "mae": round(mae, 2),
            "raw_r2": round(raw_r2, 4),
            "last_trained": pd.Timestamp.now().isoformat()
        }, f)
        
    print(f"Training complete! Test MAE: {mae:.2f}")

if __name__ == "__main__":
    train_model()
