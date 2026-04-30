"""
generate_sample_csv.py
──────────────────────
Generates a realistic sample CSV file for testing the StockPredict AI platform.
Run:  python generate_sample_csv.py
Output: sample_stock_data.csv (5 years of AAPL-like data)
"""

import csv
import random
import math
from datetime import date, timedelta

OUTPUT_FILE = "sample_stock_data.csv"
START_DATE  = date(2019, 1, 2)
END_DATE    = date(2024, 12, 31)
INITIAL_PRICE = 157.0


def generate_stock_data():
    rows = []
    price = INITIAL_PRICE
    date_cursor = START_DATE

    while date_cursor <= END_DATE:
        if date_cursor.weekday() >= 5:   # Skip weekends
            date_cursor += timedelta(days=1)
            continue

        # Geometric Brownian Motion
        drift = 0.0003
        volatility = 0.015
        shock = volatility * random.gauss(0, 1)
        change = math.exp(drift + shock)
        price = max(price * change, 1.0)

        open_p  = round(price * random.uniform(0.990, 1.005), 2)
        high_p  = round(price * random.uniform(1.005, 1.025), 2)
        low_p   = round(price * random.uniform(0.975, 0.995), 2)
        close_p = round(price, 2)
        volume  = int(random.uniform(20_000_000, 80_000_000))

        rows.append([date_cursor.strftime("%Y-%m-%d"), open_p, high_p, low_p, close_p, volume])
        date_cursor += timedelta(days=1)

    return rows


if __name__ == "__main__":
    data = generate_stock_data()
    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Open", "High", "Low", "Close", "Volume"])
        writer.writerows(data)
    print(f"✅ Generated {len(data)} rows → {OUTPUT_FILE}")
