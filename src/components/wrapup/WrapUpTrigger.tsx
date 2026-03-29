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
  
  const handleCloseWrapUp = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('wrapup');
      const newQuery = params.toString();
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ''}`);
  };

  return (
    <MonthlyWrapUpModal 
      user={userProfile} 
      isOpen={isWrapUpOpen} 
      onClose={handleCloseWrapUp} 
    />
  );
}
