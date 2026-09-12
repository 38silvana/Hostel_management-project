'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import StudentManagement from '@/components/StudentManagement';
import KitchenDashboard from '@/components/KitchenDashboard';
import BillingManagement from '@/components/BillingManagement';
import { apiFetch } from '@/lib/api';
import { Users, Coffee, Moon, DollarSign, ArrowRight } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'kitchen' | 'billing'
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  useEffect(() => {
    fetchOverviewMetrics();
  }, []);

  const fetchOverviewMetrics = async () => {
    try {
      setLoading(true);
      const [studentsData, countsData] = await Promise.all([
        apiFetch('/students'),
        apiFetch(`/meals/counts?meal_date=${tomorrowStr}`).catch(() => ({ total_breakfast_count: 0, total_dinner_count: 0 }))
      ]);

      setMetrics({
        totalStudents: studentsData.length,
        tomorrowBreakfast: countsData.total_breakfast_count || 0,
        tomorrowDinner: countsData.total_dinner_count || 0
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
                  <p className="subtitle">Welcome to the Shanthibavanam Hostel Management & Meal Tracking Dashboard.</p>
                </div>
              </div>

              {loading ? (
                <LoadingSpinner label="Loading dashboard metrics..." />
              ) : (
                <div>
                  <div className="stats-grid mb-8">
                    <div className="stat-card" onClick={() => setActiveTab('students')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Total Registered Students</span>
                        <Users className="stat-icon text-indigo" />
                      </div>
                      <div className="stat-value">{metrics?.totalStudents || 0}</div>
                      <div className="stat-link">
                        Manage Students <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => setActiveTab('kitchen')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Tomorrow's Breakfast Count</span>
                        <Coffee className="stat-icon text-amber" />
                      </div>
                      <div className="stat-value">{metrics?.tomorrowBreakfast || 0}</div>
                      <div className="stat-link">
                        View Kitchen Counts <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => setActiveTab('kitchen')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Tomorrow's Dinner Count</span>
                        <Moon className="stat-icon text-indigo" />
                      </div>
                      <div className="stat-value">{metrics?.tomorrowDinner || 0}</div>
                      <div className="stat-link">
                        View Kitchen Counts <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => setActiveTab('billing')} style={{ cursor: 'pointer' }}>
                      <div className="stat-header">
                        <span className="stat-title">Monthly Mess Billing</span>
                        <DollarSign className="stat-icon text-emerald" />
                      </div>
                      <div className="stat-value">Billing System</div>
                      <div className="stat-link">
                        Manage Monthly Bills <ArrowRight className="icon-xs ml-1" />
                      </div>
                    </div>
                  </div>

                  <div className="quick-actions-card card">
                    <h3>Quick Operational Links</h3>
                    <div className="action-buttons-grid mt-4 flex gap-4">
                      <button className="btn-secondary" onClick={() => setActiveTab('students')}>
                        <Users className="icon-sm" /> Student Directory & Photo Uploads
                      </button>
                      <button className="btn-secondary" onClick={() => setActiveTab('kitchen')}>
                        <Coffee className="icon-sm" /> Kitchen Preparation Analytics
                      </button>
                      <button className="btn-secondary" onClick={() => setActiveTab('billing')}>
                        <DollarSign className="icon-sm" /> Mess Billing & Finalization
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
