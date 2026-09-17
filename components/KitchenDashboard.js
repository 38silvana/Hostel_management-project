'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Utensils, Coffee, Moon, Calendar, Users, AlertCircle, Check, X, Filter } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function KitchenDashboard() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetFilter, setSheetFilter] = useState('all'); // 'all' | 'opted' | 'skipped'

  useEffect(() => {
    fetchDailySheet();
  }, [selectedDate]);

  const fetchDailySheet = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/meals?mode=daily-sheet&date=${selectedDate}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch daily food sheet.');
    } finally {
      setLoading(false);
    }
  };

  const sheet = data?.sheet || [];

  const filteredSheet = sheet.filter((row) => {
    if (sheetFilter === 'opted') return row.breakfast || row.dinner;
    if (sheetFilter === 'skipped') return !row.breakfast && !row.dinner;
    return true;
  });

  const totalTicksOnDate = (data?.total_breakfast_count || 0) + (data?.total_dinner_count || 0);

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Kitchen Daily Food & Tick Sheet</h2>
          <p className="subtitle">
            Daily headcount and resident-wise meal preferences for food preparation.
          </p>
        </div>

        <div className="date-picker-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar className="icon-sm text-muted" />
          <label style={{ fontWeight: 600 }}>Target Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
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
        <LoadingSpinner label="Compiling daily food ticks..." />
      ) : data ? (
        <div>
          {/* Summary Stat Cards */}
          <div className="stats-grid mb-6" style={{ marginBottom: '24px' }}>
            <div className="stat-card accent-breakfast">
              <div className="stat-header">
                <span className="stat-title">Breakfast Count</span>
                <Coffee className="stat-icon text-amber" />
              </div>
              <div className="stat-value">{data.total_breakfast_count}</div>
              <p className="stat-desc">Residents opted IN for breakfast on {data.meal_date}</p>
            </div>

            <div className="stat-card accent-dinner">
              <div className="stat-header">
                <span className="stat-title">Dinner Count</span>
                <Moon className="stat-icon text-indigo" />
              </div>
              <div className="stat-value">{data.total_dinner_count}</div>
              <p className="stat-desc">Residents opted IN for dinner on {data.meal_date}</p>
            </div>

            <div className="stat-card accent-total">
              <div className="stat-header">
                <span className="stat-title">Total Food Ticks</span>
                <Utensils className="stat-icon text-emerald" />
              </div>
              <div className="stat-value">{totalTicksOnDate}</div>
              <p className="stat-desc">Combined meal ticks for {data.meal_date}</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Residents Responded</span>
                <Users className="stat-icon text-muted" />
              </div>
              <div className="stat-value">
                {data.total_responded_count} / {data.total_students}
              </div>
              <p className="stat-desc">Residents who submitted preferences</p>
            </div>
          </div>

          {/* Resident-wise Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Daily Food / Tick Sheet ({data.meal_date})</h3>
                <span className="text-xs text-muted">Who selected Breakfast and Dinner</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn-secondary ${sheetFilter === 'all' ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '13px', background: sheetFilter === 'all' ? '#e0e7ff' : '' }}
                  onClick={() => setSheetFilter('all')}
                >
                  All ({sheet.length})
                </button>
                <button
                  className={`btn-secondary ${sheetFilter === 'opted' ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '13px', background: sheetFilter === 'opted' ? '#dcfce7' : '' }}
                  onClick={() => setSheetFilter('opted')}
                >
                  Taking Meals
                </button>
                <button
                  className={`btn-secondary ${sheetFilter === 'skipped' ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '13px', background: sheetFilter === 'skipped' ? '#fee2e2' : '' }}
                  onClick={() => setSheetFilter('skipped')}
                >
                  Skipping All
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Room</th>
                    <th>Mobile</th>
                    <th style={{ textAlign: 'center' }}>Breakfast</th>
                    <th style={{ textAlign: 'center' }}>Dinner</th>
                    <th style={{ textAlign: 'center' }}>Daily Ticks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSheet.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted" style={{ padding: '24px', textAlign: 'center' }}>
                        No records match the selected filter for {data.meal_date}.
                      </td>
                    </tr>
                  ) : (
                    filteredSheet.map((row) => {
                      const dailyTicks = (row.breakfast ? 1 : 0) + (row.dinner ? 1 : 0);
                      return (
                        <tr key={row.student_id}>
                          <td>
                            <strong>{row.full_name}</strong>
                          </td>
                          <td>
                            <span className="badge badge-outline">Room {row.room_number}</span>
                          </td>
                          <td className="text-sm text-muted">{row.personal_contact || 'N/A'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {row.breakfast ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', color: '#15803d' }} title="Breakfast Selected">
                                <Check className="icon-sm" />
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#f3f4f6', color: '#9ca3af' }} title="Breakfast Skipped">
                                <X className="icon-sm" />
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {row.dinner ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', color: '#15803d' }} title="Dinner Selected">
                                <Check className="icon-sm" />
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#f3f4f6', color: '#9ca3af' }} title="Dinner Skipped">
                                <X className="icon-sm" />
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${dailyTicks > 0 ? 'badge-success' : 'badge-outline'}`} style={{ fontWeight: 700 }}>
                              {dailyTicks} {dailyTicks === 1 ? 'tick' : 'ticks'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                    <td colSpan="3">Totals for {data.meal_date}</td>
                    <td style={{ textAlign: 'center', color: '#15803d' }}>{data.total_breakfast_count} Breakfasts</td>
                    <td style={{ textAlign: 'center', color: '#15803d' }}>{data.total_dinner_count} Dinners</td>
                    <td style={{ textAlign: 'center', color: '#4f46e5' }}>{totalTicksOnDate} Total Ticks</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
