'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Utensils, Coffee, Moon, Calendar, Users, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function KitchenDashboard() {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCounts();
  }, [selectedDate]);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/meals/counts?meal_date=${selectedDate}`);
      setCounts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch kitchen meal counts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Kitchen Dashboard & Analytics</h2>
          <p className="subtitle">Real-time headcount totals for breakfast and dinner preparation.</p>
        </div>

        <div className="date-picker-container">
          <Calendar className="icon-sm text-muted" />
          <label>Target Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Calculating kitchen headcounts..." />
      ) : counts ? (
        <div className="stats-grid">
          <div className="stat-card accent-breakfast">
            <div className="stat-header">
              <span className="stat-title">Breakfast Count</span>
              <Coffee className="stat-icon text-amber" />
            </div>
            <div className="stat-value">{counts.total_breakfast_count}</div>
            <p className="stat-desc">Students opted IN for breakfast on {counts.meal_date}</p>
          </div>

          <div className="stat-card accent-dinner">
            <div className="stat-header">
              <span className="stat-title">Dinner Count</span>
              <Moon className="stat-icon text-indigo" />
            </div>
            <div className="stat-value">{counts.total_dinner_count}</div>
            <p className="stat-desc">Students opted IN for dinner on {counts.meal_date}</p>
          </div>

          <div className="stat-card accent-total">
            <div className="stat-header">
              <span className="stat-title">Total Responded</span>
              <Users className="stat-icon text-emerald" />
            </div>
            <div className="stat-value">{counts.total_students_selected}</div>
            <p className="stat-desc">Total students who registered meal choices</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
