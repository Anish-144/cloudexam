import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { PredictionResponse } from '../types';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface StockChartProps {
  data: PredictionResponse;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-date">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="tooltip-row" style={{ color: entry.color }}>
          <span className="tooltip-label">{entry.name}</span>
          <span className="tooltip-value">
            ${Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  const [range, setRange] = useState<'1Y' | '6M' | '3M' | 'ALL'>('ALL');

  // Slice historical data by range
  const filteredHistorical = useMemo(() => {
    const hist = data.historical_data;
    const now = new Date();
    const cutoffs: Record<string, number> = { '1Y': 365, '6M': 183, '3M': 91 };
    if (range === 'ALL') return hist;
    const cutoff = new Date(now.setDate(now.getDate() - cutoffs[range]));
    return hist.filter((d) => new Date(d.date) >= cutoff);
  }, [data.historical_data, range]);

  // Merge historical + predictions into one series for smooth join
  const chartData = useMemo(() => {
    const hist = filteredHistorical.map((d) => ({
      date: format(parseISO(d.date), 'MMM dd, yy'),
      actual: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
    }));

    const preds = data.predictions.map((p) => ({
      date: format(parseISO(p.date), 'MMM dd, yy'),
      predicted: p.predicted_price,
      lower: p.lower_bound,
      upper: p.upper_bound,
    }));

    return [...hist, ...preds];
  }, [filteredHistorical, data.predictions]);

  const lastActual = data.historical_data[data.historical_data.length - 1]?.close || 0;
  const lastPredicted = data.predictions[data.predictions.length - 1]?.predicted_price || 0;
  const priceChange = lastPredicted - lastActual;
  const pctChange = ((priceChange / lastActual) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  return (
    <div className="chart-container">
      {/* Header */}
      <div className="chart-header">
        <div className="chart-header-left">
          <h2 className="chart-title">Stock Price Prediction</h2>
          <div className={`price-change-badge ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{isPositive ? '+' : ''}{pctChange}% projected</span>
          </div>
        </div>
        <div className="range-buttons">
          {(['3M', '6M', '1Y', 'ALL'] as const).map((r) => (
            <button
              key={r}
              className={`range-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
              id={`range-btn-${r}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 12 }}
          />

          {/* Confidence band */}
          <Area
            dataKey="upper"
            fill="url(#colorBand)"
            stroke="transparent"
            name="Upper Band"
            dot={false}
            legendType="none"
          />
          <Area
            dataKey="lower"
            fill="#0f172a"
            stroke="transparent"
            name="Lower Band"
            dot={false}
            legendType="none"
          />

          {/* Historical actual */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#colorActual)"
            name="Historical Price"
            dot={false}
            activeDot={{ r: 5, fill: '#6366f1' }}
          />

          {/* Predicted */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeDasharray="6 3"
            name="Predicted Price"
            dot={false}
            activeDot={{ r: 5, fill: '#10b981' }}
          />

          <Brush
            dataKey="date"
            height={24}
            stroke="#334155"
            fill="#0f172a"
            travellerWidth={8}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
