import pandas as pd
import numpy as np
from io import BytesIO, StringIO
from fastapi import HTTPException, status
import logging
from typing import Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"Date", "Close"}
OPTIONAL_COLUMNS = {"Open", "High", "Low", "Volume"}


def validate_and_parse_csv(content: bytes) -> pd.DataFrame:
    """
    Parse and validate a CSV file of stock data.
    Expected columns: Date, Open, High, Low, Close, Volume
    """
    try:
        df = pd.read_csv(StringIO(content.decode("utf-8")))
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(StringIO(content.decode("latin-1")))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to decode CSV: {str(e)}",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV format: {str(e)}",
        )

    # Normalize column names
    df.columns = [c.strip().title() for c in df.columns]

    # Check required columns
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required columns: {missing}. Found: {list(df.columns)}",
        )

    # Parse and sort by date
    try:
        df["Date"] = pd.to_datetime(df["Date"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not parse 'Date' column. Use YYYY-MM-DD format.",
        )

    df = df.sort_values("Date").reset_index(drop=True)

    # Convert numeric columns
    numeric_cols = ["Close"] + [c for c in OPTIONAL_COLUMNS if c in df.columns]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows with NaN Close
    before = len(df)
    df = df.dropna(subset=["Close"]).reset_index(drop=True)
    after = len(df)
    if before - after > 0:
        logger.warning(f"Dropped {before - after} rows with NaN Close prices")

    if len(df) < 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Insufficient data. Need at least 100 rows, got {len(df)}.",
        )

    return df


def compute_statistics(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute summary statistics for the stock data."""
    close = df["Close"]
    returns = close.pct_change().dropna()

    stats = {
        "total_records": int(len(df)),
        "date_range": {
            "start": df["Date"].iloc[0].strftime("%Y-%m-%d"),
            "end": df["Date"].iloc[-1].strftime("%Y-%m-%d"),
        },
        "price_stats": {
            "current": round(float(close.iloc[-1]), 4),
            "min": round(float(close.min()), 4),
            "max": round(float(close.max()), 4),
            "mean": round(float(close.mean()), 4),
            "std": round(float(close.std()), 4),
        },
        "returns_stats": {
            "mean_daily_return": round(float(returns.mean() * 100), 4),
            "volatility": round(float(returns.std() * 100), 4),
            "annualized_volatility": round(float(returns.std() * np.sqrt(252) * 100), 4),
            "sharpe_ratio": round(
                float(returns.mean() / returns.std() * np.sqrt(252))
                if returns.std() != 0 else 0.0, 4
            ),
        },
    }

    if "Volume" in df.columns:
        stats["volume_stats"] = {
            "avg_volume": round(float(df["Volume"].mean()), 0),
            "max_volume": round(float(df["Volume"].max()), 0),
        }

    return stats


def df_to_chart_data(df: pd.DataFrame) -> list:
    """Convert DataFrame to list of dicts for chart rendering."""
    df_copy = df.copy()
    df_copy["Date"] = df_copy["Date"].dt.strftime("%Y-%m-%d")

    cols = ["Date", "Close"]
    for c in ["Open", "High", "Low", "Volume"]:
        if c in df_copy.columns:
            cols.append(c)

    return df_copy[cols].fillna(0).to_dict(orient="records")
