'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { deleteBrainAttempt, clearBrainAttempts, type BrainAttempt } from '@/lib/firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Trophy,
  Trash2,
  Brain,
  Calendar,
  Award,
  Sparkles,
  Filter,
  Clock,
  Globe,
  ChevronsUpDown,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export default function ScoresDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const attempts = useMemo(() => {
    return userProfile?.brainAttempts || [];
  }, [userProfile]);

  // Format month label in French
  const formatMonthYear = (monthStr: string) => {
    if (monthStr === 'all') return 'Tous les temps';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Get list of unique months in attempts
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    attempts.forEach((attempt) => {
      const d = new Date(attempt.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${year}-${month}`);
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [attempts]);

  // Filter attempts based on selection
  const filteredAttempts = useMemo(() => {
    if (selectedMonth === 'all') {
      return [...attempts].sort((a, b) => b.date - a.date);
    }
    return attempts
      .filter((attempt) => {
        const d = new Date(attempt.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}` === selectedMonth;
      })
      .sort((a, b) => b.date - a.date);
  }, [attempts, selectedMonth]);

  // Calculate statistics for the filtered view
  const stats = useMemo(() => {
    const total = filteredAttempts.length;
    if (total === 0) {
      return {
        total: 0,
        accuracy: 0,
        quizPlayed: 0,
        quizAvg: 0,
        talla3Played: 0,
        talla3WinRate: 0,
      };
    }

    let totalScore = 0;
    let totalQuestions = 0;
    let quizCount = 0;
    let quizScoreSum = 0;
    let quizQuestionSum = 0;
    let talla3Count = 0;
    let talla3Wins = 0;

    filteredAttempts.forEach((a) => {
      totalScore += a.score;
      totalQuestions += a.totalQuestions;

      if (a.type === 'quiz') {
        quizCount++;
        quizScoreSum += a.score;
        quizQuestionSum += a.totalQuestions;
      } else if (a.type === 'talla3') {
        talla3Count++;
        if (a.score === 1) {
          talla3Wins++;
        }
      }
    });

    const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    const quizAvg = quizQuestionSum > 0 ? Math.round((quizScoreSum / quizQuestionSum) * 100) : 0;
    const talla3WinRate = talla3Count > 0 ? Math.round((talla3Wins / talla3Count) * 100) : 0;

    return {
      total,
      accuracy,
      quizPlayed: quizCount,
      quizAvg,
      talla3Played: talla3Count,
      talla3WinRate,
    };
  }, [filteredAttempts]);

  const handleDelete = async (attemptId: string) => {
    if (!user) return;
    setIsDeleting(attemptId);
    try {
      await deleteBrainAttempt(user.uid, attemptId);
      toast({
        title: 'Score supprimé',
        description: 'La tentative a été effacée de votre historique.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer cette tentative.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleResetAll = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      await clearBrainAttempts(user.uid);
      toast({
        title: 'Historique réinitialisé',
        description: 'Tous vos scores ont été effacés avec succès.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de vider l\'historique.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (attempts.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-dashed bg-card/40 backdrop-blur-md border-primary/20">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4 animate-bounce">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl mb-2 text-foreground">Aucun score enregistré</CardTitle>
          <CardDescription className="max-w-md mb-6">
            Vous n'avez pas encore relevé de défi cérébral. Lancez un Quiz Quotidien ou un jeu Talla3 pour commencer à suivre votre évolution !
          </CardDescription>
          <div className="flex gap-4">
            <Badge variant="outline" className="px-3 py-1 text-sm border-primary/20 text-primary bg-primary/5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Entraînez-vous tous les jours
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/30 backdrop-blur-lg border border-primary/10 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Filtrer l'historique</h3>
            <p className="text-xs text-muted-foreground">Sélectionnez une période</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-primary/15 hover:border-primary/30 transition-colors">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les temps</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthYear(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border border-primary/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline text-xl">Réinitialiser l'historique ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Elle supprimera définitivement tous vos scores et tentatives enregistrés pour le Quiz Quotidien et Talla3.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-primary/10 hover:bg-muted">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAll} className="bg-red-600 hover:bg-red-700 text-white font-medium">
                  {isResetting ? 'Suppression...' : 'Oui, tout supprimer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Accuracy */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-primary/10 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              Précision Globale
              <Percent className="h-3.5 w-3.5 text-indigo-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-3xl font-bold font-headline text-indigo-600 dark:text-indigo-400">
              {stats.accuracy}%
            </div>
            <Progress value={stats.accuracy} className="h-1.5 mt-2 bg-indigo-500/10" style={{ '--progress-background': 'linear-gradient(to right, #6366f1, #a855f7)' } as React.CSSProperties} />
            <p className="text-[10px] text-muted-foreground mt-1.5">Taux moyen de bonnes réponses</p>
          </CardContent>
        </Card>

        {/* KPI 2: Total Completed */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-primary/10 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              Défis Réalisés
              <Trophy className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-3xl font-bold font-headline text-amber-600 dark:text-amber-400">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span>{formatMonthYear(selectedMonth)}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sessions complétées</p>
          </CardContent>
        </Card>

        {/* KPI 3: Quiz Avg */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-primary/10 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              Moyenne Quiz
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-3xl font-bold font-headline text-emerald-600 dark:text-emerald-400">
              {stats.quizAvg}%
            </div>
            <Progress value={stats.quizAvg} className="h-1.5 mt-2 bg-emerald-500/10" style={{ '--progress-background': 'linear-gradient(to right, #10b981, #14b8a6)' } as React.CSSProperties} />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {stats.quizPlayed} quiz {stats.quizPlayed > 1 ? 'joués' : 'joué'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Talla3 Win rate */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-pink-500/5 to-rose-500/5 border-primary/10 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              Taux Talla3
              <ChevronsUpDown className="h-3.5 w-3.5 text-pink-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-3xl font-bold font-headline text-pink-600 dark:text-pink-400">
              {stats.talla3WinRate}%
            </div>
            <Progress value={stats.talla3WinRate} className="h-1.5 mt-2 bg-pink-500/10" style={{ '--progress-background': 'linear-gradient(to right, #ec4899, #f43f5e)' } as React.CSSProperties} />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {stats.talla3Played} {stats.talla3Played > 1 ? 'défis résolus' : 'défi résolu'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Details & History */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card/40 backdrop-blur-md border-primary/10 shadow-lg overflow-hidden">
          <CardHeader className="p-6 pb-2 border-b border-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" /> Historique d'activité
                </CardTitle>
                <CardDescription>Consultez vos tentatives récentes et vos scores</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-primary/5 border border-primary/15 text-primary text-xs font-semibold px-2 py-0.5">
                {filteredAttempts.length} {filteredAttempts.length > 1 ? 'enregistrements' : 'enregistrement'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-primary/5 px-6">
                {filteredAttempts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Clock className="h-8 w-8 mb-2 opacity-40 animate-pulse" />
                    <p className="text-sm font-medium">Aucun score pour cette période</p>
                  </div>
                ) : (
                  filteredAttempts.map((attempt) => {
                    const isQuiz = attempt.type === 'quiz';
                    const scorePercentage = attempt.totalQuestions > 0 ? (attempt.score / attempt.totalQuestions) * 100 : 0;
                    const dateFormatted = new Date(attempt.date).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={attempt.id} className="flex items-center justify-between py-4 group transition-all duration-300">
                        <div className="flex items-center gap-3">
                          {/* Left icon wrapper */}
                          <div className={`p-2.5 rounded-xl border ${
                            isQuiz 
                              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' 
                              : 'bg-pink-500/10 border-pink-500/20 text-pink-500'
                          }`}>
                            {isQuiz ? <Globe className="h-4.5 w-4.5" /> : <ChevronsUpDown className="h-4.5 w-4.5" />}
                          </div>

                          {/* Text description */}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {isQuiz ? 'Quiz Quotidien' : 'Talla3'}
                              </span>
                              <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 border-none ${
                                isQuiz 
                                  ? 'bg-indigo-500/5 text-indigo-500' 
                                  : 'bg-pink-500/5 text-pink-500'
                              }`}>
                                {isQuiz ? 'Culture' : 'Riddle'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-medium truncate max-w-[150px] sm:max-w-[250px]">
                                {attempt.category || 'Culture Générale'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 font-mono text-[10px]">
                                <Calendar className="h-2.5 w-2.5" />
                                {dateFormatted}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Score & Action */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {isQuiz ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-sm font-mono text-indigo-600 dark:text-indigo-400">
                                  {attempt.score} / {attempt.totalQuestions}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {scorePercentage}% correct
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {attempt.score === 1 ? (
                                  <Badge className="bg-emerald-500/10 border-none hover:bg-emerald-500/15 text-emerald-600 flex items-center gap-1 text-[11px] font-semibold">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Succès
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-500/10 border-none hover:bg-rose-500/15 text-rose-600 flex items-center gap-1 text-[11px] font-semibold">
                                    <XCircle className="h-3 w-3 text-rose-500" /> Échec
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(attempt.id)}
                            disabled={isDeleting === attempt.id}
                            className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all focus:opacity-100 h-8 w-8 rounded-full shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
