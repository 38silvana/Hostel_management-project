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
  Phone,
  Edit,
  CheckCircle,
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import {
  getTodayDateIndia,
  getYesterdayDateIndia,
  getTomorrowDateIndia,
  formatDateDisplay,
  getDateRelativeLabel,
} from '@/lib/config';
import { shareDailyMealReportOnWhatsApp } from '@/lib/whatsapp';
import { useAuth } from '@/lib/auth-context';

function WhatsAppIcon({ className = 'icon-xs', size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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

  // Admin WhatsApp recipient management
  const { user, refreshUser } = useAuth();
  const [adminWhatsAppNumber, setAdminWhatsAppNumber] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchDailySheet();
  }, [selectedDate]);

  useEffect(() => {
    fetchAdminWhatsApp();
  }, [user]);

  const fetchAdminWhatsApp = async () => {
    try {
      const res = await apiFetch('/admin/whatsapp-number');
      if (res?.whatsapp_number) {
        setAdminWhatsAppNumber(res.whatsapp_number);
        setPhoneInput(res.whatsapp_number);
      } else if (user?.whatsapp_number) {
        setAdminWhatsAppNumber(user.whatsapp_number);
        setPhoneInput(user.whatsapp_number);
      }
    } catch (e) {
      if (user?.whatsapp_number) {
        setAdminWhatsAppNumber(user.whatsapp_number);
        setPhoneInput(user.whatsapp_number);
      }
    }
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSaving(true);
    try {
      const res = await apiFetch('/admin/whatsapp-number', {
        method: 'POST',
        body: JSON.stringify({ whatsapp_number: phoneInput }),
      });
      setAdminWhatsAppNumber(res.whatsapp_number);
      if (refreshUser) refreshUser();
      setShowPhoneModal(false);
      setSuccessMsg('Admin WhatsApp number updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setPhoneError(err.message || 'Failed to save admin WhatsApp number.');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleWhatsAppShareDaily = () => {
    setError(null);
    const targetNumber = adminWhatsAppNumber || user?.whatsapp_number;
    if (!targetNumber) {
      setPhoneError('Please enter your WhatsApp number to receive daily meal reports.');
      setPhoneInput('');
      setShowPhoneModal(true);
      return;
    }

    const relativeTag = getDateRelativeLabel(selectedDate);
    const dateText = formatDateDisplay(selectedDate);
    const dateLabel = relativeTag ? `${dateText} (${relativeTag})` : dateText;

    shareDailyMealReportOnWhatsApp(
      targetNumber,
      data,
      selectedDate,
      dateLabel,
      (errMsg) => {
        setError(errMsg);
        setShowPhoneModal(true);
      }
    );
  };

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

      {/* WhatsApp Share & Admin Recipient Controls */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-whatsapp"
            onClick={handleWhatsAppShareDaily}
            disabled={loading || !data}
            title={`Share daily meal report for ${formattedDate || selectedDate} on Admin WhatsApp`}
          >
            <WhatsAppIcon size={16} />
            <span>Share Report on WhatsApp</span>
          </button>

          <span className="text-xs text-muted">
            Sends Breakfast & Dinner resident lists + headcounts to Admin WhatsApp.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="text-xs text-muted">Recipient:</span>
          <button
            type="button"
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setPhoneInput(adminWhatsAppNumber || '');
              setPhoneError(null);
              setShowPhoneModal(true);
            }}
            title="Configure or change Admin WhatsApp number"
          >
            <Phone className="icon-xs text-emerald" />
            <strong style={{ color: adminWhatsAppNumber ? '#0f172a' : '#d97706' }}>
              {adminWhatsAppNumber ? `📱 +91 ${adminWhatsAppNumber}` : '⚠️ Set Admin WhatsApp Number'}
            </strong>
            <Edit className="icon-xs text-muted" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle className="alert-icon" />
          <span>{successMsg}</span>
        </div>
      )}

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
      {/* Modal: Set / Change Admin WhatsApp Number */}
      {showPhoneModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Admin WhatsApp Recipient</h3>
            <p className="text-xs text-muted mb-4">
              Enter the WhatsApp mobile number where daily hostel meal reports (Breakfast &amp; Dinner headcounts and resident names) will be sent.
            </p>

            {phoneError && (
              <div className="alert alert-error mb-4" style={{ marginBottom: '12px' }}>
                <AlertCircle className="alert-icon" />
                <span>{phoneError}</span>
              </div>
            )}

            <form onSubmit={handleSavePhone} className="modal-form">
              <div className="form-group">
                <label>Admin 10-Digit Mobile Number</label>
                <div className="input-with-icon">
                  <Phone className="input-icon" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>
                <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                  Standard 10-digit Indian mobile number (e.g. 9876543210).
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPhoneModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={phoneSaving}
                  className="btn-primary"
                >
                  {phoneSaving ? 'Saving...' : 'Save WhatsApp Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
