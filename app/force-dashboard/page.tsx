'use client';

import { useEffect } from 'react';

export default function ForceDashboardPage() {
  useEffect(() => {
    // Force redirect to dashboard after a short delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}