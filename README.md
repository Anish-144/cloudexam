# 📈 StockPredict AI

A full-stack, production-ready stock market prediction platform powered by **LSTM deep learning**, **FastAPI**, **React**, and **AWS S3**.

---

## 🏗️ Architecture

```
stock-market-app/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py         # JWT authentication endpoints
│   │   │   └── stock.py        # Upload & prediction endpoints
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic settings / env vars
│   │   │   └── security.py     # JWT creation & validation
│   │   ├── models/
│   │   │   └── schemas.py      # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── s3_service.py   # AWS S3 integration (boto3)
│   │   │   └── data_processor.py # CSV validation & statistics
│   │   └── main.py             # FastAPI app factory
│   ├── ml/
│   │   └── lstm_model.py       # LSTM model (TF/Keras)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── api/client.ts       # Axios API client with JWT interceptors
│   │   ├── components/
│   │   │   ├── FileUpload.tsx  # Drag-and-drop CSV uploader
│   │   │   ├── StockChart.tsx  # Recharts historical + prediction chart
│   │   │   ├── PredictionTable.tsx
│   │   │   └── StatsCards.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Global auth state
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx    # Login / Register
│   │   │   └── Dashboard.tsx   # Main dashboard
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── index.css           # Dark-mode design system
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── generate_sample_csv.py      # Generate test data
└── .env.example
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- AWS account with S3 bucket (or use mock mode)

### 1. Clone & Configure

```bash
cd stock-market-app
cp .env.example .env
# Edit .env with your AWS credentials and a strong SECRET_KEY
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # Add your AWS keys here too
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App: http://localhost:3000

### 4. Generate Sample Test Data

```bash
python generate_sample_csv.py
# Creates: sample_stock_data.csv (5 years of simulated data)
```

---

## 🐳 Docker Deployment

### Local Docker Compose

```bash
# Copy and fill env file
cp .env.example .env

# Build and start all containers
docker-compose up --build

# App runs at http://localhost:80
# API docs at http://localhost:8000/docs
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing secret (min 32 chars) | ✅ |
| `AWS_ACCESS_KEY_ID` | AWS access key | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | ✅ |
| `AWS_REGION` | AWS region (default: us-east-1) | ✅ |
| `S3_BUCKET_NAME` | S3 bucket name | ✅ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry (default: 30) | ❌ |
| `MAX_FILE_SIZE_MB` | Max upload size (default: 50) | ❌ |

---

## ☁️ AWS EC2 Deployment

### 1. Launch EC2 Instance
- AMI: Amazon Linux 2023 (or Ubuntu 22.04)
- Instance: `t3.medium` (minimum; `t3.large` for faster training)
- Security Groups: Open ports 80, 443, 22

### 2. Install Docker
```bash
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo usermod -a -G docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Deploy
```bash
git clone <your-repo> stock-market-app
cd stock-market-app
cp .env.example .env && nano .env   # Fill in credentials
docker-compose up -d --build
```

### 4. Create S3 Bucket
```bash
aws s3 mb s3://your-bucket-name --region us-east-1
# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket your-bucket-name \
  --versioning-configuration Status=Enabled
```

---

## 📊 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | ❌ | Register user |
| POST | `/api/v1/auth/token` | ❌ | Login → JWT token |
| GET  | `/api/v1/auth/me` | ✅ | Current user |
| POST | `/api/v1/stock/upload` | ✅ | Upload CSV → S3 |
| POST | `/api/v1/stock/predict` | ✅ | Run LSTM prediction |
| GET  | `/api/v1/stock/files` | ✅ | List uploaded files |
| GET  | `/api/v1/stock/files/{id}/stats` | ✅ | File statistics |

---

## 🧠 ML Model Details

- **Architecture**: 3-layer stacked LSTM (128 → 64 → 32 units) with BatchNorm + Dropout
- **Optimizer**: Adam with ReduceLROnPlateau scheduler
- **Early Stopping**: Patience=10 on validation loss
- **Input**: Last 60 trading days (configurable)
- **Output**: Next 7–90 day predictions with confidence bands
- **Preprocessing**: MinMax scaling (0–1), skip-weekend date generation
- **Metrics**: RMSE, MAE, MAPE reported per prediction

---

## 📋 CSV Format

```csv
Date,Open,High,Low,Close,Volume
2020-01-02,296.24,300.60,295.19,300.35,33870100
2020-01-03,297.15,300.12,296.00,298.50,28000000
...
```

- **Date**: YYYY-MM-DD format
- **Close** column is mandatory; others are optional
- Minimum **100 rows** required
- Maximum **50 MB** file size

---

## 🔒 Security Features

- JWT authentication (configurable expiry)
- bcrypt password hashing
- File type & size validation
- S3 server-side encryption (AES256)
- CORS origin whitelist
- Input sanitization on all endpoints

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Charts | Recharts |
| Styling | Vanilla CSS (dark mode) |
| HTTP Client | Axios |
| Backend | FastAPI + Uvicorn |
| ML | TensorFlow 2.15 / Keras LSTM |
| Data | Pandas, NumPy, scikit-learn |
| Auth | JWT (python-jose) + bcrypt |
| Cloud | AWS S3 (boto3) |
| Container | Docker + Docker Compose |
| Web Server | Nginx (reverse proxy) |
