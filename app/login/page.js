'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Building2, KeyRound, Phone, User, ShieldCheck, AlertCircle, Home, MapPin, Clock, UserPlus } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, user, loading: authLoading } = useAuth();

  // If user already has a persisted session, redirect directly to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      if (String(user?.role || '').toLowerCase() === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/student');
      }
    }
  }, [user, authLoading, router]);

  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState({
    full_name: '',
    mobile: '',
    room_number: '',
    password: '',
    permanent_address: '',
    emergency_contact: '',
  });

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPendingNotice, setIsPendingNotice] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const resetNotices = () => {
    setError(null);
    setIsPendingNotice(false);
    setSuccessMsg(null);
  };

  // If session is authenticating or user is already verified, show redirect spinner
  if (authLoading || user) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner label="Authenticating session..." />
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    resetNotices();
    setLoading(true);

    try {
      const loggedUser = await login(loginIdentifier, loginPassword);
      if (String(loggedUser?.role || '').toLowerCase() === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch (err) {
      if (err.isPending) {
        setIsPendingNotice(true);
      }
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    resetNotices();
    setLoading(true);

    try {
      const res = await signup(signupData);
      setSuccessMsg(res.message || 'Signup request submitted! Awaiting Admin approval.');
      setLoginIdentifier(signupData.mobile);
      setTab('login');
      setIsPendingNotice(true);
    } catch (err) {
      setError(err.message || 'Signup failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Building2 className="auth-logo" />
          <h1 className="auth-title">Shanthibavanam</h1>
          <p className="auth-subtitle">Hostel Management & Daily Meal Tracking</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); resetNotices(); }}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); resetNotices(); }}
          >
            Resident Signup
          </button>
        </div>

        {isPendingNotice && (
          <div className="alert alert-warning" style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <Clock className="alert-icon inline mr-2 text-amber" />
            <span>
              <strong>Registration Pending:</strong> Your account has been submitted and is awaiting approval by the Shanthibavanam Warden/Admin. You will be able to log in once approved.
            </span>
          </div>
        )}

        {error && !isPendingNotice && (
          <div className="alert alert-error">
            <AlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <ShieldCheck className="alert-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN TAB */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>Mobile Number / Email</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="Enter 10-digit mobile number (or admin email)"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                Residents: 10-digit mobile number | Admin: Email address
              </span>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <KeyRound className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {loading ? <LoadingSpinner label="Signing in..." /> : 'Sign In'}
            </button>
          </form>
        )}

        {/* 2. SIGNUP TAB */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="Resident Full Name"
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mobile Number (For Login)</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={signupData.mobile}
                  onChange={(e) => setSignupData({ ...signupData, mobile: e.target.value })}
                />
              </div>
              <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                This mobile number will be your permanent login ID.
              </span>
            </div>

            <div className="form-group">
              <label>Room Number</label>
              <div className="input-with-icon">
                <Home className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 204B"
                  value={signupData.room_number}
                  onChange={(e) => setSignupData({ ...signupData, room_number: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Create Password</label>
              <div className="input-with-icon">
                <KeyRound className="input-icon" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Permanent Address</label>
              <div className="input-with-icon">
                <MapPin className="input-icon" />
                <input
                  type="text"
                  placeholder="Town / City / District"
                  value={signupData.permanent_address}
                  onChange={(e) => setSignupData({ ...signupData, permanent_address: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Emergency Contact Number</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  placeholder="Parent / Guardian mobile"
                  value={signupData.emergency_contact}
                  onChange={(e) => setSignupData({ ...signupData, emergency_contact: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {loading ? <LoadingSpinner label="Submitting request..." /> : 'Submit Signup Request'}
            </button>
            <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '8px' }}>
              Note: Accounts require Admin approval before you can sign in.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
