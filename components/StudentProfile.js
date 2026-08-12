'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { User, Home, Phone, PhoneCall, MapPin, Mail, Calendar } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/students/me');
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading student profile..." />;

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

  const photoUrl = profile.profile_photo
    ? (profile.profile_photo.startsWith('http') ? profile.profile_photo : `${API_BASE_URL}${profile.profile_photo}`)
    : null;

  return (
    <div className="profile-container">
      <div className="card profile-card">
        <div className="profile-header">
          <div className="avatar-large">
            {photoUrl ? (
              <img src={photoUrl} alt={profile.full_name} className="avatar-img" />
            ) : (
              <User className="avatar-fallback" />
            )}
          </div>
          <div className="profile-header-info">
            <h2 className="profile-name">{profile.full_name}</h2>
            <div className="profile-badge">
              <Home className="icon-xs" /> Room: {profile.room_number}
            </div>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="detail-item">
            <Mail className="detail-icon" />
            <div>
              <span className="detail-label">Email Address</span>
              <span className="detail-value">{profile.email || 'N/A'}</span>
            </div>
          </div>

          <div className="detail-item">
            <Phone className="detail-icon" />
            <div>
              <span className="detail-label">Personal Contact</span>
              <span className="detail-value">{profile.personal_contact}</span>
            </div>
          </div>

          <div className="detail-item">
            <PhoneCall className="detail-icon text-warning" />
            <div>
              <span className="detail-label">Emergency Contact</span>
              <span className="detail-value">{profile.emergency_contact}</span>
            </div>
          </div>

          <div className="detail-item full-width">
            <MapPin className="detail-icon" />
            <div>
              <span className="detail-label">Permanent Address</span>
              <span className="detail-value">{profile.permanent_address}</span>
            </div>
          </div>

          <div className="detail-item">
            <Calendar className="detail-icon" />
            <div>
              <span className="detail-label">Registration Date</span>
              <span className="detail-value">{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
