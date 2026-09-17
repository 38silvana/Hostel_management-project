'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import StudentProfile from '@/components/StudentProfile';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { isFoodWindowOpen, FOOD_WINDOW_CONFIG, getTomorrowDateIndia, getIndiaTime } from '@/lib/config';
import { Utensils, Coffee, Moon, Clock, CheckCircle, AlertCircle, Info, Check, X } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function StudentPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('meals'); // 'meals' | 'profile'
  const [breakfast, setBreakfast] = useState(true);
  const [dinner, setDinner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tomorrowFormatted, setTomorrowFormatted] = useState('');

  // Time window status (Asia/Kolkata)
  const [windowStatus, setWindowStatus] = useState({
    isOpen: true,
    message: `Meal selection is OPEN until ${FOOD_WINDOW_CONFIG.CUTOFF_LABEL} (Window: ${FOOD_WINDOW_CONFIG.WINDOW_LABEL})`,
    cutoffLabel: FOOD_WINDOW_CONFIG.CUTOFF_LABEL,
    windowLabel: FOOD_WINDOW_CONFIG.WINDOW_LABEL,
  });

  useEffect(() => {
    // 1. Evaluate window status based on Asia/Kolkata
    const status = isFoodWindowOpen();
    setWindowStatus(status);

    // 2. Format tomorrow's date using Asia/Kolkata
    try {
      const tomorrowIso = getTomorrowDateIndia();
      const [y, m, d] = tomorrowIso.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formatted = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setTomorrowFormatted(formatted);
    } catch (e) {
      setTomorrowFormatted('Tomorrow');
    }

    // 3. Fetch resident's current selection
    if (user?.id) {
      fetchMySelection();
    }
  }, [user]);

  const fetchMySelection = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/meals?mode=my-selection&user_id=${user.id}`);
      if (data) {
        if (typeof data.breakfast === 'boolean') setBreakfast(data.breakfast);
        if (typeof data.dinner === 'boolean') setDinner(data.dinner);
        if (data.windowStatus) {
          setWindowStatus(data.windowStatus);
        }
      }
    } catch (err) {
      // Default to opted-in (true/true) if no record exists
      setBreakfast(true);
      setDinner(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelection = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    // Refresh window check
    const currentStatus = isFoodWindowOpen();
    setWindowStatus(currentStatus);

    if (!currentStatus.isOpen) {
      setError(currentStatus.message);
      setActionLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/meals', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          breakfast,
          dinner,
        }),
      });
      setSuccess(res.message || "Tomorrow's meal choices saved successfully!");
    } catch (err) {
      setError(err.message || 'Failed to save meal selection.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="dashboard-layout">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="dashboard-content">
          {activeTab === 'meals' && (
            <div className="section-container">
              <div className="section-header">
                <div>
                  <h2>Tomorrow's Food Preference</h2>
                  <p className="subtitle">
                    Select your meals for <strong>{tomorrowFormatted || 'Tomorrow'}</strong> (Permanent Resident Portal).
                  </p>
                </div>

                <div className={`cutoff-badge ${windowStatus.isOpen ? 'open' : 'closed'}`}>
                  <Clock className="icon-xs inline mr-1" />
                  {windowStatus.isOpen
                    ? `Selection Open (Cutoff: ${windowStatus.cutoffLabel || '10:00 PM'})`
                    : windowStatus.status === 'before_window'
                    ? `Selection Closed (Opens at ${windowStatus.startLabel || '5:00 PM'})`
                    : `Selection Closed (Cutoff: ${windowStatus.cutoffLabel || '10:00 PM'})`}
                </div>
              </div>

              {/* Status Alert Banner */}
              {windowStatus.isOpen ? (
                <div
                  className="alert alert-success"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    marginBottom: '20px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Info className="alert-icon" style={{ color: '#16a34a' }} />
                  <span>
                    <strong>Food Selection Open:</strong> You can choose Breakfast and Dinner until {windowStatus.cutoffLabel || '10:00 PM'} today (Evening window: {windowStatus.windowLabel || '5:00 PM to 10:00 PM'}).
                  </span>
                </div>
              ) : (
                <div
                  className="alert alert-warning"
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    color: '#92400e',
                    marginBottom: '20px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Clock className="alert-icon" style={{ color: '#d97706' }} />
                  <span>
                    <strong>Selection Closed:</strong> {windowStatus.message || `Tomorrow's food selection is currently closed.`}
                  </span>
                </div>
              )}

              {error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="alert alert-success mb-4">
                  <CheckCircle className="alert-icon" />
                  <span>{success}</span>
                </div>
              )}

              {loading ? (
                <LoadingSpinner label="Loading your meal choices..." />
              ) : (
                <div className="card max-w-2xl mx-auto" style={{ maxWidth: '640px', margin: '0 auto', padding: '24px' }}>
                  <div className="card-header border-b pb-4 mb-6" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h3 className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px' }}>
                      <Utensils className="text-primary" /> Tomorrow's Food Preference
                    </h3>
                    <p className="text-muted text-sm mt-1" style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0 0' }}>
                      Mark Yes or No for each meal before {windowStatus.cutoffLabel || '10:00 PM'}.
                    </p>
                  </div>

                  <form onSubmit={handleSaveSelection}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      {/* 1. BREAKFAST ROW */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 20px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: breakfast ? '#f0fdf4' : '#f8fafc',
                          transition: 'all 0.2s ease',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              background: '#fef3c7',
                              color: '#d97706',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Coffee className="icon-md" />
                          </div>
                          <div>
                            <span style={{ fontSize: '16px', fontWeight: 600, display: 'block', color: '#1e293b' }}>
                              Breakfast
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Morning meal for {tomorrowFormatted || 'Tomorrow'}
                            </span>
                          </div>
                        </div>

                        {/* Yes / No Toggle Group */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={!windowStatus.isOpen}
                            onClick={() => setBreakfast(true)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              border: breakfast ? '2px solid #16a34a' : '1px solid #cbd5e1',
                              background: breakfast ? '#16a34a' : '#ffffff',
                              color: breakfast ? '#ffffff' : '#334155',
                              fontWeight: 600,
                              fontSize: '14px',
                              cursor: windowStatus.isOpen ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              opacity: windowStatus.isOpen ? 1 : 0.6,
                            }}
                          >
                            <Check className="icon-xs" /> Yes
                          </button>

                          <button
                            type="button"
                            disabled={!windowStatus.isOpen}
                            onClick={() => setBreakfast(false)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              border: !breakfast ? '2px solid #ef4444' : '1px solid #cbd5e1',
                              background: !breakfast ? '#ef4444' : '#ffffff',
                              color: !breakfast ? '#ffffff' : '#334155',
                              fontWeight: 600,
                              fontSize: '14px',
                              cursor: windowStatus.isOpen ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              opacity: windowStatus.isOpen ? 1 : 0.6,
                            }}
                          >
                            <X className="icon-xs" /> No
                          </button>
                        </div>
                      </div>

                      {/* 2. DINNER ROW */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 20px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: dinner ? '#eef2ff' : '#f8fafc',
                          transition: 'all 0.2s ease',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              background: '#e0e7ff',
                              color: '#4f46e5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Moon className="icon-md" />
                          </div>
                          <div>
                            <span style={{ fontSize: '16px', fontWeight: 600, display: 'block', color: '#1e293b' }}>
                              Dinner
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Night meal for {tomorrowFormatted || 'Tomorrow'}
                            </span>
                          </div>
                        </div>

                        {/* Yes / No Toggle Group */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={!windowStatus.isOpen}
                            onClick={() => setDinner(true)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              border: dinner ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                              background: dinner ? '#4f46e5' : '#ffffff',
                              color: dinner ? '#ffffff' : '#334155',
                              fontWeight: 600,
                              fontSize: '14px',
                              cursor: windowStatus.isOpen ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              opacity: windowStatus.isOpen ? 1 : 0.6,
                            }}
                          >
                            <Check className="icon-xs" /> Yes
                          </button>

                          <button
                            type="button"
                            disabled={!windowStatus.isOpen}
                            onClick={() => setDinner(false)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              border: !dinner ? '2px solid #ef4444' : '1px solid #cbd5e1',
                              background: !dinner ? '#ef4444' : '#ffffff',
                              color: !dinner ? '#ffffff' : '#334155',
                              fontWeight: 600,
                              fontSize: '14px',
                              cursor: windowStatus.isOpen ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              opacity: windowStatus.isOpen ? 1 : 0.6,
                            }}
                          >
                            <X className="icon-xs" /> No
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading || !windowStatus.isOpen}
                      className="btn-primary w-full"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: windowStatus.isOpen ? 'pointer' : 'not-allowed',
                        opacity: windowStatus.isOpen ? 1 : 0.6,
                      }}
                    >
                      {actionLoading
                        ? 'Saving Preferences...'
                        : !windowStatus.isOpen
                        ? windowStatus.status === 'before_window'
                          ? `Selection Closed (Opens at ${windowStatus.startLabel || '5:00 PM'})`
                          : `Selection Locked (${windowStatus.cutoffLabel || '10:00 PM'} Cutoff Passed)`
                        : 'Save Meal Preference'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && <StudentProfile />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
