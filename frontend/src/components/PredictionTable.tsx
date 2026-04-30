import React from 'react';
import { PredictionResponse } from '../types';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface PredictionTableProps {
  data: PredictionResponse;
}

const PredictionTable: React.FC<PredictionTableProps> = ({ data }) => {
  const lastActual = data.historical_data[data.historical_data.length - 1]?.close;

  return (
    <div className="pred-table-container">
      <h3 className="section-title">📅 Predicted Prices</h3>
      <div className="table-scroll">
        <table className="pred-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Predicted Price</th>
              <th>Change from Current</th>
              <th>Lower Bound</th>
              <th>Upper Bound</th>
            </tr>
          </thead>
          <tbody>
            {data.predictions.map((p, i) => {
              const change = lastActual ? p.predicted_price - lastActual : null;
              const pct = lastActual
                ? ((p.predicted_price - lastActual) / lastActual) * 100
                : null;
              const isUp = change !== null && change > 0;
              const isDown = change !== null && change < 0;

              return (
                <tr key={p.date} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="row-num">{i + 1}</td>
                  <td className="row-date">
                    {format(parseISO(p.date), 'EEE, MMM dd yyyy')}
                  </td>
                  <td className="row-price">${p.predicted_price.toFixed(2)}</td>
                  <td className={`row-change ${isUp ? 'up' : isDown ? 'down' : ''}`}>
                    {isUp ? (
                      <ArrowUpRight size={14} />
                    ) : isDown ? (
                      <ArrowDownRight size={14} />
                    ) : (
                      <Minus size={14} />
                    )}
                    {change !== null
                      ? `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${pct!.toFixed(2)}%)`
                      : '—'}
                  </td>
                  <td className="row-bound">${p.lower_bound.toFixed(2)}</td>
                  <td className="row-bound">${p.upper_bound.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionTable;
