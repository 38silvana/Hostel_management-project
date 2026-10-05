'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  KeyRound,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  Home,
  MapPin,
  Clock,
  Camera,
  Upload,
  Briefcase,
  GraduationCap,
  Users,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, user, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);

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
  const [currentStep, setCurrentStep] = useState(1); // 1 | 2 | 3 | 4

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Admission Application form state
  const [admissionData, setAdmissionData] = useState({
    // Step 1: Applicant Details
    full_name: '',
    mobile: '',
    age: '',
    date_of_birth: '',
    permanent_address: '',
    profile_photo_url: '',

    // Step 2: Study / Work & Guardian Details
    programme_of_study: '',
    institute: '',
    firm_details: '',
    parent_guardian_name: '',
    relationship: 'Father',
    occupation: '',
    parent_contact: '',
    parent_address: '',

    // Step 3: Hostel Details
    emergency_contact: '',
    vehicle_usage: 'No', // 'Yes' | 'No'
    date_of_admission: new Date().toISOString().split('T')[0],
    room_number: '',
    password: '',

    // Step 4: Declaration
    declaration_accepted: false,
  });

  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPendingNotice, setIsPendingNotice] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const resetNotices = () => {
    setError(null);
    setIsPendingNotice(false);
    setSuccessMsg(null);
    setPhotoError(null);
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

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo size exceeds 5MB. Please upload a smaller image.');
      return;
    }

    setPhotoError(null);
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    // Upload to server Supabase Storage
    try {
      setPhotoUploading(true);
      const fd = new FormData();
      fd.append('photo', file);

      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        body: fd,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to upload photo.');
      }

      setAdmissionData((prev) => ({
        ...prev,
        profile_photo_url: resData.photo_url,
      }));
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError(err.message || 'Failed to upload photo to storage.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setAdmissionData((prev) => ({ ...prev, profile_photo_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step Validation Logic
  const validateStep = (step) => {
    setError(null);

    if (step === 1) {
      if (!admissionData.full_name || !admissionData.full_name.trim()) {
        setError('Please enter Name of the Applicant.');
        return false;
      }
      const cleanMob = admissionData.mobile.replace(/\D/g, '');
      if (cleanMob.length !== 10) {
        setError('Please enter a valid 10-digit mobile number for resident login.');
        return false;
      }
      const parsedAge = parseInt(admissionData.age, 10);
      if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        setError('Please enter a valid age in years.');
        return false;
      }
      if (!admissionData.date_of_birth || !admissionData.date_of_birth.trim()) {
        setError('Please select Date of Birth.');
        return false;
      }
      if (!admissionData.permanent_address || !admissionData.permanent_address.trim()) {
        setError('Please enter Permanent Address.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!admissionData.parent_guardian_name || !admissionData.parent_guardian_name.trim()) {
        setError('Please enter Name of Parent / Guardian.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!admissionData.emergency_contact || !admissionData.emergency_contact.trim()) {
        setError('Please enter Emergency Contact Number.');
        return false;
      }
      if (!admissionData.room_number || !admissionData.room_number.trim()) {
        setError('Please enter Room Number.');
        return false;
      }
      if (!admissionData.password || admissionData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setError(null);
      setCurrentStep((prev) => Math.min(4, prev + 1));
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      if (currentStep < 4) {
        e.preventDefault();
        handleNextStep();
      }
    }
  };

  const handleAdmissionSubmit = async (e) => {
    e.preventDefault();
    resetNotices();

    // Verify all steps in case submitted directly
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }

    // 1. Mandatory Declaration Check
    if (!admissionData.declaration_accepted) {
      setError('Please accept the declaration by ticking the checkbox before submitting your application.');
      const declEl = document.getElementById('declaration-checkbox');
      if (declEl) declEl.focus();
      return;
    }

    const cleanMob = admissionData.mobile.replace(/\D/g, '');

    setLoading(true);

    try {
      const res = await signup(admissionData);
      setSuccessMsg(res.message || 'Hostel Admission Application submitted successfully! Awaiting Admin approval.');
      setLoginIdentifier(cleanMob);
      setTab('login');
      setIsPendingNotice(true);
      setCurrentStep(1); // Reset to first step for future applications
    } catch (err) {
      setError(err.message || 'Application submission failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Steps definition for progress indicator: 1 Applicant → 2 Guardian → 3 Hostel → 4 Declaration
  const STEP_ITEMS = [
    { num: 1, label: 'Applicant', title: 'Applicant Details' },
    { num: 2, label: 'Guardian', title: 'Study / Work & Guardian Details' },
    { num: 3, label: 'Hostel', title: 'Hostel Details' },
    { num: 4, label: 'Declaration', title: 'Declaration & Submit' },
  ];

  return (
    <div className="auth-container">
      <div className={`auth-card ${tab === 'signup' ? 'admission-mode' : ''}`}>
        <div className="auth-header">
          <Building2 className="auth-logo" />
          <h1 className="auth-title">Shanthibavanam</h1>
          <p className="auth-subtitle">Hostel Management &amp; Daily Meal Tracking</p>
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
            Admission Application
          </button>
        </div>

        {isPendingNotice && (
          <div className="alert alert-warning" style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <Clock className="alert-icon inline mr-2 text-amber" />
            <span>
              <strong>Application Pending Approval:</strong> Your admission application has been submitted and is awaiting approval by the Shanthibavanam Warden/Admin. You will be able to log in once approved.
            </span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4" style={{ marginBottom: '16px' }}>
            <AlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success mb-4" style={{ marginBottom: '16px' }}>
            <ShieldCheck className="alert-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. SIGN IN TAB */}
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
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <KeyRound className="input-icon" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {loading ? <LoadingSpinner label="Signing in..." /> : 'Sign In'}
            </button>
          </form>
        )}

        {/* 2. ADMISSION APPLICATION TAB (4-STEP FORM) */}
        {tab === 'signup' && (
          <form onSubmit={handleAdmissionSubmit} onKeyDown={handleKeyDown} className="auth-form" noValidate>
            {/* Top Main Heading */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h2 className="admission-main-title">APPLICATION FOR HOSTEL ADMISSION</h2>
              <p className="admission-main-subtitle">
                Please complete the application form step-by-step.
              </p>
            </div>

            {/* Progress Indicator: 1 Applicant → 2 Guardian → 3 Hostel → 4 Declaration */}
            <div className="stepper-wrapper" role="region" aria-label="Admission steps progress">
              <div className="stepper-progress-bar">
                <div
                  className="stepper-progress-fill"
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                />
              </div>

              <div className="stepper-steps">
                {STEP_ITEMS.map((item, idx) => {
                  const isCompleted = currentStep > item.num;
                  const isActive = currentStep === item.num;
                  const isClickable = item.num < currentStep;

                  return (
                    <React.Fragment key={item.num}>
                      <button
                        type="button"
                        className={`stepper-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
                        onClick={() => {
                          if (isClickable) {
                            setError(null);
                            setCurrentStep(item.num);
                          }
                        }}
                        disabled={!isClickable && !isActive}
                        title={isClickable ? `Return to Step ${item.num}: ${item.title}` : `Step ${item.num}: ${item.title}`}
                      >
                        <span className="stepper-node-circle">
                          {isCompleted ? <CheckCircle size={15} /> : item.num}
                        </span>
                        <span className="stepper-node-label">{item.label}</span>
                      </button>
                      {idx < STEP_ITEMS.length - 1 && (
                        <span className={`stepper-node-arrow ${isCompleted ? 'completed' : ''}`}>→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="stepper-current-label">
                <span className="stepper-current-pill">Step {currentStep} of 4</span>
                <span className="stepper-current-title">
                  {STEP_ITEMS[currentStep - 1]?.title}
                </span>
              </div>
            </div>

            {/* =========================================================
                STEP 1: APPLICANT DETAILS
                ========================================================= */}
            {currentStep === 1 && (
              <div className="admission-step-pane">
                <div className="admission-section">
                  <div className="admission-section-header">
                    <User className="admission-section-icon" />
                    <h3 className="admission-section-title">Step 1 – Applicant Details</h3>
                  </div>

                  {/* 1. Photo Upload */}
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label>Applicant Photo</label>
                    <div className="photo-upload-container">
                      {photoPreview || admissionData.profile_photo_url ? (
                        <img
                          src={photoPreview || admissionData.profile_photo_url}
                          alt="Applicant Preview"
                          className="photo-preview-circle"
                        />
                      ) : (
                        <div className="photo-placeholder-circle">
                          <Camera size={28} />
                        </div>
                      )}

                      <div className="photo-upload-controls">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          onChange={handlePhotoSelect}
                        />

                        <button
                          type="button"
                          className="photo-select-btn"
                          disabled={photoUploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload size={14} />
                          {photoUploading
                            ? 'Uploading...'
                            : photoPreview || admissionData.profile_photo_url
                            ? 'Change Photo'
                            : 'Upload Photo'}
                        </button>

                        {(photoPreview || admissionData.profile_photo_url) && (
                          <button
                            type="button"
                            className="photo-remove-btn"
                            onClick={handleRemovePhoto}
                          >
                            Remove photo
                          </button>
                        )}

                        <span className="text-xs text-muted">
                          JPG, PNG, or WEBP up to 5MB.
                        </span>

                        {photoError && (
                          <span className="text-xs" style={{ color: '#ef4444' }}>
                            {photoError}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Full Name & 3. Mobile Number */}
                  <div className="admission-grid-2">
                    <div className="form-group">
                      <label>
                        Name of the Applicant <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="input-with-icon">
                        <User className="input-icon" />
                        <input
                          type="text"
                          required
                          placeholder="Full Name as per records"
                          value={admissionData.full_name}
                          onChange={(e) => setAdmissionData({ ...admissionData, full_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        Mobile Number (For Login) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="input-with-icon">
                        <Phone className="input-icon" />
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          value={admissionData.mobile}
                          onChange={(e) => setAdmissionData({ ...admissionData, mobile: e.target.value.replace(/\D/g, '') })}
                        />
                      </div>
                      <span className="text-xs text-muted">
                        This mobile number will be used for resident login.
                      </span>
                    </div>
                  </div>

                  {/* 4. Age & 5. Date of Birth */}
                  <div className="admission-grid-2" style={{ marginTop: '0.875rem' }}>
                    <div className="form-group">
                      <label>
                        Age <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={14}
                        max={100}
                        placeholder="e.g. 21"
                        value={admissionData.age}
                        onChange={(e) => setAdmissionData({ ...admissionData, age: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Date of Birth <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={admissionData.date_of_birth}
                        onChange={(e) => setAdmissionData({ ...admissionData, date_of_birth: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 6. Permanent Address */}
                  <div className="form-group" style={{ marginTop: '0.875rem' }}>
                    <label>
                      Permanent Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      required
                      placeholder="House Name / No., Street, City/Town, District, State, PIN"
                      value={admissionData.permanent_address}
                      onChange={(e) => setAdmissionData({ ...admissionData, permanent_address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="step-nav-bar right-only">
                  <button
                    type="button"
                    className="btn-primary step-nav-btn"
                    onClick={handleNextStep}
                  >
                    <span>Next: Guardian Details</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                STEP 2: STUDY / WORK & GUARDIAN DETAILS
                ========================================================= */}
            {currentStep === 2 && (
              <div className="admission-step-pane">
                <div className="admission-section">
                  <div className="admission-section-header">
                    <GraduationCap className="admission-section-icon" />
                    <h3 className="admission-section-title">Step 2 – Study / Work &amp; Guardian Details</h3>
                  </div>

                  <div className="admission-subsection-title">
                    <Briefcase size={15} />
                    <span>Study / Work Details</span>
                  </div>

                  <div className="admission-grid-2">
                    {/* Programme of Study */}
                    <div className="form-group">
                      <label>Programme of Study</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech / MBA / MBBS"
                        value={admissionData.programme_of_study}
                        onChange={(e) => setAdmissionData({ ...admissionData, programme_of_study: e.target.value })}
                      />
                    </div>

                    {/* Institute */}
                    <div className="form-group">
                      <label>Institute / College</label>
                      <input
                        type="text"
                        placeholder="College / University Name"
                        value={admissionData.institute}
                        onChange={(e) => setAdmissionData({ ...admissionData, institute: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Details of Firm */}
                  <div className="form-group" style={{ marginTop: '0.875rem' }}>
                    <label>Firm / Workplace Details (For Working Residents)</label>
                    <input
                      type="text"
                      placeholder="Company / Firm name, Designation, Office address"
                      value={admissionData.firm_details}
                      onChange={(e) => setAdmissionData({ ...admissionData, firm_details: e.target.value })}
                    />
                    <span className="text-xs text-muted">
                      If working instead of studying, please provide firm &amp; employment details.
                    </span>
                  </div>

                  {/* Parent / Guardian Subsection */}
                  <div className="admission-subsection-title" style={{ marginTop: '1.25rem' }}>
                    <Users size={15} />
                    <span>Parent / Guardian Details</span>
                  </div>

                  <div className="admission-grid-2">
                    {/* Parent / Guardian Name */}
                    <div className="form-group">
                      <label>
                        Parent / Guardian Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Parent / Guardian Name"
                        value={admissionData.parent_guardian_name}
                        onChange={(e) => setAdmissionData({ ...admissionData, parent_guardian_name: e.target.value })}
                      />
                    </div>

                    {/* Relationship */}
                    <div className="form-group">
                      <label>Relationship</label>
                      <select
                        value={admissionData.relationship}
                        onChange={(e) => setAdmissionData({ ...admissionData, relationship: e.target.value })}
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="admission-grid-2" style={{ marginTop: '0.875rem' }}>
                    {/* Occupation */}
                    <div className="form-group">
                      <label>Occupation</label>
                      <input
                        type="text"
                        placeholder="Parent / Guardian Occupation"
                        value={admissionData.occupation}
                        onChange={(e) => setAdmissionData({ ...admissionData, occupation: e.target.value })}
                      />
                    </div>

                    {/* Parent Contact Number */}
                    <div className="form-group">
                      <label>Parent / Guardian Contact Number</label>
                      <input
                        type="tel"
                        placeholder="Parent Phone Number"
                        value={admissionData.parent_contact}
                        onChange={(e) => setAdmissionData({ ...admissionData, parent_contact: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Parent Address */}
                  <div className="form-group" style={{ marginTop: '0.875rem' }}>
                    <label>Parent / Guardian Address</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Address if different from Permanent Address (or leave blank if same)"
                      value={admissionData.parent_address}
                      onChange={(e) => setAdmissionData({ ...admissionData, parent_address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="step-nav-bar">
                  <button
                    type="button"
                    className="btn-secondary step-nav-btn"
                    onClick={handlePrevStep}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    className="btn-primary step-nav-btn"
                    onClick={handleNextStep}
                  >
                    <span>Next: Hostel Details</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                STEP 3: HOSTEL DETAILS
                ========================================================= */}
            {currentStep === 3 && (
              <div className="admission-step-pane">
                <div className="admission-section">
                  <div className="admission-section-header">
                    <Home className="admission-section-icon" />
                    <h3 className="admission-section-title">Step 3 – Hostel Details</h3>
                  </div>

                  <div className="admission-grid-2">
                    {/* Emergency Contact Number */}
                    <div className="form-group">
                      <label>
                        Emergency Contact Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="input-with-icon">
                        <Phone className="input-icon" />
                        <input
                          type="tel"
                          required
                          placeholder="Emergency Mobile Number"
                          value={admissionData.emergency_contact}
                          onChange={(e) => setAdmissionData({ ...admissionData, emergency_contact: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Room Number */}
                    <div className="form-group">
                      <label>
                        Room Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="input-with-icon">
                        <Home className="input-icon" />
                        <input
                          type="text"
                          required
                          placeholder="Allocated / Preferred Room No (e.g. 101)"
                          value={admissionData.room_number}
                          onChange={(e) => setAdmissionData({ ...admissionData, room_number: e.target.value })}
                        />
                      </div>
                      <span className="text-xs text-muted">
                        This can be updated by the Warden/Admin.
                      </span>
                    </div>
                  </div>

                  <div className="admission-grid-2" style={{ marginTop: '0.875rem' }}>
                    {/* Vehicle Usage */}
                    <div className="form-group">
                      <label>Vehicle Usage</label>
                      <div className="vehicle-radio-group">
                        <label className={`vehicle-radio-option ${admissionData.vehicle_usage === 'Yes' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="vehicle_usage"
                            value="Yes"
                            checked={admissionData.vehicle_usage === 'Yes'}
                            onChange={(e) => setAdmissionData({ ...admissionData, vehicle_usage: e.target.value })}
                          />
                          <span>Yes</span>
                        </label>

                        <label className={`vehicle-radio-option ${admissionData.vehicle_usage === 'No' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="vehicle_usage"
                            value="No"
                            checked={admissionData.vehicle_usage === 'No'}
                            onChange={(e) => setAdmissionData({ ...admissionData, vehicle_usage: e.target.value })}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

                    {/* Date of Admission */}
                    <div className="form-group">
                      <label>Date of Admission</label>
                      <div className="input-with-icon">
                        <Calendar className="input-icon" />
                        <input
                          type="date"
                          value={admissionData.date_of_admission}
                          onChange={(e) => setAdmissionData({ ...admissionData, date_of_admission: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Create Password */}
                  <div className="form-group" style={{ marginTop: '0.875rem' }}>
                    <label>
                      Create Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="input-with-icon" style={{ position: 'relative' }}>
                      <KeyRound className="input-icon" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        value={admissionData.password}
                        onChange={(e) => setAdmissionData({ ...admissionData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                        }}
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="step-nav-bar">
                  <button
                    type="button"
                    className="btn-secondary step-nav-btn"
                    onClick={handlePrevStep}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    className="btn-primary step-nav-btn"
                    onClick={handleNextStep}
                  >
                    <span>Next: Declaration &amp; Submit</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                STEP 4: DECLARATION & SUBMIT
                ========================================================= */}
            {currentStep === 4 && (
              <div className="admission-step-pane">
                <div className="admission-section">
                  <div className="admission-section-header">
                    <ShieldCheck className="admission-section-icon" />
                    <h3 className="admission-section-title">Step 4 – Declaration &amp; Submit</h3>
                  </div>

                  {/* Summary Review Card */}
                  <div className="review-summary-card">
                    <div className="review-summary-header">
                      <span className="review-summary-badge">Application Summary</span>
                      <button
                        type="button"
                        className="review-edit-btn"
                        onClick={() => setCurrentStep(1)}
                      >
                        Edit Details
                      </button>
                    </div>
                    <div className="review-summary-grid">
                      <div className="review-item">
                        <span className="review-lbl">Applicant Name</span>
                        <span className="review-val">{admissionData.full_name || '—'}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Mobile Number</span>
                        <span className="review-val">{admissionData.mobile || '—'}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Age / DOB</span>
                        <span className="review-val">
                          {admissionData.age ? `${admissionData.age} yrs` : '—'} &bull; {admissionData.date_of_birth || '—'}
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Study / Work</span>
                        <span className="review-val">
                          {admissionData.programme_of_study || admissionData.firm_details || '—'}
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Parent / Guardian</span>
                        <span className="review-val">
                          {admissionData.parent_guardian_name} ({admissionData.relationship})
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Guardian Contact</span>
                        <span className="review-val">{admissionData.parent_contact || '—'}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Allocated Room</span>
                        <span className="review-val">Room {admissionData.room_number || '—'}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Emergency Contact</span>
                        <span className="review-val">{admissionData.emergency_contact || '—'}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Vehicle Usage</span>
                        <span className="review-val">{admissionData.vehicle_usage}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-lbl">Admission Date</span>
                        <span className="review-val">{admissionData.date_of_admission || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hostel Declaration Text */}
                  <div className="declaration-container">
                    <span className="declaration-badge">DECLARATION</span>
                    <p className="declaration-statement">
                      &ldquo;I do hereby declare that the information furnished above are true to my knowledge and I have gone through the rules of the hostel and I agree to obey them.&rdquo;
                    </p>

                    <label className="declaration-checkbox-wrap" htmlFor="declaration-checkbox">
                      <input
                        type="checkbox"
                        id="declaration-checkbox"
                        required
                        checked={admissionData.declaration_accepted}
                        onChange={(e) => setAdmissionData({ ...admissionData, declaration_accepted: e.target.checked })}
                      />
                      <span className="declaration-checkbox-label-text">
                        I agree to the above declaration <span style={{ color: '#ef4444' }}>*</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Step 4 Actions */}
                <div className="step-nav-bar">
                  <button
                    type="button"
                    className="btn-secondary step-nav-btn"
                    onClick={handlePrevStep}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || photoUploading}
                    className="btn-primary step-nav-btn"
                  >
                    {loading ? (
                      <LoadingSpinner label="Submitting Application..." />
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <CheckCircle size={16} />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '12px' }}>
                  Note: Applications are submitted for Warden/Admin review. You will be able to log in once approved.
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
