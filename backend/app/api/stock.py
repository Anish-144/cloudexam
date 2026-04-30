import uuid
import os
import logging
from datetime import datetime
from typing import Optional
import numpy as np

from fastapi import (
    APIRouter, UploadFile, File, Depends, HTTPException, status, Form
)
from app.core.security import get_current_user
from app.core.config import get_settings
from app.services.s3_service import upload_file_to_s3, download_file_from_s3
from app.services.data_processor import (
    validate_and_parse_csv, compute_statistics, df_to_chart_data
)
from app.models.schemas import (
    UploadResponse, PredictionRequest, PredictionResponse,
    PredictionDataPoint, HistoricalDataPoint
)
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))
from ml.lstm_model import StockLSTMModel

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/stock", tags=["Stock Predictions"])

# In-memory store for uploaded file metadata (use a real DB in production)
FILE_STORE: dict = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a CSV file of historical stock data.
    - Validates file type and size
    - Stores the file in AWS S3
    - Returns parsed statistics
    """
    # Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted.",
        )

    content = await file.read()

    # Validate file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB.",
        )

    # Parse and validate CSV
    df = validate_and_parse_csv(content)

    # Generate unique file ID and S3 key
    file_id = str(uuid.uuid4())
    username = current_user["username"]
    s3_key = f"uploads/{username}/{file_id}/{file.filename}"

    # Upload to S3
    s3_uri = upload_file_to_s3(content, s3_key, content_type="text/csv")

    # Store metadata
    stats = compute_statistics(df)
    FILE_STORE[file_id] = {
        "file_id": file_id,
        "filename": file.filename,
        "s3_key": s3_key,
        "s3_uri": s3_uri,
        "username": username,
        "records": len(df),
        "columns": list(df.columns),
        "statistics": stats,
        "uploaded_at": datetime.utcnow().isoformat(),
    }

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        s3_uri=s3_uri,
        records=len(df),
        columns=list(df.columns),
        statistics=stats,
        message="File uploaded successfully. Use /predict to run LSTM predictions.",
    )


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: PredictionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Run LSTM predictions on a previously uploaded stock CSV.
    - Downloads data from S3
    - Trains or loads LSTM model
    - Returns predictions with confidence bands
    """
    file_meta = FILE_STORE.get(request.file_id)
    if not file_meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File ID '{request.file_id}' not found. Upload a CSV first.",
        )

    # Ensure ownership
    if file_meta["username"] != current_user["username"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Download from S3
    csv_bytes = download_file_from_s3(file_meta["s3_key"])
    df = validate_and_parse_csv(csv_bytes)

    # Train LSTM model
    lstm = StockLSTMModel(
        lookback=settings.LOOKBACK_DAYS,
        prediction_days=request.prediction_days,
    )

    model_path = os.path.join(settings.MODEL_SAVE_PATH, request.file_id)
    if not request.retrain and os.path.exists(model_path):
        try:
            lstm.load(model_path)
            training_info = {"status": "loaded_from_cache", "epochs_run": 0}
        except Exception:
            training_info = lstm.train(df)
            lstm.save(model_path)
    else:
        training_info = lstm.train(df)
        lstm.save(model_path)

    # Evaluate on test split
    metrics = lstm.evaluate(df)

    # Generate predictions
    predictions_vals, future_dates = lstm.predict_future(df, days=request.prediction_days)

    # Add confidence interval (±1 std of recent residuals * growth factor)
    volatility = float(df["Close"].pct_change().std() * df["Close"].iloc[-1])
    pred_points = []
    for i, (d, p) in enumerate(zip(future_dates, predictions_vals)):
        uncertainty = volatility * (1 + i * 0.03)
        pred_points.append(
            PredictionDataPoint(
                date=d,
                predicted_price=round(p, 4),
                lower_bound=round(max(0, p - uncertainty), 4),
                upper_bound=round(p + uncertainty, 4),
            )
        )

    # Historical data for chart
    hist_records = df_to_chart_data(df)
    historical = [
        HistoricalDataPoint(
            date=r["Date"],
            close=r["Close"],
            open=r.get("Open"),
            high=r.get("High"),
            low=r.get("Low"),
            volume=r.get("Volume"),
        )
        for r in hist_records
    ]

    return PredictionResponse(
        file_id=request.file_id,
        historical_data=historical,
        predictions=pred_points,
        model_metrics=metrics,
        training_info=training_info,
        statistics=file_meta["statistics"],
        generated_at=datetime.utcnow().isoformat() + "Z",
    )


@router.get("/files")
async def list_uploaded_files(current_user: dict = Depends(get_current_user)):
    """List all files uploaded by the current user."""
    user_files = [
        {
            "file_id": v["file_id"],
            "filename": v["filename"],
            "records": v["records"],
            "uploaded_at": v["uploaded_at"],
        }
        for v in FILE_STORE.values()
        if v["username"] == current_user["username"]
    ]
    return {"files": user_files, "count": len(user_files)}


@router.get("/files/{file_id}/stats")
async def get_file_stats(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get detailed statistics for a specific uploaded file."""
    file_meta = FILE_STORE.get(file_id)
    if not file_meta or file_meta["username"] != current_user["username"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    return file_meta["statistics"]
