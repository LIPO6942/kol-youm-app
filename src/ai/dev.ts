'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/movie-preference-learning.ts';
import '@/ai/flows/intelligent-outfit-suggestion.ts';
import '@/ai/flows/generate-movie-poster.ts';
import '@/ai/flows/decision-maker-flow.ts';
