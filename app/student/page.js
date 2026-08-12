'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import StudentProfile from '@/components/StudentProfile';
import { apiFetch } from '@/lib/api';
import { Utensils, Coffee, Moon, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function StudentPage() {
  const [activeTab, setActiveTab] = useState('meals'); // 'meals' | 'profile'
  const [breakfast, setBreakfast] = useState(true);
  const [dinner, setDinner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Calculate cutoff status (10:00 PM cutoff)
  const currentHour = new Date().getHours();
  const isCutoffPassed = currentHour >= 22;

  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    fetchMySelection();
  }, []);

  const fetchMySelection = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/meals/my-selection/tomorrow');
      setBreakfast(data.breakfast);
      setDinner(data.dinner);
    } catch (err) {
      // 404 means no selection submitted yet, keep defaults (true/true)
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelection = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch('/meals/tomorrow', {
        method: 'POST',
        body: JSON.stringify({ breakfast, dinner })
      });
      setSuccess("Tomorrow's meal choices saved successfully!");
    } catch (err) {
      setError(err.message || 'Failed to save meal choices.');
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
                  <h2>Meal Selection Tick System</h2>
                  <p className="subtitle">Select your meal preferences for <strong>{tomorrowStr}</strong>.</p>
                </div>

                <div className={`cutoff-badge ${isCutoffPassed ? 'closed' : 'open'}`}>
                  <Clock className="icon-xs inline mr-1" />
                  {isCutoffPassed ? '10 PM Cutoff Passed (Selection Locked)' : '10 PM Cutoff Active (Editable)'}
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
                <LoadingSpinner label="Loading your meal choices..." />
              ) : (
                <div className="card max-w-2xl mx-auto">
                  <div className="card-header border-b pb-4 mb-6">
                    <h3 className="flex items-center gap-2">
                      <Utensils className="text-primary" /> Daily Meal Preference
                    </h3>
                    <p className="text-muted text-sm mt-1">
                      You may update your meal choices as many times as you like before 10:00 PM today.
                    </p>
                  </div>

                  <form onSubmit={handleSaveSelection}>
                    <div className="meal-options-grid mb-6">
                      <label className={`meal-checkbox-card ${breakfast ? 'selected' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Coffee className="meal-icon text-amber" />
                          <div>
                            <span className="font-semibold block">Tomorrow's Breakfast</span>
                            <span className="text-xs text-muted">Opt in or out for morning breakfast</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          disabled={isCutoffPassed}
                          checked={breakfast}
                          onChange={(e) => setBreakfast(e.target.checked)}
                        />
                      </label>

                      <label className={`meal-checkbox-card ${dinner ? 'selected' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Moon className="meal-icon text-indigo" />
                          <div>
                            <span className="font-semibold block">Tomorrow's Dinner</span>
                            <span className="text-xs text-muted">Opt in or out for night dinner</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          disabled={isCutoffPassed}
                          checked={dinner}
                          onChange={(e) => setDinner(e.target.checked)}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading || isCutoffPassed}
                      className="btn-primary w-full"
                    >
                      {actionLoading ? 'Saving Selection...' : isCutoffPassed ? '10 PM Cutoff Passed (Locked)' : 'Save Meal Choice'}
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
