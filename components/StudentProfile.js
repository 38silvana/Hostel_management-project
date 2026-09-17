'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { User, Home, Phone, PhoneCall, MapPin, Calendar, CheckCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function StudentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/students/me?user_id=${user.id}`);
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading resident profile..." />;

  if (error) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-container">
      <div className="card profile-card">
        <div className="profile-header">
          <div className="avatar-large">
            <div className="cell-avatar-placeholder" style={{ width: '64px', height: '64px', fontSize: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4f46e5', color: '#fff' }}>
              {profile.full_name ? profile.full_name[0].toUpperCase() : 'R'}
            </div>
          </div>
          <div className="profile-header-info">
            <h2 className="profile-name">{profile.full_name}</h2>
            <div className="profile-badge">
              <Home className="icon-xs mr-1 inline" /> Room {profile.room_number}
            </div>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="detail-item">
            <Phone className="detail-icon" />
            <div>
              <span className="detail-label">Mobile Number (Login ID)</span>
              <span className="detail-value">{profile.personal_contact || user?.mobile || 'N/A'}</span>
            </div>
          </div>

          <div className="detail-item">
            <CheckCircle className="detail-icon text-emerald" />
            <div>
              <span className="detail-label">Account Status</span>
              <span className="detail-value text-emerald">Approved Resident</span>
            </div>
          </div>

          <div className="detail-item">
            <PhoneCall className="detail-icon text-warning" />
            <div>
              <span className="detail-label">Emergency Contact</span>
              <span className="detail-value">{profile.emergency_contact || 'N/A'}</span>
            </div>
          </div>

          <div className="detail-item full-width">
            <MapPin className="detail-icon" />
            <div>
              <span className="detail-label">Permanent Address</span>
              <span className="detail-value">{profile.permanent_address || 'N/A'}</span>
            </div>
          </div>

          <div className="detail-item">
            <Calendar className="detail-icon" />
            <div>
              <span className="detail-label">Admission Date</span>
              <span className="detail-value">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
