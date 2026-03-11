'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
    requestNotificationPermission,
    disableNotifications,
    isNotificationsSupported,
    getNotificationPermissionStatus,
} from '@/lib/firebase/notifications';

export function NotificationSettings() {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<string>('default');

    // Vérifier le support et l'état initial
    useEffect(() => {
        async function checkSupport() {
            const supported = await isNotificationsSupported();
            setIsSupported(supported);
            setPermissionStatus(getNotificationPermissionStatus());
        }
        checkSupport();
    }, []);

    useEffect(() => {
        if (userProfile) {
            setIsEnabled(userProfile.notificationsEnabled === true);
        }
    }, [userProfile]);

    const handleToggle = async (enabled: boolean) => {
        if (!user) return;
        setIsLoading(true);

        try {
            if (enabled) {
                // Activer les notifications
                const token = await requestNotificationPermission(user.uid);

                if (token) {
                    setIsEnabled(true);
                    setPermissionStatus('granted');
                    toast({
                        title: '🔔 Notifications activées !',
                        description: 'Tu recevras un rappel hebdomadaire pour noter tes sorties et films.',
                    });
                } else {
                    setIsEnabled(false);
                    const currentPermission = getNotificationPermissionStatus();
                    setPermissionStatus(currentPermission);

                    if (currentPermission === 'denied') {
                        toast({
                            variant: 'destructive',
                            title: 'Notifications bloquées',
                            description: 'Les notifications sont bloquées dans les paramètres de ton navigateur. Va dans les paramètres du site pour les autoriser.',
                        });
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Erreur',
                            description: 'Impossible d\'activer les notifications. Réessaie plus tard.',
                        });
                    }
                }
            } else {
                // Désactiver les notifications
                await disableNotifications(user.uid);
                setIsEnabled(false);
                toast({
                    title: 'Notifications désactivées',
                    description: 'Tu ne recevras plus de rappels hebdomadaires.',
                });
            }
        } catch (error) {
            console.error('[NotificationSettings] Erreur:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Une erreur est survenue. Réessaie plus tard.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Si pas supporté, ne rien afficher ou montrer un message
    if (isSupported === false) {
        return (
            <Card className="border-dashed border-muted-foreground/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Notifications</CardTitle>
                    </div>
                    <CardDescription>
                        Les notifications push ne sont pas supportées sur ce navigateur.
                        Utilise Chrome, Edge, ou Firefox pour activer les rappels.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Pendant le chargement initial
    if (isSupported === null) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    {isEnabled ? (
                        <BellRing className="h-5 w-5 text-primary" />
                    ) : (
                        <Bell className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base">Rappels hebdomadaires</CardTitle>
                </div>
                <CardDescription>
                    Reçois une notification chaque semaine pour noter tes sorties/films, ainsi qu'un rappel intelligent personnalisé selon tes habitudes de sorties.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="notifications-toggle" className="text-sm font-medium">
                            {isEnabled ? 'Notifications activées' : 'Notifications désactivées'}
                        </Label>
                        {permissionStatus === 'denied' && !isEnabled && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Bloquées dans le navigateur — modifie les paramètres du site
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id="notifications-toggle"
                            checked={isEnabled}
                            onCheckedChange={handleToggle}
                            disabled={isLoading || permissionStatus === 'denied'}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
