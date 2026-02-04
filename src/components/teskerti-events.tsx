

'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ExternalLink, Ticket, Loader2, Music, Film, Tv, Mic2, Theater } from 'lucide-react';
import { getTeskertiEvents, type TeskertiEvent } from '@/lib/teskerti-service';

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
    const term = category.toLowerCase();
    if (term.includes('cinéma') || term.includes('cinema')) return <Film className={className} />;
    if (term.includes('théâtre') || term.includes('theatre') || term.includes('spectacle')) return <Theater className={className} />;
    if (term.includes('musique') || term.includes('concert')) return <Music className={className} />;
    if (term.includes('festival')) return <Mic2 className={className} />;
    if (term.includes('ramadan')) return <Tv className={className} />; // Or Moon if available
    return <Ticket className={className} />;
}

export function TeskertiEvents() {
    const [events, setEvents] = useState<TeskertiEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadEvents() {
            try {
                const data = await getTeskertiEvents();
                setEvents(data);
            } catch (error) {
                console.error("Failed to load events", error);
            } finally {
                setLoading(false);
            }
        }
        loadEvents();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Récupération des événements Teskerti...</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 animate-in fade-in duration-500">
            {events.map((event) => (
                <Card key={event.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/50">
                    <div className="flex flex-row items-stretch">
                        {/* Left Side: Category Icon Strip */}
                        <div className="w-16 bg-muted/30 flex flex-col items-center justify-center border-r shrink-0">
                            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <CategoryIcon category={event.category} className="h-5 w-5 text-primary" />
                            </div>
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 p-4 flex flex-col justify-center gap-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
                                    {event.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {event.date}
                                </span>
                            </div>

                            <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors pr-8">
                                {event.title}
                            </h3>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{event.location}</span>
                            </div>
                        </div>

                        {/* Right: Action Button (Link) */}
                        <div className="flex items-center text-primary px-4 border-l bg-primary/0 group-hover:bg-primary/5 transition-colors">
                            <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-full w-full flex items-center justify-center p-2"
                            >
                                <ExternalLink className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
