from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from pathlib import Path
import numpy as np

app = FastAPI(title="Calgary Housing Price API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://housingpredictor2.vercel.app",
    ],
    allow_credentials=False,  
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path(__file__).with_name("xgb_housing_pipeline.joblib")
pipeline = joblib.load(MODEL_PATH)

class PredictRequest(BaseModel):
    LOG_LAND_SIZE: float
    YEAR_OF_CONSTRUCTION_RANGE: str
    QUADRANT: str
    PROPERTY_TYPE: str

class PredictResponse(BaseModel):
    predicted_price: float

@app.get("/")
def root():
    return {"message": "API running. See /docs. Health: /health. Predict: POST /predict"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    X = pd.DataFrame([req.dict()])
    pred_log = pipeline.predict(X)[0]
    pred_price = float(np.expm1(pred_log))
    return PredictResponse(predicted_price=pred_price)
