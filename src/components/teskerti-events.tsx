
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ExternalLink, Ticket, Loader2 } from 'lucide-react';
import { getTeskertiEvents, type TeskertiEvent } from '@/lib/teskerti-service';

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
            {events.map((event) => (
                <Card key={event.id} className="group overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                    <CardHeader className="p-0">
                        <div className="relative h-40 bg-muted flex items-center justify-center">
                            {event.imageUrl ? (
                                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground/30">
                                    <Ticket className="h-16 w-16" />
                                </div>
                            )}
                            <Badge className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm">
                                {event.category}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <h3 className="font-bold text-lg line-clamp-2 min-h-[3.5rem] group-hover:text-primary transition-colors">
                            {event.title}
                        </h3>

                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span>{event.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="truncate">{event.location}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <Button asChild className="w-full gap-2 rounded-xl group/btn overflow-hidden relative">
                            <a href={event.url} target="_blank" rel="noopener noreferrer">
                                <span>Réserver sur Teskerti</span>
                                <ExternalLink className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </a>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
