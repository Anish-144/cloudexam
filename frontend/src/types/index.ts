export interface User {
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  s3_uri: string;
  records: number;
  columns: string[];
  statistics: Statistics;
  message: string;
}

export interface HistoricalDataPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface PredictionDataPoint {
  date: string;
  predicted_price: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ModelMetrics {
  rmse: number;
  mae: number;
  mape: number;
}

export interface TrainingInfo {
  status?: string;
  epochs_run: number;
  final_train_loss?: number;
  final_val_loss?: number;
}

export interface Statistics {
  total_records: number;
  date_range: { start: string; end: string };
  price_stats: {
    current: number;
    min: number;
    max: number;
    mean: number;
    std: number;
  };
  returns_stats: {
    mean_daily_return: number;
    volatility: number;
    annualized_volatility: number;
    sharpe_ratio: number;
  };
  volume_stats?: { avg_volume: number; max_volume: number };
}

export interface PredictionResponse {
  file_id: string;
  ticker?: string;
  historical_data: HistoricalDataPoint[];
  predictions: PredictionDataPoint[];
  model_metrics: ModelMetrics;
  training_info: TrainingInfo;
  statistics: Statistics;
  generated_at: string;
}

export interface UploadedFile {
  file_id: string;
  filename: string;
  records: number;
  uploaded_at: string;
}
