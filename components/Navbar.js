'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { LogOut, User, Building2, Utensils, Receipt } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Building2 className="icon-brand" />
          <div>
            <span className="brand-title">Hostel Management</span>
            <span className="brand-subtitle">Meal Tracking System (Next.js)</span>
          </div>
        </div>

        <nav className="navbar-links">
          {isAdmin ? (
            <>
              <button
                className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`nav-btn ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                Students
              </button>
              <button
                className={`nav-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
                onClick={() => setActiveTab('kitchen')}
              >
                Kitchen Counts
              </button>
              <button
                className={`nav-btn ${activeTab === 'billing' ? 'active' : ''}`}
                onClick={() => setActiveTab('billing')}
              >
                Monthly Billing
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-btn ${activeTab === 'meals' ? 'active' : ''}`}
                onClick={() => setActiveTab('meals')}
              >
                <Utensils className="icon-sm" /> Meal Selection
              </button>
              <button
                className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <User className="icon-sm" /> My Profile
              </button>
            </>
          )}
        </nav>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user.full_name}</span>
            <span className={`role-badge ${user.role}`}>
              {user.role.toUpperCase()}
            </span>
          </div>
          <button className="btn-logout" onClick={logout} title="Logout">
            <LogOut className="icon-sm" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
