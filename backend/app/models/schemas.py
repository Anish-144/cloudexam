from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Auth Models ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


# ── Upload Models ─────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    s3_uri: str
    records: int
    columns: List[str]
    statistics: Dict[str, Any]
    message: str


# ── Prediction Models ─────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    file_id: str
    prediction_days: int = Field(default=30, ge=7, le=90)
    retrain: bool = Field(default=False)


class PredictionDataPoint(BaseModel):
    date: str
    predicted_price: float
    lower_bound: float
    upper_bound: float


class HistoricalDataPoint(BaseModel):
    date: str
    close: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None


class PredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    file_id: str
    ticker: Optional[str] = None
    historical_data: List[HistoricalDataPoint]
    predictions: List[PredictionDataPoint]
    model_metrics: Dict[str, Any]
    training_info: Dict[str, Any]
    statistics: Dict[str, Any]
    generated_at: str


# ── Health Models ─────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
