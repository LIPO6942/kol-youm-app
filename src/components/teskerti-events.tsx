
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ExternalLink, Ticket, Loader2, Music, Film, Tv, Mic2, Theater, Sparkles, RefreshCw, Clock } from 'lucide-react';
import { getTeskertiEvents, type TeskertiEvent } from '@/lib/teskerti-service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
    const term = category.toLowerCase();
    if (term.includes('cinéma') || term.includes('cinema')) return <Film className={className} />;
    if (term.includes('théâtre') || term.includes('theatre') || term.includes('spectacle')) return <Theater className={className} />;
    if (term.includes('musique') || term.includes('concert')) return <Music className={className} />;
    if (term.includes('festival')) return <Mic2 className={className} />;
    if (term.includes('ramadan')) return <Tv className={className} />;
    if (term.includes('sport')) return <Ticket className={className} />;
    return <Ticket className={className} />;
}

const getCategoryGradient = (category: string) => {
    const term = category.toLowerCase();
    if (term.includes('cinéma') || term.includes('cinema')) return 'from-red-500/20 via-pink-500/20 to-rose-500/20';
    if (term.includes('théâtre') || term.includes('theatre') || term.includes('spectacle')) return 'from-purple-500/20 via-violet-500/20 to-indigo-500/20';
    if (term.includes('musique') || term.includes('concert')) return 'from-blue-500/20 via-cyan-500/20 to-teal-500/20';
    if (term.includes('festival')) return 'from-orange-500/20 via-amber-500/20 to-yellow-500/20';
    if (term.includes('ramadan')) return 'from-emerald-500/20 via-green-500/20 to-lime-500/20';
    if (term.includes('sport')) return 'from-sky-500/20 via-blue-500/20 to-indigo-500/20';
    return 'from-slate-500/20 via-gray-500/20 to-zinc-500/20';
}

export function TeskertiEvents() {
    const [events, setEvents] = useState<TeskertiEvent[]>([]);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEvents = async () => {
        try {
            const response = await getTeskertiEvents();
            if (response.success) {
                setEvents(response.events);
                if (response.lastSync) setLastSync(response.lastSync);
                setError(null);
            } else {
                setError(response.error || 'Erreur lors du chargement');
            }
        } catch (error) {
            console.error("Failed to load events", error);
            setError('Impossible de se connecter au service');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadEvents();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <Sparkles className="h-6 w-6 text-primary/60 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-muted-foreground animate-pulse font-medium">Synchronisation avec Teskerti.tn...</p>
            </div>
        );
    }

    if (error && events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                    <RefreshCw className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="font-bold text-lg">Oups ! Erreur de connexion</h3>
                <p className="text-muted-foreground max-w-xs">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="mt-2 text-primary font-semibold hover:underline"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with refresh and sync status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-2xl border">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{events.length} événements en direct</span>
                        </div>
                        {lastSync && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Mis à jour à {format(lastSync, "HH:mm", { locale: fr })}</span>
                                <span className="mx-1">•</span>
                                <span className="text-primary/70">Auto-sync toutes les 6h</span>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-background border hover:bg-muted transition-all disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{refreshing ? 'Mise à jour...' : 'Actualiser'}</span>
                </button>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {events.map((event, index) => (
                    <Card
                        key={event.id}
                        className="group relative overflow-hidden border bg-card hover:shadow-xl transition-all duration-500 hover:scale-[1.01]"
                        style={{
                            animationDelay: `${index * 50}ms`
                        }}
                    >
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(event.category)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                        </div>

                        <div className="relative p-5 flex flex-col sm:flex-row gap-4 h-full items-start sm:items-center">
                            {/* Icon container */}
                            <div className="shrink-0 h-14 w-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                                <CategoryIcon category={event.category} className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>

                            {/* Main content */}
                            <div className="flex-1 min-w-0">
                                <Badge
                                    className="mb-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors text-[10px] font-bold uppercase tracking-wider h-5"
                                >
                                    {event.category}
                                </Badge>
                                <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-1">
                                    {event.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                        <span className="font-medium">{event.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA */}
                            <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 group/btn shrink-0"
                            >
                                <Ticket className="h-4 w-4" />
                                <span>Réserver</span>
                                <ExternalLink className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </Card>
                ))}

                {events.length === 0 && !loading && !error && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
                        <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground italic">Aucun événement trouvé pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

