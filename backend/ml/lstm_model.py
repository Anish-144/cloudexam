import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
import os
import logging
import pickle
from datetime import datetime, timedelta
from typing import Tuple, List, Dict, Any, Optional
from io import BytesIO

logger = logging.getLogger(__name__)


class StockLSTMModel:
    """LSTM-based stock price prediction model."""

    def __init__(self, lookback: int = 60, prediction_days: int = 30):
        self.lookback = lookback
        self.prediction_days = prediction_days
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model: Optional[Sequential] = None
        self.is_trained = False

    def _build_model(self, input_shape: Tuple[int, int]) -> Sequential:
        """Build a stacked LSTM model with dropout regularization."""
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=input_shape),
            BatchNormalization(),
            Dropout(0.2),

            LSTM(64, return_sequences=True),
            BatchNormalization(),
            Dropout(0.2),

            LSTM(32, return_sequences=False),
            BatchNormalization(),
            Dropout(0.1),

            Dense(32, activation="relu"),
            Dropout(0.1),
            Dense(16, activation="relu"),
            Dense(1),
        ])

        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss="mean_squared_error",
            metrics=["mae"],
        )
        return model

    def preprocess(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Scale data and create supervised sequences."""
        close_prices = df["Close"].values.reshape(-1, 1)
        scaled = self.scaler.fit_transform(close_prices)

        X, y = [], []
        for i in range(self.lookback, len(scaled)):
            X.append(scaled[i - self.lookback: i, 0])
            y.append(scaled[i, 0])

        return np.array(X), np.array(y)

    def train(
        self,
        df: pd.DataFrame,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.1,
    ) -> Dict[str, Any]:
        """Train the LSTM model on historical stock data."""
        logger.info(f"Starting LSTM training on {len(df)} records")

        X, y = self.preprocess(df)
        X = X.reshape((X.shape[0], X.shape[1], 1))

        self.model = self._build_model((self.lookback, 1))

        callbacks = [
            EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6),
        ]

        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=callbacks,
            verbose=1,
        )

        self.is_trained = True
        train_loss = history.history["loss"][-1]
        val_loss = history.history.get("val_loss", [None])[-1]

        logger.info(f"Training complete. train_loss={train_loss:.6f}, val_loss={val_loss}")
        return {
            "epochs_run": len(history.history["loss"]),
            "final_train_loss": round(float(train_loss), 6),
            "final_val_loss": round(float(val_loss), 6) if val_loss else None,
        }

    def predict_future(
        self, df: pd.DataFrame, days: int = 30
    ) -> Tuple[List[float], List[str]]:
        """Predict the next `days` closing prices."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        close_prices = df["Close"].values.reshape(-1, 1)
        scaled = self.scaler.transform(close_prices)

        # Use the last `lookback` days as the seed sequence
        last_sequence = scaled[-self.lookback:].reshape(1, self.lookback, 1)

        predictions_scaled = []
        current_seq = last_sequence.copy()

        for _ in range(days):
            pred = self.model.predict(current_seq, verbose=0)[0, 0]
            predictions_scaled.append(pred)
            current_seq = np.roll(current_seq, -1, axis=1)
            current_seq[0, -1, 0] = pred

        # Inverse transform
        predictions_scaled = np.array(predictions_scaled).reshape(-1, 1)
        predictions = self.scaler.inverse_transform(predictions_scaled).flatten().tolist()

        # Generate future dates (skip weekends)
        last_date = pd.to_datetime(df["Date"].iloc[-1])
        future_dates = []
        current = last_date
        while len(future_dates) < days:
            current += timedelta(days=1)
            if current.weekday() < 5:  # Mon-Fri only
                future_dates.append(current.strftime("%Y-%m-%d"))

        return predictions, future_dates

    def evaluate(self, df: pd.DataFrame) -> Dict[str, float]:
        """Evaluate model accuracy on test split."""
        X, y = self.preprocess(df)
        split = int(len(X) * 0.8)
        X_test, y_test = X[split:], y[split:]
        X_test = X_test.reshape((X_test.shape[0], X_test.shape[1], 1))

        y_pred = self.model.predict(X_test, verbose=0).flatten()

        # Inverse transform
        y_test_actual = self.scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        y_pred_actual = self.scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()

        rmse = float(np.sqrt(mean_squared_error(y_test_actual, y_pred_actual)))
        mae = float(mean_absolute_error(y_test_actual, y_pred_actual))
        mape = float(
            np.mean(np.abs((y_test_actual - y_pred_actual) / y_test_actual)) * 100
        )

        return {"rmse": round(rmse, 4), "mae": round(mae, 4), "mape": round(mape, 4)}

    def save(self, path: str) -> None:
        """Save model and scaler to disk."""
        os.makedirs(path, exist_ok=True)
        self.model.save(os.path.join(path, "lstm_model.keras"))
        with open(os.path.join(path, "scaler.pkl"), "wb") as f:
            pickle.dump(self.scaler, f)
        logger.info(f"Model saved to {path}")

    def load(self, path: str) -> None:
        """Load model and scaler from disk."""
        model_path = os.path.join(path, "lstm_model.keras")
        scaler_path = os.path.join(path, "scaler.pkl")
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.model = load_model(model_path)
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
            self.is_trained = True
            logger.info(f"Model loaded from {path}")
        else:
            raise FileNotFoundError(f"No saved model found at {path}")
