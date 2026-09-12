'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { Search, UserPlus, Upload, Edit, Trash2, Home, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    room_number: '',
    permanent_address: '',
    personal_contact: '',
    emergency_contact: '',
    fee_status: 'pending'
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch(`/students${query}`);
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch student list.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setSuccess('Student created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to create student.');
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
          fee_status: formData.fee_status
        })
      });
      setSuccess('Student updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to update student.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}"?`)) return;
    try {
      await apiFetch(`/students/${studentId}`, { method: 'DELETE' });
      setSuccess(`Student "${studentName}" deleted.`);
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to delete student.');
    }
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !photoFile) return;
    setActionLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append('file', photoFile);

    try {
      await apiFetch(`/students/${selectedStudent.id}/upload-photo`, {
        method: 'POST',
        body: fd
      });
      setSuccess('Photo uploaded successfully!');
      setShowPhotoModal(false);
      setPhotoFile(null);
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      email: student.email || '',
      password: '',
      full_name: student.full_name,
      room_number: student.room_number,
      permanent_address: student.permanent_address,
      personal_contact: student.personal_contact,
      emergency_contact: student.emergency_contact,
      fee_status: student.fee_status
    });
    setShowEditModal(true);
  };

  const openPhotoModal = (student) => {
    setSelectedStudent(student);
    setPhotoFile(null);
    setShowPhotoModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      room_number: '',
      permanent_address: '',
      personal_contact: '',
      emergency_contact: '',
      fee_status: 'pending'
    });
    setSelectedStudent(null);
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Student Records Management</h2>
          <p className="subtitle">View, search, register, update, and manage Shanthibavanam hostel students.</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <UserPlus className="icon-sm" /> Add New Student
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

      <div className="search-bar">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search students by name, email, or room number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner label="Loading student directory..." />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Room</th>
                <th>Email / Contact</th>
                <th>Fee Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No student records found matching "{search}"
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="user-cell">
                        {s.profile_photo ? (
                          <img
                            src={s.profile_photo.startsWith('http') ? s.profile_photo : `${API_BASE_URL}${s.profile_photo}`}
                            alt={s.full_name}
                            className="cell-avatar"
                          />
                        ) : (
                          <div className="cell-avatar-placeholder">{s.full_name[0]}</div>
                        )}
                        <div>
                          <span className="font-semibold">{s.full_name}</span>
                          <span className="text-sm text-muted block">{s.permanent_address}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-outline"><Home className="icon-xs inline" /> {s.room_number}</span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <div>{s.email}</div>
                        <div className="text-muted">{s.personal_contact}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.fee_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {s.fee_status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="Upload Photo" onClick={() => openPhotoModal(s)}>
                          <Upload className="icon-xs" />
                        </button>
                        <button className="btn-icon" title="Edit Profile" onClick={() => openEditModal(s)}>
                          <Edit className="icon-xs" />
                        </button>
                        <button className="btn-icon danger" title="Delete Student" onClick={() => handleDelete(s.id, s.full_name)}>
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
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Add New Student</h3>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Initial Password</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Room Number</label>
                  <input type="text" required value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Personal Contact</label>
                  <input type="text" required value={formData.personal_contact} onChange={(e) => setFormData({ ...formData, personal_contact: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input type="text" required value={formData.emergency_contact} onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Permanent Address</label>
                <input type="text" required value={formData.permanent_address} onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Fee Status</label>
                <select value={formData.fee_status} onChange={(e) => setFormData({ ...formData, fee_status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Creating...' : 'Save Student'}
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
            <h3>Edit Student Profile ({selectedStudent?.full_name})</h3>
            <form onSubmit={handleUpdate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Room Number</label>
                  <input type="text" required value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Personal Contact</label>
                  <input type="text" required value={formData.personal_contact} onChange={(e) => setFormData({ ...formData, personal_contact: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input type="text" required value={formData.emergency_contact} onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Permanent Address</label>
                <input type="text" required value={formData.permanent_address} onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Fee Status</label>
                <select value={formData.fee_status} onChange={(e) => setFormData({ ...formData, fee_status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Updating...' : 'Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Upload Profile Photo ({selectedStudent?.full_name})</h3>
            <form onSubmit={handleUploadPhoto} className="modal-form">
              <div className="form-group">
                <label>Select Image File (.jpg, .png)</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPhotoModal(false)}>Cancel</button>
                <button type="submit" disabled={actionLoading || !photoFile} className="btn-primary">
                  {actionLoading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
