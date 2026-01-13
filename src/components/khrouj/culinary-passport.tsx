
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryStat } from '@/lib/khrouj-stats-utils';
import { Globe, Utensils } from 'lucide-react';

interface CulinaryPassportProps {
    stats: CategoryStat[];
}

export function CulinaryPassport({ stats }: CulinaryPassportProps) {
    // Take top 5
    const topCategories = stats.slice(0, 5);

    if (topCategories.length === 0) return null;

    return (
        <Card className="border-orange-100 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all duration-500 bg-gradient-to-br from-orange-50/50 to-white dark:from-slate-900 dark:to-slate-900/50">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Passeport Culinaire
                        </CardTitle>
                        <p className="text-xs text-muted-foreground md:hidden lg:block">
                            {stats.length} catégories explorées
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {topCategories.map((stat, index) => (
                    <div key={stat.category} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium flex items-center gap-2">
                                {index === 0 && <span className="text-lg">🥇</span>}
                                {index === 1 && <span className="text-lg">🥈</span>}
                                {index === 2 && <span className="text-lg">🥉</span>}
                                {index > 2 && <Utensils className="h-3 w-3 text-muted-foreground" />}
                                {stat.category}
                            </span>
                            <span className="text-muted-foreground text-xs">{stat.count} visites ({stat.percentage}%)</span>
                        </div>
                        {/* Custom color for top bar */}
                        <Progress
                            value={stat.percentage}
                            className={`h-2 ${index === 0 ? 'bg-orange-100 dark:bg-slate-800 [&>div]:bg-orange-500' : ''}`}
                        />
                    </div>
                ))}

                {stats.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                        et {stats.length - 5} autres cuisines explorées...
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
