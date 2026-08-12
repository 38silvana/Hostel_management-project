'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Receipt, RefreshCw, Lock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function BillingManagement() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
      if (err.status === 404) {
        setSummary(null); // No bills generated for this month yet
      } else {
        setError(err.message || 'Failed to load mess bills.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch('/bills/generate', {
        method: 'POST',
        body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
      });
      setSummary(data);
      setSuccess(`Mess bills generated/recalculated for ${month}/${year}!`);
    } catch (err) {
      setError(err.message || 'Failed to generate mess bills.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm(`Are you sure you want to FINALIZE bills for ${month}/${year}? This action will lock all bills from future regeneration.`)) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch('/bills/finalize', {
        method: 'POST',
        body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
      });
      setSummary(data);
      setSuccess(`Mess bills for ${month}/${year} have been finalized and locked!`);
    } catch (err) {
      setError(err.message || 'Failed to finalize mess bills.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Monthly Mess Bill Calculation</h2>
          <p className="subtitle">SRS Rule: Base ₹1800 (&le; 30 ticks) + ₹55 for each extra tick over 30.</p>
        </div>

        <div className="billing-controls">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            <option value={1}>January</option>
            <option value={2}>February</option>
            <option value={3}>March</option>
            <option value={4}>April</option>
            <option value={5}>May</option>
            <option value={6}>June</option>
            <option value={7}>July</option>
            <option value={8}>August</option>
            <option value={9}>September</option>
            <option value={10}>October</option>
            <option value={11}>November</option>
            <option value={12}>December</option>
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
            title={summary && summary.is_finalized ? 'Finalized bills cannot be regenerated' : 'Generate / Recalculate Bills'}
          >
            <RefreshCw className="icon-sm" /> {summary ? 'Recalculate Bills' : 'Generate Bills'}
          </button>

          {summary && !summary.is_finalized && (
            <button
              className="btn-warning"
              onClick={handleFinalize}
              disabled={actionLoading}
            >
              <Lock className="icon-sm" /> Finalize Month
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

      {loading ? (
        <LoadingSpinner label="Calculating mess bills..." />
      ) : summary ? (
        <div>
          <div className="stats-grid mb-6">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Total Billed Revenue</span>
                <DollarSign className="stat-icon text-emerald" />
              </div>
              <div className="stat-value">₹{summary.total_revenue.toLocaleString()}</div>
              <p className="stat-desc">Target Period: {summary.month}/{summary.year}</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Students Billed</span>
                <Receipt className="stat-icon text-indigo" />
              </div>
              <div className="stat-value">{summary.total_students_billed}</div>
              <p className="stat-desc">Total student records calculated</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Billing Status</span>
                {summary.is_finalized ? <Lock className="stat-icon text-emerald" /> : <RefreshCw className="stat-icon text-amber" />}
              </div>
              <div className="stat-value text-lg">
                <span className={`badge ${summary.is_finalized ? 'badge-success' : 'badge-warning'}`}>
                  {summary.is_finalized ? 'FINALIZED & LOCKED' : 'DRAFT / RECALCULABLE'}
                </span>
              </div>
              <p className="stat-desc">{summary.is_finalized ? 'Locked from further updates' : 'Can be recalculated if meal data updates'}</p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Room</th>
                  <th>Total Monthly Ticks</th>
                  <th>Base Charge (&le;30 Ticks)</th>
                  <th>Extra Ticks Charge (₹55/tick)</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.bills.map((b) => {
                  const extraTicks = Math.max(0, b.total_ticks - 30);
                  const extraCharge = extraTicks * 55;
                  return (
                    <tr key={b.id}>
                      <td className="font-semibold">{b.student_name || `Student #${b.student_profile_id}`}</td>
                      <td><span className="badge badge-outline">{b.room_number || 'N/A'}</span></td>
                      <td>
                        <span className="font-bold">{b.total_ticks}</span> ticks
                        {b.total_ticks > 30 && <span className="badge badge-warning ml-2">+{extraTicks} Extra</span>}
                      </td>
                      <td>₹1,800.00</td>
                      <td>{extraCharge > 0 ? `+₹${extraCharge.toLocaleString()}` : '₹0.00'}</td>
                      <td className="font-bold text-emerald">₹{b.amount.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Receipt className="icon-lg text-muted mx-auto mb-4" />
          <h3>No Mess Bills Generated Yet for {month}/{year}</h3>
          <p className="text-muted mb-6">Click "Generate Bills" above to calculate monthly mess charges according to meal ticks.</p>
          <button className="btn-primary" onClick={handleGenerate} disabled={actionLoading}>
            {actionLoading ? 'Generating...' : 'Generate Bills Now'}
          </button>
        </div>
      )}
    </div>
  );
}
