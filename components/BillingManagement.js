'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Receipt, RefreshCw, Lock, DollarSign, CheckCircle, AlertCircle, Home, FileText } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { shareResidentBillOnWhatsApp } from '@/lib/whatsapp';

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

export default function BillingManagement() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchBills();
  }, [year, month]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/bills?year=${year}&month=${month}`);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load monthly bills.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch('/bills', {
        method: 'POST',
        body: JSON.stringify({ year: parseInt(year), month: parseInt(month), action: 'generate' }),
      });
      setSuccess(res.message || `Monthly mess bills recalculated for ${monthNames[month - 1]} ${year}!`);
      fetchBills();
    } catch (err) {
      setError(err.message || 'Failed to calculate monthly bills.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm(`Are you sure you want to FINALIZE and LOCK bills for ${monthNames[month - 1]} ${year}? Finalized bills cannot be modified.`)) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch('/bills', {
        method: 'POST',
        body: JSON.stringify({ year: parseInt(year), month: parseInt(month), action: 'finalize' }),
      });
      setSuccess(res.message || `Bills for ${monthNames[month - 1]} ${year} have been finalized!`);
      fetchBills();
    } catch (err) {
      setError(err.message || 'Failed to finalize bills.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWhatsAppShare = (bill) => {
    setError(null);
    const monthName = monthNames[(summary?.month || month) - 1] || '';
    const yr = summary?.year || year;
    shareResidentBillOnWhatsApp(bill, monthName, yr, (errMsg) => {
      setError(errMsg);
      alert(errMsg);
    });
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Monthly Resident Mess & Rent Billing</h2>
          <p className="subtitle">
            Shanthibavanam Hostel Monthly Report: Base ₹1800 (&le; 30 ticks) + ₹55/extra tick + ₹2700 Hostel Rent.
          </p>
        </div>

        <div className="billing-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {monthNames.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>

          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={actionLoading || (summary && summary.is_finalized)}
            title={summary && summary.is_finalized ? 'Finalized bills are locked' : 'Calculate or refresh bills'}
          >
            <RefreshCw className="icon-sm mr-1" />
            {summary?.bills?.length > 0 ? 'Recalculate Bills' : 'Calculate Bills'}
          </button>

          {summary && !summary.is_finalized && (
            <button
              className="btn-warning"
              onClick={handleFinalize}
              disabled={actionLoading}
              title="Lock bills from further edits"
            >
              <Lock className="icon-sm mr-1" /> Finalize Month
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle className="alert-icon" />
          <span>{success}</span>
        </div>
      )}

      {/* Formula Explanation Banner */}
      <div className="card mb-6" style={{ background: '#f8fafc', borderLeft: '4px solid #4f46e5', padding: '12px 16px', marginBottom: '20px' }}>
        <span style={{ fontSize: '13px', color: '#475569' }}>
          <strong>Billing Formula:</strong> Base Mess Fee = ₹1,800 (for &le; 30 ticks) &bull; Extra Ticks = (Ticks - 30) &times; ₹55 &bull; Hostel Rent = ₹2,700 fixed &bull; <strong>Total Bill = Mess Fee + Hostel Rent</strong>
        </span>
      </div>

      {loading ? (
        <LoadingSpinner label="Compiling monthly billing report..." />
      ) : summary ? (
        <div>
          {/* Stats Grid */}
          <div className="stats-grid mb-6" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Total Monthly Revenue</span>
                <DollarSign className="stat-icon text-emerald" />
              </div>
              <div className="stat-value">₹{summary.total_revenue.toLocaleString('en-IN')}</div>
              <p className="stat-desc">Rent + Mess fees for {monthNames[summary.month - 1]} {summary.year}</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Mess Fees Total</span>
                <Receipt className="stat-icon text-amber" />
              </div>
              <div className="stat-value">₹{summary.total_mess_revenue.toLocaleString('en-IN')}</div>
              <p className="stat-desc">Base ₹1800 + extra tick charges</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Hostel Rent Total</span>
                <Home className="stat-icon text-indigo" />
              </div>
              <div className="stat-value">₹{summary.total_rent_revenue.toLocaleString('en-IN')}</div>
              <p className="stat-desc">Fixed ₹2700 per resident</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Month Status</span>
                {summary.is_finalized ? <Lock className="stat-icon text-emerald" /> : <RefreshCw className="stat-icon text-amber" />}
              </div>
              <div className="stat-value text-lg">
                <span className={`badge ${summary.is_finalized ? 'badge-success' : 'badge-warning'}`}>
                  {summary.is_finalized ? 'FINALIZED & LOCKED' : 'DRAFT / RECALCULABLE'}
                </span>
              </div>
              <p className="stat-desc">{summary.is_finalized ? 'Bills are finalized' : 'Can recalculate as marks update'}</p>
            </div>
          </div>

          {/* Resident-Wise Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>
                Monthly Resident Report &mdash; {monthNames[summary.month - 1]} {summary.year}
              </h3>
              <span className="text-xs text-muted">Admin-only visibility &bull; Detailed resident breakdown</span>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="table-container desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident Name</th>
                    <th>Room</th>
                    <th style={{ textAlign: 'center' }}>Total Ticks</th>
                    <th style={{ textAlign: 'center' }}>Extra Ticks</th>
                    <th>Mess Fee</th>
                    <th>Hostel Rent</th>
                    <th style={{ textAlign: 'right' }}>Total Bill Amount</th>
                    <th style={{ textAlign: 'center' }}>WhatsApp Share</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bills.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center text-muted"
                        style={{ padding: '24px', textAlign: 'center' }}
                      >
                        No resident records found to bill for {monthNames[summary.month - 1]}{' '}
                        {summary.year}.
                      </td>
                    </tr>
                  ) : (
                    summary.bills.map((b) => (
                      <tr key={b.student_id}>
                        <td>
                          <strong>{b.student_name}</strong>
                          {b.personal_contact ? (
                            <span className="text-xs text-muted block">
                              📱 {b.personal_contact}
                            </span>
                          ) : (
                            <span className="text-xs text-muted block" style={{ color: '#ef4444' }}>
                              ⚠️ No mobile
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-outline">Room {b.room_number || 'N/A'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{b.total_ticks}</span> ticks
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {b.extra_ticks > 0 ? (
                            <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                              +{b.extra_ticks} extra
                            </span>
                          ) : (
                            <span className="text-muted text-xs">0 (within 30)</span>
                          )}
                        </td>
                        <td>
                          <span>₹{b.mess_fee.toLocaleString('en-IN')}</span>
                          {b.extra_ticks > 0 && (
                            <span className="text-xs text-muted block">
                              (₹1800 + {b.extra_ticks}&times;₹55)
                            </span>
                          )}
                        </td>
                        <td>₹{b.hostel_rent.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <strong className="text-emerald" style={{ fontSize: '15px' }}>
                            ₹{b.total_bill.toLocaleString('en-IN')}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-whatsapp-sm"
                            onClick={() => handleWhatsAppShare(b)}
                            title={
                              b.personal_contact
                                ? `Share bill details for ${b.student_name} on WhatsApp (${b.personal_contact})`
                                : `No registered mobile number for ${b.student_name}`
                            }
                          >
                            <WhatsAppIcon size={14} />
                            <span>Share</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                    <td colSpan="4">
                      Total Revenue for {monthNames[summary.month - 1]} {summary.year}
                    </td>
                    <td>₹{summary.total_mess_revenue.toLocaleString('en-IN')}</td>
                    <td>₹{summary.total_rent_revenue.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#15803d', fontSize: '16px' }}>
                      ₹{summary.total_revenue.toLocaleString('en-IN')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* MOBILE CARD VIEW (No horizontal scrolling on phones) */}
            <div className="mobile-only mobile-card-list">
              {summary.bills.length === 0 ? (
                <div
                  className="card text-center text-muted"
                  style={{ textAlign: 'center', padding: '24px' }}
                >
                  No resident records found to bill for {monthNames[summary.month - 1]} {summary.year}.
                </div>
              ) : (
                summary.bills.map((b) => (
                  <div key={b.student_id} className="mobile-data-card">
                    <div className="mobile-card-header">
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                          {b.student_name}
                        </strong>
                        <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                          Room {b.room_number || 'N/A'} {b.personal_contact ? `• 📱 ${b.personal_contact}` : '• ⚠️ No mobile'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="text-xs text-muted block">Total Bill</span>
                        <strong className="text-emerald" style={{ fontSize: '16px' }}>
                          ₹{b.total_bill.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-card-item">
                        <span className="mobile-card-label">Monthly Ticks</span>
                        <span className="mobile-card-val">
                          {b.total_ticks} ticks
                          {b.extra_ticks > 0 ? (
                            <span
                              className="badge badge-warning"
                              style={{ fontSize: '10px', padding: '1px 5px', marginLeft: '4px' }}
                            >
                              +{b.extra_ticks} extra
                            </span>
                          ) : (
                            <span className="text-xs text-muted" style={{ fontWeight: 'normal', marginLeft: '4px' }}>
                              (&le;30)
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="mobile-card-item">
                        <span className="mobile-card-label">Mess Fee</span>
                        <span className="mobile-card-val">
                          ₹{b.mess_fee.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="mobile-card-item">
                        <span className="mobile-card-label">Hostel Rent</span>
                        <span className="mobile-card-val">
                          ₹{b.hostel_rent.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="mobile-card-item">
                        <span className="mobile-card-label">Bill Status</span>
                        <div>
                          <span
                            className={`badge ${b.is_finalized ? 'badge-success' : 'badge-outline'}`}
                            style={{ fontSize: '11px', padding: '2px 6px' }}
                          >
                            {b.is_finalized ? 'Finalized' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-actions" style={{ marginTop: '12px' }}>
                      <button
                        type="button"
                        className="btn-whatsapp"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => handleWhatsAppShare(b)}
                        title={
                          b.personal_contact
                            ? `Share bill for ${b.student_name} on WhatsApp (${b.personal_contact})`
                            : `No registered mobile number for ${b.student_name}`
                        }
                      >
                        <WhatsAppIcon size={16} />
                        <span>Share on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Mobile Total Summary Card */}
              {summary.bills.length > 0 && (
                <div
                  className="card"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <strong style={{ color: '#0f172a' }}>
                    Month Summary ({monthNames[summary.month - 1]} {summary.year}):
                  </strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Total Mess Revenue:</span>
                    <strong>₹{summary.total_mess_revenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Total Rent Revenue:</span>
                    <strong>₹{summary.total_rent_revenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '6px',
                      fontSize: '15px',
                    }}
                  >
                    <span>Total Revenue:</span>
                    <strong style={{ color: '#15803d' }}>
                      ₹{summary.total_revenue.toLocaleString('en-IN')}
                    </strong>
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
