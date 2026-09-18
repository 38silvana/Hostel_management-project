'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import StudentManagement from '@/components/StudentManagement';
import KitchenDashboard from '@/components/KitchenDashboard';
import BillingManagement from '@/components/BillingManagement';
import { apiFetch } from '@/lib/api';
import { Users, Coffee, Moon, DollarSign, ArrowRight, UserCheck, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'kitchen' | 'billing'
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    fetchOverviewMetrics();
  }, []);

  const fetchOverviewMetrics = async () => {
    try {
      setLoading(true);
      const [studentsData, countsData] = await Promise.all([
        apiFetch('/students').catch(() => []),
        apiFetch(`/meals?mode=daily-sheet&date=${tomorrowStr}`).catch(() => ({ total_breakfast_count: 0, total_dinner_count: 0 })),
      ]);

      const students = studentsData || [];
      const pendingStudents = students.filter((s) => s.approval_status === 'pending');

      setMetrics({
        totalStudents: students.length,
        pendingCount: pendingStudents.length,
        tomorrowBreakfast: countsData.total_breakfast_count || 0,
        tomorrowDinner: countsData.total_dinner_count || 0,
      });
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="dashboard-layout">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="section-container">
              <div className="section-header">
                <div>
                  <h2>Administrator Control Center</h2>
                  <p className="subtitle">Welcome to the Shanthibavanam Hostel Management & Daily Meal Tracking Dashboard.</p>
                </div>
              </div>

              {loading ? (
                <LoadingSpinner label="Loading dashboard metrics..." />
              ) : (
                <div>
                  {metrics?.pendingCount > 0 && (
                    <div
                      className="alert alert-warning"
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fef3c7',
                        color: '#92400e',
                        padding: '14px 18px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        cursor: 'pointer',
                      }}
                      onClick={() => setActiveTab('students')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 240px' }}>
                        <Clock className="alert-icon text-amber" />
                        <span>
                          <strong>{metrics.pendingCount} Pending Resident Registration{metrics.pendingCount > 1 ? 's' : ''}:</strong> New residents are waiting for account approval before they can log in.
                        </span>
                      </div>
                      <span className="btn-primary" style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        Review & Approve &rarr;
                      </span>
                    </div>
                  )}

                  <div className="stats-grid mb-8">
                    <div className="stat-card" onClick={() => setActiveTab('students')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Registered Residents</span>
                        <Users className="stat-icon text-indigo" />
                      </div>
                      <div className="stat-value">{metrics?.totalStudents || 0}</div>
                      <div className="stat-link">
                        Manage Residents <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => setActiveTab('students')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Pending Approvals</span>
                        <UserCheck className="stat-icon text-amber" />
                      </div>
                      <div className="stat-value" style={{ color: metrics?.pendingCount > 0 ? '#d97706' : 'inherit' }}>
                        {metrics?.pendingCount || 0}
                      </div>
                      <div className="stat-link">
                        Review Approvals <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => setActiveTab('kitchen')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Tomorrow's Breakfast</span>
                        <Coffee className="stat-icon text-amber" />
                      </div>
                      <div className="stat-value">{metrics?.tomorrowBreakfast || 0}</div>
                      <div className="stat-link">
                        View Daily Ticks <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => setActiveTab('kitchen')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Tomorrow's Dinner</span>
                        <Moon className="stat-icon text-indigo" />
                      </div>
                      <div className="stat-value">{metrics?.tomorrowDinner || 0}</div>
                      <div className="stat-link">
                        View Daily Ticks <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>
                  </div>

                  <div className="quick-actions-card card">
                    <h3>Quick Operations</h3>
                    <div className="action-buttons-grid mt-4" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                      <button className="btn-secondary" style={{ flex: '1 1 200px' }} onClick={() => setActiveTab('students')}>
                        <Users className="icon-sm" /> Resident Directory & Approvals
                      </button>
                      <button className="btn-secondary" style={{ flex: '1 1 200px' }} onClick={() => setActiveTab('kitchen')}>
                        <Coffee className="icon-sm" /> Daily Ticks & Meal History
                      </button>
                      <button className="btn-secondary" style={{ flex: '1 1 200px' }} onClick={() => setActiveTab('billing')}>
                        <DollarSign className="icon-sm" /> Monthly Mess & Rent Billing
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && <StudentManagement />}
          {activeTab === 'kitchen' && <KitchenDashboard />}
          {activeTab === 'billing' && <BillingManagement />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
