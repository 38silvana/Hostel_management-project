'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Utensils,
  Coffee,
  Moon,
  Calendar,
  Users,
  AlertCircle,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import {
  getTodayDateIndia,
  getYesterdayDateIndia,
  getTomorrowDateIndia,
  formatDateDisplay,
  getDateRelativeLabel,
} from '@/lib/config';

export default function KitchenDashboard() {
  const todayStr = getTodayDateIndia();
  const yesterdayStr = getYesterdayDateIndia();
  const tomorrowStr = getTomorrowDateIndia();

  // Default to today so admin can immediately view current meal selections or switch to yesterday/tomorrow
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetFilter, setSheetFilter] = useState('all'); // 'all' | 'opted' | 'breakfast' | 'dinner' | 'skipped'
  const [searchQuery, setSearchQuery] = useState('');

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

  const changeDateByDays = (delta) => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      dateObj.setUTCDate(dateObj.getUTCDate() + delta);
      setSelectedDate(dateObj.toISOString().split('T')[0]);
    } catch (e) {
      // Fallback
    }
  };

  const sheet = data?.sheet || [];

  const filteredSheet = sheet.filter((row) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = String(row.full_name || '').toLowerCase().includes(q);
      const matchRoom = String(row.room_number || '').toLowerCase().includes(q);
      const matchContact = String(row.personal_contact || '').toLowerCase().includes(q);
      if (!matchName && !matchRoom && !matchContact) return false;
    }

    // Category filter
    if (sheetFilter === 'opted') return row.breakfast || row.dinner;
    if (sheetFilter === 'breakfast') return row.breakfast;
    if (sheetFilter === 'dinner') return row.dinner;
    if (sheetFilter === 'skipped') return !row.breakfast && !row.dinner;
    return true;
  });

  const totalTicksOnDate = (data?.total_breakfast_count || 0) + (data?.total_dinner_count || 0);
  const relativeLabel = getDateRelativeLabel(selectedDate);
  const formattedDate = formatDateDisplay(selectedDate);

  return (
    <div className="section-container">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2>Daily Meal & Tick History (Resident Details)</h2>
          <p className="subtitle">
            Resident-wise Breakfast & Dinner selections, daily tick counts, and date history.
          </p>
        </div>

        {/* Date Navigation Bar */}
        <div className="date-nav-container">
          {/* Quick Date Select Chips */}
          <div className="date-nav-quick-btns">
            <button
              type="button"
              className={`date-chip-btn ${selectedDate === yesterdayStr ? 'active' : ''}`}
              onClick={() => setSelectedDate(yesterdayStr)}
              title="View Yesterday's meal selections"
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`date-chip-btn ${selectedDate === todayStr ? 'active' : ''}`}
              onClick={() => setSelectedDate(todayStr)}
              title="View Today's meal selections"
            >
              Today
            </button>
            <button
              type="button"
              className={`date-chip-btn ${selectedDate === tomorrowStr ? 'active' : ''}`}
              onClick={() => setSelectedDate(tomorrowStr)}
              title="View Tomorrow's meal choices"
            >
              Tomorrow
            </button>
          </div>

          {/* Date Stepper & Picker Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => changeDateByDays(-1)}
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="icon-sm" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontWeight: 600,
                fontSize: '14px',
              }}
              title="Select any past or future date"
            />

            <button
              type="button"
              className="btn-icon"
              onClick={() => changeDateByDays(1)}
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="icon-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Current Active Date Banner */}
      <div
        className="card"
        style={{
          background: '#f8fafc',
          borderLeft: '4px solid #4f46e5',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar className="icon-sm text-primary" />
          <span style={{ fontSize: '14px', color: '#1e293b' }}>
            Viewing selections for: <strong>{formattedDate || selectedDate}</strong>
          </span>
          {relativeLabel && (
            <span
              className="badge"
              style={{
                background: relativeLabel === 'Today' ? '#dcfce7' : relativeLabel === 'Yesterday' ? '#fef3c7' : '#e0e7ff',
                color: relativeLabel === 'Today' ? '#166534' : relativeLabel === 'Yesterday' ? '#92400e' : '#3730a3',
                border: '1px solid transparent',
              }}
            >
              {relativeLabel}
            </span>
          )}
        </div>

        <span className="text-xs text-muted">
          Showing real-time & historical records from meal_selections
        </span>
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
              <p className="stat-desc">Residents opted IN for breakfast</p>
            </div>

            <div className="stat-card accent-dinner">
              <div className="stat-header">
                <span className="stat-title">Dinner Count</span>
                <Moon className="stat-icon text-indigo" />
              </div>
              <div className="stat-value">{data.total_dinner_count}</div>
              <p className="stat-desc">Residents opted IN for dinner</p>
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
              <p className="stat-desc">Residents with recorded choices</p>
            </div>
          </div>

          {/* Resident-wise Table & Search Container */}
          <div className="card" style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  Resident Food Selection & Daily Ticks ({formattedDate || data.meal_date})
                </h3>
                <span className="text-xs text-muted">
                  Who selected Breakfast and Dinner on this date
                </span>
              </div>

              {/* Search Box */}
              <div className="search-bar" style={{ maxWidth: '280px', margin: 0 }}>
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search resident or room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <button
                className={`date-chip-btn ${sheetFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSheetFilter('all')}
              >
                All Residents ({sheet.length})
              </button>
              <button
                className={`date-chip-btn ${sheetFilter === 'opted' ? 'active' : ''}`}
                onClick={() => setSheetFilter('opted')}
              >
                Taking Meals ({sheet.filter((r) => r.breakfast || r.dinner).length})
              </button>
              <button
                className={`date-chip-btn ${sheetFilter === 'breakfast' ? 'active' : ''}`}
                onClick={() => setSheetFilter('breakfast')}
              >
                Breakfast Only ({sheet.filter((r) => r.breakfast && !r.dinner).length})
              </button>
              <button
                className={`date-chip-btn ${sheetFilter === 'dinner' ? 'active' : ''}`}
                onClick={() => setSheetFilter('dinner')}
              >
                Dinner Only ({sheet.filter((r) => !r.breakfast && r.dinner).length})
              </button>
              <button
                className={`date-chip-btn ${sheetFilter === 'skipped' ? 'active' : ''}`}
                onClick={() => setSheetFilter('skipped')}
              >
                Skipping All ({sheet.filter((r) => !r.breakfast && !r.dinner).length})
              </button>
            </div>

            {/* DESKTOP TABLE VIEW (Visible on tablet & desktop) */}
            <div className="table-container desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident Name</th>
                    <th>Room No</th>
                    <th>Mobile</th>
                    <th style={{ textAlign: 'center' }}>Breakfast</th>
                    <th style={{ textAlign: 'center' }}>Dinner</th>
                    <th style={{ textAlign: 'center' }}>Total Ticks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSheet.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center text-muted"
                        style={{ padding: '28px', textAlign: 'center' }}
                      >
                        No resident records match the selected filter for {formattedDate || data.meal_date}.
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
                              <span
                                className="badge badge-yes"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Check className="icon-xs" /> Yes
                              </span>
                            ) : (
                              <span
                                className="badge badge-no"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <X className="icon-xs" /> No
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {row.dinner ? (
                              <span
                                className="badge badge-yes"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Check className="icon-xs" /> Yes
                              </span>
                            ) : (
                              <span
                                className="badge badge-no"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <X className="icon-xs" /> No
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${dailyTicks > 0 ? 'badge-tick' : 'badge-outline'}`}
                              style={{ fontWeight: 700 }}
                            >
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
                    <td colSpan="3">Totals for {formattedDate || data.meal_date}</td>
                    <td style={{ textAlign: 'center', color: '#15803d' }}>
                      {data.total_breakfast_count} Breakfasts
                    </td>
                    <td style={{ textAlign: 'center', color: '#15803d' }}>
                      {data.total_dinner_count} Dinners
                    </td>
                    <td style={{ textAlign: 'center', color: '#4f46e5' }}>
                      {totalTicksOnDate} Total Ticks
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* MOBILE CARD VIEW (Eliminates horizontal scrolling on mobile screens) */}
            <div className="mobile-only mobile-card-list">
              {filteredSheet.length === 0 ? (
                <div
                  className="card text-center text-muted"
                  style={{ padding: '24px', textAlign: 'center' }}
                >
                  No resident records match the selected filter for {formattedDate || data.meal_date}.
                </div>
              ) : (
                filteredSheet.map((row) => {
                  const dailyTicks = (row.breakfast ? 1 : 0) + (row.dinner ? 1 : 0);
                  return (
                    <div key={row.student_id} className="mobile-data-card">
                      <div className="mobile-card-header">
                        <div>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                            {row.full_name}
                          </strong>
                          <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                            Mobile: {row.personal_contact || 'N/A'}
                          </div>
                        </div>
                        <span className="badge badge-outline">Room {row.room_number}</span>
                      </div>

                      <div className="mobile-card-grid">
                        <div className="mobile-card-item">
                          <span className="mobile-card-label">Breakfast</span>
                          <div>
                            {row.breakfast ? (
                              <span
                                className="badge badge-yes"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Check className="icon-xs" /> Yes
                              </span>
                            ) : (
                              <span
                                className="badge badge-no"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <X className="icon-xs" /> No
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mobile-card-item">
                          <span className="mobile-card-label">Dinner</span>
                          <div>
                            {row.dinner ? (
                              <span
                                className="badge badge-yes"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Check className="icon-xs" /> Yes
                              </span>
                            ) : (
                              <span
                                className="badge badge-no"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <X className="icon-xs" /> No
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px',
                        }}
                      >
                        <span className="text-muted">Total Day Ticks:</span>
                        <span
                          className={`badge ${dailyTicks > 0 ? 'badge-tick' : 'badge-outline'}`}
                          style={{ fontWeight: 700 }}
                        >
                          {dailyTicks} {dailyTicks === 1 ? 'tick' : 'ticks'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Mobile Summary Card */}
              {filteredSheet.length > 0 && (
                <div
                  className="card"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <strong style={{ color: '#0f172a' }}>Day Totals ({data.meal_date}):</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Breakfasts:</span>
                    <strong style={{ color: '#15803d' }}>{data.total_breakfast_count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Dinners:</span>
                    <strong style={{ color: '#15803d' }}>{data.total_dinner_count}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '6px',
                    }}
                  >
                    <span>Total Ticks:</span>
                    <strong style={{ color: '#4f46e5' }}>{totalTicksOnDate} ticks</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
