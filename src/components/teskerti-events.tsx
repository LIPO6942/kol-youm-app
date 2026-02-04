
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ExternalLink, Ticket, Loader2, Music, Film, Tv, Mic2, Theater, Sparkles, RefreshCw } from 'lucide-react';
import { getTeskertiEvents, type TeskertiEvent } from '@/lib/teskerti-service';

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
    const term = category.toLowerCase();
    if (term.includes('cinéma') || term.includes('cinema')) return <Film className={className} />;
    if (term.includes('théâtre') || term.includes('theatre') || term.includes('spectacle')) return <Theater className={className} />;
    if (term.includes('musique') || term.includes('concert')) return <Music className={className} />;
    if (term.includes('festival')) return <Mic2 className={className} />;
    if (term.includes('ramadan')) return <Tv className={className} />;
    return <Ticket className={className} />;
}

const getCategoryGradient = (category: string) => {
    const term = category.toLowerCase();
    if (term.includes('cinéma') || term.includes('cinema')) return 'from-red-500/20 via-pink-500/20 to-rose-500/20';
    if (term.includes('théâtre') || term.includes('theatre') || term.includes('spectacle')) return 'from-purple-500/20 via-violet-500/20 to-indigo-500/20';
    if (term.includes('musique') || term.includes('concert')) return 'from-blue-500/20 via-cyan-500/20 to-teal-500/20';
    if (term.includes('festival')) return 'from-orange-500/20 via-amber-500/20 to-yellow-500/20';
    if (term.includes('ramadan')) return 'from-emerald-500/20 via-green-500/20 to-lime-500/20';
    return 'from-slate-500/20 via-gray-500/20 to-zinc-500/20';
}

export function TeskertiEvents() {
    const [events, setEvents] = useState<TeskertiEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadEvents = async () => {
        try {
            const data = await getTeskertiEvents();
            setEvents(data);
        } catch (error) {
            console.error("Failed to load events", error);
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
                <p className="text-muted-foreground animate-pulse font-medium">Récupération des événements en direct...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with refresh button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground font-medium">
                        {events.length} événement{events.length > 1 ? 's' : ''} disponible{events.length > 1 ? 's' : ''}
                    </span>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                {events.map((event, index) => (
                    <Card
                        key={event.id}
                        className="group relative overflow-hidden border-0 bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]"
                        style={{
                            animationDelay: `${index * 50}ms`
                        }}
                    >
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(event.category)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                        </div>

                        <div className="relative p-6 flex flex-col gap-4 h-full">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <Badge
                                        variant="secondary"
                                        className="mb-2 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                                    >
                                        {event.category}
                                    </Badge>
                                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                        {event.title}
                                    </h3>
                                </div>

                                <div className="shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                    <CategoryIcon category={event.category} className="h-6 w-6 text-primary" />
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4 text-primary/60 shrink-0" />
                                    <span className="font-medium">{event.date}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 group/btn"
                            >
                                <Ticket className="h-4 w-4" />
                                <span>Réserver</span>
                                <ExternalLink className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

