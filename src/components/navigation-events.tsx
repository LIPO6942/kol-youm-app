'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function NavigationEvents() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                const params = searchParams.toString();
                const nextUrl = params ? `${pathname}?${params}` : pathname;
                router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
            } else if (userProfile && !userProfile.personalizationComplete && pathname !== '/personalize') {
                router.replace('/personalize');
            } else if (userProfile && userProfile.personalizationComplete && pathname === '/personalize') {
                router.replace('/stylek');
            }
        }
    }, [user, userProfile, loading, pathname, router, searchParams]);

    return null;
}
