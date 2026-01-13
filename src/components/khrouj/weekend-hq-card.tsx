
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeekendHQResult } from '@/lib/khrouj-stats-utils';
import { PartyPopper, CalendarDays, MapPin } from 'lucide-react';

interface WeekendHQCardProps {
    hq: WeekendHQResult;
}

export function WeekendHQCard({ hq }: WeekendHQCardProps) {
    if (!hq) return null;

    return (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 border-indigo-100 dark:border-slate-700 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-500">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <PartyPopper size={120} className="text-indigo-600" />
            </div>

            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2 group-hover:scale-110 transition-transform duration-500">
                        <CalendarDays className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-indigo-700 dark:bg-slate-800/80 dark:text-indigo-300 shadow-sm">
                        {hq.percentage}% le week-end
                    </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Ton QG du Weekend
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-bold text-foreground truncate leading-tight">
                        {hq.placeName}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {hq.weekendVisits} visites récentes le sam/dim
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 italic">
                        "C'est là où tu te détends le plus souvent !"
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
