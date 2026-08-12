'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="spinner-container">
      <Loader2 className="spinner-icon" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
