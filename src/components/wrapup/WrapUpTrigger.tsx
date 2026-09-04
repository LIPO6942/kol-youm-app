'use client';

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { MonthlyWrapUpModal } from './MonthlyWrapUpModal';
import type { UserProfile } from '@/lib/firebase/firestore';

export function WrapUpTrigger({ userProfile }: { userProfile: UserProfile }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const isWrapUpOpen = searchParams.get('wrapup') === 'true';
  const monthParam = searchParams.get('month');
  
  const targetDate = React.useMemo(() => {
    if (monthParam) {
      const parts = monthParam.split('-').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, [monthParam]);

  const handleCloseWrapUp = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('wrapup');
      params.delete('month');
      const newQuery = params.toString();
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ''}`);
  };

  return (
    <MonthlyWrapUpModal 
      user={userProfile} 
      isOpen={isWrapUpOpen} 
      onClose={handleCloseWrapUp} 
      targetDate={targetDate}
    />
  );
}
