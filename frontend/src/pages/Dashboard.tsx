import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FileUpload from '../components/FileUpload';
import StockChart from '../components/StockChart';
import StatsCards from '../components/StatsCards';
import PredictionTable from '../components/PredictionTable';
import { stockAPI } from '../api/client';
import { UploadResponse, PredictionResponse } from '../types';
import toast from 'react-hot-toast';
import {
  TrendingUp, LogOut, Settings, Cpu, RefreshCw, ChevronDown
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [predResult, setPredResult] = useState<PredictionResponse | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predDays, setPredDays] = useState(30);
  const [retrain, setRetrain] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'stats'>('chart');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpload = (result: UploadResponse) => {
    setUploadResult(result);
    setPredResult(null);
  };

  const handlePredict = async () => {
    if (!uploadResult) return;
    setPredicting(true);
    try {
      toast.loading('Training LSTM model & generating predictions...', {
        id: 'predict-toast',
        duration: 600000,
      });
      const res = await stockAPI.predict(uploadResult.file_id, predDays, retrain);
      setPredResult(res.data);
      toast.success('Predictions ready!', { id: 'predict-toast' });
      setActiveTab('chart');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Prediction failed';
      toast.error(msg, { id: 'predict-toast' });
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="dashboard">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-logo">
          <TrendingUp size={22} />
          <span>StockPredict<span className="accent">AI</span></span>
        </div>
        <div className="navbar-right">
          <span className="navbar-user">👤 {user?.username}</span>
          <button className="icon-btn" title="Logout" onClick={handleLogout} id="logout-btn">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {/* ── Page Title ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              Welcome back, <span className="accent">{user?.username}</span> 👋
            </h1>
            <p className="page-subtitle">
              Upload your stock CSV and let our LSTM model predict future prices
            </p>
          </div>
        </div>

        {/* ── Upload Section ── */}
        <section className="section-card">
          <h2 className="section-card-title">
            <span className="step-badge">1</span> Upload Historical Data
          </h2>
          <FileUpload onUploadComplete={handleUpload} />

          {uploadResult && (
            <div className="upload-success-bar">
              <div className="upload-success-left">
                ✅ <strong>{uploadResult.filename}</strong> uploaded successfully —{' '}
                <strong>{uploadResult.records.toLocaleString()}</strong> records
              </div>
              <div className="upload-success-right">
                <span className="s3-badge">☁️ AWS S3</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Prediction Config ── */}
        {uploadResult && (
          <section className="section-card">
            <h2 className="section-card-title">
              <span className="step-badge">2</span> Configure & Run Predictions
            </h2>
            <div className="pred-config">
              <div className="config-group">
                <label>Prediction Horizon</label>
                <div className="select-wrap">
                  <select
                    value={predDays}
                    onChange={(e) => setPredDays(Number(e.target.value))}
                    id="pred-days-select"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>

              <div className="config-group">
                <label>Model Options</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={retrain}
                    onChange={(e) => setRetrain(e.target.checked)}
                    id="retrain-checkbox"
                  />
                  Force Retrain Model
                </label>
              </div>

              <button
                className="btn-predict"
                onClick={handlePredict}
                disabled={predicting}
                id="run-predict-btn"
              >
                {predicting ? (
                  <>
                    <span className="spinner" />
                    Training LSTM...
                  </>
                ) : (
                  <>
                    <Cpu size={16} />
                    Run LSTM Prediction
                  </>
                )}
              </button>

              {predResult && (
                <button
                  className="btn-secondary"
                  onClick={handlePredict}
                  disabled={predicting}
                  id="refresh-predict-btn"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Results Section ── */}
        {predResult && (
          <section className="section-card results-section">
            <div className="results-tabs">
              {(['chart', 'table', 'stats'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  id={`tab-${tab}`}
                >
                  {tab === 'chart' ? '📈 Chart' : tab === 'table' ? '📋 Predictions' : '📊 Statistics'}
                </button>
              ))}
            </div>

            <div className="results-content">
              {activeTab === 'chart' && <StockChart data={predResult} />}
              {activeTab === 'table' && <PredictionTable data={predResult} />}
              {activeTab === 'stats' && (
                <StatsCards
                  statistics={predResult.statistics}
                  metrics={predResult.model_metrics}
                  trainingInfo={predResult.training_info}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {!uploadResult && (
          <div className="empty-state">
            <div className="empty-icon">📈</div>
            <h3>Ready to Predict?</h3>
            <p>Upload a CSV file with historical stock data to get started</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
