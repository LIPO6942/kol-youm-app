'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2, AlertTriangle, Film, CheckCircle2, Timer, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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
    const [isTesting, setIsTesting] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [lastTestResult, setLastTestResult] = useState<{ title: string; body: string; imageUrl?: string; suggestedMovieTitle?: string } | null>(null);
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

    const handleTestSundayNotification = async (delaySeconds: number = 5) => {
        if (!user) return;
        setIsTesting(true);
        setLastTestResult(null);
        setCountdown(delaySeconds);

        // Décompte local chaque seconde
        const timerInterval = setInterval(() => {
            setCountdown((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(timerInterval);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        if (delaySeconds > 0) {
            toast({
                title: `⏱️ Envoi programmé dans ${delaySeconds}s !`,
                description: 'Réduis l’application ou verrouille ton écran maintenant pour tester la notification en arrière-plan avec le poster.',
            });
        }

        try {
            const res = await fetch(`/api/send-weekly-notification?testUserId=${user.uid}&delay=${delaySeconds}&secret=kol-youm-weekly-notification-secret`);
            const data = await res.json();

            clearInterval(timerInterval);
            setCountdown(null);

            if (data.success) {
                const notif = data.notification;
                setLastTestResult(notif);
                toast({
                    title: notif.type === 'movie' ? '🎬 Notification Film envoyée en arrière-plan !' : '🔔 Notification envoyée !',
                    description: `"${notif.title}" ${data.fcmResult?.sent ? `(reçue sur ${data.fcmResult.sent} appareil)` : ''}`,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erreur test notification',
                    description: data.error || data.warning || 'Impossible d\'envoyer la notification de test.',
                });
            }
        } catch (error) {
            clearInterval(timerInterval);
            setCountdown(null);
            console.error('[NotificationSettings] Erreur test notification:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur test notification',
                description: 'Une erreur est survenue lors de la communication avec le serveur.',
            });
        } finally {
            setIsTesting(false);
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
                    Reçois chaque dimanche soir une suggestion personnalisée issue de ta liste de films à voir (avec affiche et note), ainsi que des rappels intelligents de sorties.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

                {isEnabled && (
                    <div className="pt-3 border-t border-border flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                                    <Film className="h-4 w-4 text-primary" />
                                    Notification film du dimanche (avec poster)
                                </span>
                                <p className="text-xs text-muted-foreground">
                                    Teste la notification envoyée en arrière-plan après 5 secondes avec le poster du film à voir.
                                </p>
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0 rounded-xl shadow-md transition-all"
                                onClick={() => handleTestSundayNotification(5)}
                                disabled={isTesting}
                            >
                                {isTesting && countdown !== null ? (
                                    <>
                                        <Timer className="h-3.5 w-3.5 animate-spin text-primary-foreground" />
                                        <span>Envoi dans {countdown}s...</span>
                                    </>
                                ) : isTesting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" />
                                        <span>Envoi en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Smartphone className="h-3.5 w-3.5" />
                                        <span>Tester en arrière-plan (5s)</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {countdown !== null && (
                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3 animate-pulse">
                                <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center font-black text-sm shrink-0">
                                    {countdown}s
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold">👉 Réduis l&apos;application ou verrouille ton écran maintenant !</span>
                                    <span className="text-[11px] opacity-90">La notification push arrivera dans {countdown}s en arrière-plan avec l&apos;affiche du film.</span>
                                </div>
                            </div>
                        )}

                        {lastTestResult && (
                            <div className="text-xs p-3.5 rounded-2xl bg-muted/60 border border-muted-foreground/20 text-muted-foreground space-y-2.5 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span>{lastTestResult.title}</span>
                                </div>
                                <p className="text-muted-foreground leading-relaxed">{lastTestResult.body}</p>
                                
                                {lastTestResult.imageUrl ? (
                                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                                        <img
                                            src={lastTestResult.imageUrl}
                                            alt={lastTestResult.suggestedMovieTitle || lastTestResult.title}
                                            className="w-14 h-20 object-cover rounded-lg shadow-md border border-border shrink-0"
                                        />
                                        <div className="flex flex-col text-xs text-muted-foreground">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <span>🖼️</span> Affiche TMDb attachée avec succès
                                            </span>
                                            <span className="text-[11px] mt-0.5 leading-tight">Le poster est configuré pour s&apos;afficher directement en grand dans le tiroir de notification en arrière-plan.</span>
                                            {lastTestResult.suggestedMovieTitle && (
                                                <span className="text-[11px] font-semibold text-foreground mt-1">
                                                    Film suggéré : {lastTestResult.suggestedMovieTitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-muted-foreground italic">
                                        (Notification envoyée sans affiche TMDb)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
