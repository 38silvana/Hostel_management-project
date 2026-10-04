'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, UserPlus, Edit, Trash2, Home, CheckCircle, AlertCircle, Phone, Clock, UserCheck, Shield, FileText, Eye, User, Calendar, MapPin, Briefcase, GraduationCap, Users, X, Car } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'approved'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    personal_contact: '',
    room_number: '',
    password: '',
    permanent_address: '',
    emergency_contact: '',
    fee_status: 'pending',
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch(`/students${query}`);
      setStudents(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch resident list.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (student) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch(`/students/${student.id}/approve`, {
        method: 'POST',
      });
      setSuccess(res.message || `Resident "${student.full_name}" has been approved!`);
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent({ ...selectedStudent, approval_status: 'approved' });
      }
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to approve resident.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailModal = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccess('Resident account created and approved successfully!');
      setShowAddModal(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to create resident.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);
    setError(null);

    try {
      await apiFetch(`/students/${selectedStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: formData.full_name,
          room_number: formData.room_number,
          permanent_address: formData.permanent_address,
          personal_contact: formData.personal_contact,
          emergency_contact: formData.emergency_contact,
          fee_status: formData.fee_status,
        }),
      });
      setSuccess('Resident details updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to update resident.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete resident "${studentName}"? This will permanently remove their profile and login.`)) return;
    try {
      await apiFetch(`/students/${studentId}`, { method: 'DELETE' });
      setSuccess(`Resident "${studentName}" deleted.`);
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to delete resident.');
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      full_name: student.full_name || '',
      room_number: student.room_number || '',
      personal_contact: student.personal_contact || '',
      emergency_contact: student.emergency_contact || '',
      permanent_address: student.permanent_address || '',
      fee_status: student.fee_status || 'pending',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      personal_contact: '',
      room_number: '',
      password: '',
      permanent_address: '',
      emergency_contact: '',
      fee_status: 'pending',
    });
    setSelectedStudent(null);
  };

  const pendingCount = students.filter((s) => s.approval_status === 'pending').length;

  const filteredStudents = students.filter((s) => {
    if (filterTab === 'pending') return s.approval_status === 'pending';
    if (filterTab === 'approved') return s.approval_status === 'approved';
    return true;
  });

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Resident Management & Approvals</h2>
          <p className="subtitle">Manage Shanthibavanam hostel residents, review pending signups, and maintain room allocations.</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <UserPlus className="icon-sm" /> Add Resident Directly
        </button>
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

      {/* Tabs & Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div className="auth-tabs" style={{ margin: 0, flexWrap: 'wrap' }}>
          <button
            className={`tab-btn ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All Residents ({students.length})
          </button>
          <button
            className={`tab-btn ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
            style={{ position: 'relative' }}
          >
            Pending Approvals
            {pendingCount > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '12px',
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
          <button
            className={`tab-btn ${filterTab === 'approved' ? 'active' : ''}`}
            onClick={() => setFilterTab('approved')}
          >
            Approved ({students.length - pendingCount})
          </button>
        </div>

        <div className="search-bar" style={{ maxWidth: '320px', margin: 0 }}>
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search name, room, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading resident records..." />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resident Name</th>
                  <th>Room No</th>
                  <th>Mobile Number</th>
                  <th>Account Status</th>
                  <th>Emergency / Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center text-muted"
                      style={{ textAlign: 'center', padding: '32px' }}
                    >
                      {filterTab === 'pending'
                        ? 'No pending registration requests. All resident signups are up to date!'
                        : 'No resident records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      style={{ background: s.approval_status === 'pending' ? '#fffdf7' : 'inherit' }}
                    >
                      <td>
                        <div className="user-cell">
                          {s.profile_photo_url || s.profile_photo ? (
                            <img
                              src={s.profile_photo_url || s.profile_photo}
                              alt={s.full_name}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid #c7d2fe',
                              }}
                            />
                          ) : (
                            <div
                              className="cell-avatar-placeholder"
                              style={{
                                background: s.approval_status === 'pending' ? '#f59e0b' : '#4f46e5',
                              }}
                            >
                              {s.full_name ? s.full_name[0].toUpperCase() : 'R'}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold block">{s.full_name}</span>
                            <span className="text-xs text-muted">ID #{s.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-outline">
                          <Home className="icon-xs inline mr-1" /> Room {s.room_number}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">
                          <Phone className="icon-xs inline mr-1 text-muted" />
                          <strong>{s.personal_contact || 'N/A'}</strong>
                        </div>
                      </td>
                      <td>
                        {s.approval_status === 'pending' ? (
                          <span
                            className="badge badge-warning"
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                            }}
                          >
                            <Clock className="icon-xs inline mr-1" /> PENDING APPROVAL
                          </span>
                        ) : (
                          <span
                            className="badge badge-success"
                            style={{
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <UserCheck className="icon-xs inline mr-1" /> APPROVED
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs text-muted">
                          <div>Emergency: {s.emergency_contact || 'N/A'}</div>
                          <div>Address: {s.permanent_address || 'N/A'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons" style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="View Full Admission Application"
                            onClick={() => openDetailModal(s)}
                          >
                            <FileText className="icon-xs" /> View
                          </button>
                          {s.approval_status === 'pending' && (
                            <button
                              className="btn-primary"
                              style={{
                                padding: '4px 10px',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Approve Resident"
                              onClick={() => handleApprove(s)}
                              disabled={actionLoading}
                            >
                              <CheckCircle className="icon-xs" /> Approve
                            </button>
                          )}
                          <button
                            className="btn-icon"
                            title="Edit Resident"
                            onClick={() => openEditModal(s)}
                          >
                            <Edit className="icon-xs" />
                          </button>
                          <button
                            className="btn-icon danger"
                            title="Delete Resident"
                            onClick={() => handleDelete(s.id, s.full_name)}
                          >
                            <Trash2 className="icon-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW (No horizontal scrolling on phones) */}
          <div className="mobile-only mobile-card-list">
            {filteredStudents.length === 0 ? (
              <div
                className="card text-center text-muted"
                style={{ textAlign: 'center', padding: '24px' }}
              >
                {filterTab === 'pending'
                  ? 'No pending registration requests. All resident signups are up to date!'
                  : 'No resident records found.'}
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.id}
                  className="mobile-data-card"
                  style={{
                    borderLeft:
                      s.approval_status === 'pending' ? '4px solid #f59e0b' : '4px solid #10b981',
                  }}
                >
                  <div className="mobile-card-header">
                    <div className="user-cell">
                      <div
                        className="cell-avatar-placeholder"
                        style={{
                          width: '38px',
                          height: '38px',
                          fontSize: '15px',
                          background: s.approval_status === 'pending' ? '#f59e0b' : '#4f46e5',
                        }}
                      >
                        {s.full_name ? s.full_name[0].toUpperCase() : 'R'}
                      </div>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{s.full_name}</strong>
                        <span className="text-xs text-muted block">ID #{s.id}</span>
                      </div>
                    </div>
                    <span className="badge badge-outline">Room {s.room_number}</span>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-item">
                      <span className="mobile-card-label">Mobile (Login)</span>
                      <span className="mobile-card-val">{s.personal_contact || 'N/A'}</span>
                    </div>
                    <div className="mobile-card-item">
                      <span className="mobile-card-label">Status</span>
                      <div>
                        {s.approval_status === 'pending' ? (
                          <span
                            className="badge badge-warning"
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              fontSize: '11px',
                              padding: '2px 6px',
                            }}
                          >
                            Pending
                          </span>
                        ) : (
                          <span
                            className="badge badge-success"
                            style={{
                              background: '#dcfce7',
                              color: '#166534',
                              fontSize: '11px',
                              padding: '2px 6px',
                            }}
                          >
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(s.emergency_contact || s.permanent_address) && (
                    <div className="text-xs text-muted" style={{ lineHeight: 1.4 }}>
                      {s.emergency_contact && <div>Emergency: <strong>{s.emergency_contact}</strong></div>}
                      {s.permanent_address && <div>Address: {s.permanent_address}</div>}
                    </div>
                  )}

                  <div className="mobile-card-actions">
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      onClick={() => openDetailModal(s)}
                    >
                      <FileText className="icon-xs" /> View
                    </button>
                    {s.approval_status === 'pending' && (
                      <button
                        className="btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          flex: 1,
                        }}
                        onClick={() => handleApprove(s)}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="icon-xs" /> Approve
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      onClick={() => openEditModal(s)}
                    >
                      <Edit className="icon-xs" /> Edit
                    </button>
                    <button
                      className="btn-icon danger"
                      style={{ padding: '6px 10px' }}
                      title="Delete Resident"
                      onClick={() => handleDelete(s.id, s.full_name)}
                    >
                      <Trash2 className="icon-xs" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Add New Resident (Direct Admin Entry)</h3>
            <p className="text-xs text-muted mb-4">Resident added by Admin will be immediately approved for login.</p>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Resident Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number (Login ID)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.personal_contact}
                    onChange={(e) => setFormData({ ...formData, personal_contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Room Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204B"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    placeholder="Defaults to Hostel@123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Parent / Guardian contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Permanent Address</label>
                  <input
                    type="text"
                    placeholder="City / District"
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Creating...' : 'Save & Approve Resident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Edit Resident Details ({selectedStudent?.full_name})</h3>
            <form onSubmit={handleUpdate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Room Number</label>
                  <input
                    type="text"
                    required
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mobile Contact</label>
                  <input
                    type="text"
                    required
                    value={formData.personal_contact}
                    onChange={(e) => setFormData({ ...formData, personal_contact: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Permanent Address</label>
                <input
                  type="text"
                  value={formData.permanent_address}
                  onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Admission Details Modal */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="admission-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                  HOSTEL ADMISSION APPLICATION DETAILS
                </h3>
                <span className="text-xs text-muted">
                  Resident Record #{selectedStudent.id} • Registered on {selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowDetailModal(false)}
                title="Close"
              >
                <X className="icon-sm" />
              </button>
            </div>

            {/* Profile Header Card */}
            <div className="admission-modal-profile-header">
              {selectedStudent.profile_photo_url || selectedStudent.profile_photo ? (
                <img
                  src={selectedStudent.profile_photo_url || selectedStudent.profile_photo}
                  alt={selectedStudent.full_name}
                  className="admission-modal-photo"
                />
              ) : (
                <div
                  className="cell-avatar-placeholder"
                  style={{
                    width: '88px',
                    height: '88px',
                    fontSize: '32px',
                    background: selectedStudent.approval_status === 'pending' ? '#f59e0b' : '#4f46e5',
                    borderRadius: '50%',
                  }}
                >
                  {selectedStudent.full_name ? selectedStudent.full_name[0].toUpperCase() : 'R'}
                </div>
              )}

              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{selectedStudent.full_name}</h2>
                  <span className="badge badge-outline">Room {selectedStudent.room_number || 'N/A'}</span>
                  {selectedStudent.approval_status === 'pending' ? (
                    <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                      <Clock className="icon-xs inline mr-1" /> PENDING APPROVAL
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                      <CheckCircle className="icon-xs inline mr-1" /> APPROVED
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>📱 Mobile: <strong>{selectedStudent.personal_contact || 'N/A'}</strong></span>
                  {selectedStudent.email && <span>✉️ Email: {selectedStudent.email}</span>}
                </div>
              </div>

              {selectedStudent.approval_status === 'pending' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleApprove(selectedStudent)}
                  disabled={actionLoading}
                >
                  <CheckCircle className="icon-sm" /> Approve Application
                </button>
              )}
            </div>

            {/* Section A: Applicant Details */}
            <div className="admission-section">
              <div className="admission-section-header">
                <User className="admission-section-icon" />
                <h4 className="admission-section-title">A. Applicant Details</h4>
              </div>
              <div className="admission-info-grid">
                <div className="admission-info-item">
                  <span className="admission-info-label">Full Name</span>
                  <span className="admission-info-val">{selectedStudent.full_name || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Mobile Number (Login ID)</span>
                  <span className="admission-info-val">{selectedStudent.personal_contact || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Age</span>
                  <span className="admission-info-val">{selectedStudent.age ? `${selectedStudent.age} years` : 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Date of Birth</span>
                  <span className="admission-info-val">{selectedStudent.date_of_birth || 'N/A'}</span>
                </div>
                <div className="admission-info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="admission-info-label">Permanent Address</span>
                  <span className="admission-info-val">{selectedStudent.permanent_address || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section B: Study / Work Details */}
            <div className="admission-section">
              <div className="admission-section-header">
                <GraduationCap className="admission-section-icon" />
                <h4 className="admission-section-title">B. Study / Work Details</h4>
              </div>
              <div className="admission-info-grid">
                <div className="admission-info-item">
                  <span className="admission-info-label">Programme of Study</span>
                  <span className="admission-info-val">{selectedStudent.programme_of_study || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Name of Institute</span>
                  <span className="admission-info-val">{selectedStudent.institute || 'N/A'}</span>
                </div>
                <div className="admission-info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="admission-info-label">Firm / Workplace Details (if working)</span>
                  <span className="admission-info-val">{selectedStudent.firm_details || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section C: Parent / Guardian Details */}
            <div className="admission-section">
              <div className="admission-section-header">
                <Users className="admission-section-icon" />
                <h4 className="admission-section-title">C. Parent / Guardian Details</h4>
              </div>
              <div className="admission-info-grid">
                <div className="admission-info-item">
                  <span className="admission-info-label">Parent / Guardian Name</span>
                  <span className="admission-info-val">{selectedStudent.parent_guardian_name || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Relationship</span>
                  <span className="admission-info-val">{selectedStudent.relationship || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Occupation</span>
                  <span className="admission-info-val">{selectedStudent.occupation || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Contact Number</span>
                  <span className="admission-info-val">{selectedStudent.parent_contact || 'N/A'}</span>
                </div>
                <div className="admission-info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="admission-info-label">Parent / Guardian Address</span>
                  <span className="admission-info-val">{selectedStudent.parent_address || selectedStudent.permanent_address || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section D: Hostel Details */}
            <div className="admission-section">
              <div className="admission-section-header">
                <Home className="admission-section-icon" />
                <h4 className="admission-section-title">D. Hostel Details</h4>
              </div>
              <div className="admission-info-grid">
                <div className="admission-info-item">
                  <span className="admission-info-label">Allocated Room Number</span>
                  <span className="admission-info-val">Room {selectedStudent.room_number || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Date of Admission</span>
                  <span className="admission-info-val">{selectedStudent.date_of_admission || (selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : 'N/A')}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Emergency Contact Number</span>
                  <span className="admission-info-val">📞 {selectedStudent.emergency_contact || 'N/A'}</span>
                </div>
                <div className="admission-info-item">
                  <span className="admission-info-label">Using Vehicle in Hostel</span>
                  <span className="admission-info-val">
                    <span className={`badge ${selectedStudent.vehicle_usage === 'Yes' ? 'badge-yes' : 'badge-outline'}`}>
                      {selectedStudent.vehicle_usage === 'Yes' ? '🚗 Yes' : 'No'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Declaration Status */}
            <div className="declaration-container" style={{ margin: 0 }}>
              <span className="declaration-badge">DECLARATION STATUS</span>
              <p className="declaration-statement" style={{ margin: 0, fontSize: '13px' }}>
                &ldquo;I do hereby declare that the information furnished above are true to my knowledge and I have gone through the rules of the hostel and I agree to obey them.&rdquo;
              </p>
              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 600, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Agreed &amp; Accepted by applicant during submission
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedStudent);
                }}
              >
                <Edit className="icon-xs inline mr-1" /> Edit Details
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
