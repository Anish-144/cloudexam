import React from 'react';
import { Statistics, ModelMetrics, TrainingInfo } from '../types';
import {
  BarChart2, Target, Activity, TrendingUp, DollarSign, AlertCircle
} from 'lucide-react';

interface StatsCardsProps {
  statistics: Statistics;
  metrics?: ModelMetrics;
  trainingInfo?: TrainingInfo;
}

const StatCard = ({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: color }}>
      {icon}
    </div>
    <div className="stat-info">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  </div>
);

const StatsCards: React.FC<StatsCardsProps> = ({ statistics, metrics, trainingInfo }) => {
  const s = statistics;

  return (
    <div className="stats-section">
      <h3 className="section-title">📊 Market Statistics</h3>
      <div className="stats-grid">
        <StatCard
          icon={<DollarSign size={20} color="#fff" />}
          label="Current Price"
          value={`$${s.price_stats.current.toLocaleString()}`}
          sub={`52W Range: $${s.price_stats.min} – $${s.price_stats.max}`}
          color="linear-gradient(135deg, #6366f1, #8b5cf6)"
        />
        <StatCard
          icon={<Activity size={20} color="#fff" />}
          label="Daily Volatility"
          value={`${s.returns_stats.volatility.toFixed(2)}%`}
          sub={`Ann. Vol: ${s.returns_stats.annualized_volatility.toFixed(2)}%`}
          color="linear-gradient(135deg, #f59e0b, #ef4444)"
        />
        <StatCard
          icon={<TrendingUp size={20} color="#fff" />}
          label="Mean Daily Return"
          value={`${s.returns_stats.mean_daily_return.toFixed(3)}%`}
          sub={`Sharpe Ratio: ${s.returns_stats.sharpe_ratio.toFixed(2)}`}
          color="linear-gradient(135deg, #10b981, #059669)"
        />
        <StatCard
          icon={<BarChart2 size={20} color="#fff" />}
          label="Total Records"
          value={s.total_records.toLocaleString()}
          sub={`${s.date_range.start} → ${s.date_range.end}`}
          color="linear-gradient(135deg, #3b82f6, #1d4ed8)"
        />

        {metrics && (
          <>
            <StatCard
              icon={<Target size={20} color="#fff" />}
              label="Model RMSE"
              value={`$${metrics.rmse.toFixed(2)}`}
              sub="Root Mean Squared Error"
              color="linear-gradient(135deg, #ec4899, #be185d)"
            />
            <StatCard
              icon={<AlertCircle size={20} color="#fff" />}
              label="Model MAPE"
              value={`${metrics.mape.toFixed(2)}%`}
              sub={`MAE: $${metrics.mae.toFixed(2)}`}
              color="linear-gradient(135deg, #06b6d4, #0284c7)"
            />
          </>
        )}
      </div>

      {trainingInfo && (
        <div className="training-info-bar">
          <span className="training-badge">
            🧠 LSTM Model —{' '}
            {trainingInfo.status === 'loaded_from_cache'
              ? 'Loaded from cache'
              : `Trained for ${trainingInfo.epochs_run} epochs`}
            {trainingInfo.final_train_loss !== undefined
              ? ` · Loss: ${trainingInfo.final_train_loss.toFixed(5)}`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCards;
