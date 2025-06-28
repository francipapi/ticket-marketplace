'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the new Airtable dashboard
export default function DashboardRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/airtable');
  }, [router]);
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}