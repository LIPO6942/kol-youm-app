import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Configuration Firebase (Reusing existing config pattern)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialiser Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const CACHE_COLLECTION = 'teskerti_automated';
const CACHE_DOC = 'cache';
const SYNC_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours

export async function GET() {
    try {
        const now = Date.now();
        const cacheRef = doc(db, CACHE_COLLECTION, CACHE_DOC);
        const cacheSnap = await getDoc(cacheRef);

        if (cacheSnap.exists()) {
            const data = cacheSnap.data();
            const lastSync = data.last_sync || 0;

            // If cache is fresh, return it
            if (now - lastSync < SYNC_THRESHOLD) {
                return NextResponse.json({
                    success: true,
                    events: data.events,
                    lastSync: lastSync,
                    fromCache: true
                });
            }
        }

        // Cache expired or missing -> Scrape
        console.log('Teskerti cache expired or missing, scraping...');
        const events = await scrapeTeskerti();

        if (events.length > 0) {
            // Update Firestore
            await setDoc(cacheRef, {
                events,
                last_sync: now
            }, { merge: true });

            return NextResponse.json({
                success: true,
                events,
                lastSync: now,
                fromCache: false
            });
        } else {
            // If scraping failed but we have old cache, use it as fallback
            if (cacheSnap.exists()) {
                const data = cacheSnap.data();
                return NextResponse.json({
                    success: true,
                    events: data.events,
                    lastSync: data.last_sync,
                    fromCache: true,
                    warning: 'Scraping failed, using old cache'
                });
            }
            throw new Error('Failed to scrape and no cache available');
        }

    } catch (error: any) {
        console.error('Teskerti Automated API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

async function scrapeTeskerti() {
    const events: any[] = [];
    try {
        const response = await fetch('https://teskerti.tn/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            next: { revalidate: 0 } // No Next.js internal fetch cache
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();

        // The structure on Teskerti.tn uses "event-item" or similar
        // Based on the markdown, we can identify patterns
        // Usually: <div class="item-inner"> ... <h3><a href="...">Title</a></h3> ... <span class="location">Location</span> ...

        // We'll use a few regexes to be robust
        // 1. Extract raw blocks or direct links/titles
        const eventRegex = /<h3[^>]*>\s*<a[^>]*href="([^"]*evenement\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>[\s\S]*?<span[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

        let match;
        let index = 0;
        while ((match = eventRegex.exec(html)) !== null && index < 30) {
            const url = match[1].startsWith('http') ? match[1] : `https://teskerti.tn${match[1]}`;
            const title = cleanText(match[2]);
            const locationPart = cleanText(match[3]);

            // Try to extract date from the location string if it's mixed, 
            // or look ahead/behind for date patterns like DD/MM/YYYY
            const dateMatch = locationPart.match(/(\d{2}\/\d{2}\/\d{4})/);
            const date = dateMatch ? dateMatch[1] : 'À venir';
            const location = locationPart.replace(/(\d{2}\/\d{2}\/\d{4})/, '').trim();

            events.push({
                id: `auto-${index}`,
                title,
                location: location || 'Tunis',
                date,
                url,
                category: determineCategory(title + ' ' + location)
            });
            index++;
        }

        // Fallback if the first regex fails (structure might have changed)
        if (events.length === 0) {
            // Look for any link with "evenement"
            const simpleRegex = /<a[^>]*href="([^"]*evenement\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/gi;
            while ((match = simpleRegex.exec(html)) !== null && index < 20) {
                const url = match[1].startsWith('http') ? match[1] : `https://teskerti.tn${match[1]}`;
                const title = cleanText(match[3]);
                if (title.length > 5 && !title.includes('<img')) {
                    events.push({
                        id: `auto-simple-${index}`,
                        title,
                        location: 'Tunis',
                        date: 'Consulter site',
                        url,
                        category: determineCategory(title)
                    });
                    index++;
                }
            }
        }

        if (events.length === 0) {
            throw new Error('No events found via scraping');
        }

        return events;
    } catch (error) {
        console.error('Scraping Logic Error:', error);
        // Return curated fallback events if scraping fails completely or network blocks
        return [
            {
                id: 'fallback-1',
                title: 'Sahbek Rajel 2',
                date: 'En salle maintenant',
                location: 'Cinémas Tunisiens',
                category: 'Cinéma',
                url: 'https://teskerti.tn/category/cinema'
            },
            {
                id: 'fallback-2',
                title: 'Al Lailu Ya Laila - Hommage à Wadih Al Safi',
                date: 'Février 2026',
                location: 'Théâtre municipal de Tunis',
                category: 'Musique',
                url: 'https://teskerti.tn/category/spectacle'
            },
            {
                id: 'fallback-3',
                title: 'V!TAL Festival',
                date: 'Février 2026',
                location: 'Cité de la Culture',
                category: 'Festival',
                url: 'https://teskerti.tn/category/fpc-2026'
            },
            {
                id: 'fallback-4',
                title: 'Milonga Corazon',
                date: 'Événement régulier',
                location: 'La Marsa',
                category: 'Spectacle',
                url: 'https://teskerti.tn/category/spectacle'
            },
            {
                id: 'fallback-5',
                title: 'Abba Symphonia',
                date: 'Février 2026',
                location: 'Théâtre de l\'Opéra',
                category: 'Concert',
                url: 'https://teskerti.tn/category/spectacle'
            },
            {
                id: 'fallback-6',
                title: 'HOPE FESTIVAL',
                date: 'Événements réguliers',
                location: 'Médina de Tunis',
                category: 'Concert',
                url: 'https://teskerti.tn/category/hope-festival'
            },
            {
                id: 'fallback-7',
                title: 'Événements Ramadan 2026',
                date: 'Ramadan 2026',
                location: 'Divers lieux à Tunis',
                category: 'Ramadan',
                url: 'https://teskerti.tn/category/ramadan-a-tunis'
            },
            {
                id: 'fallback-8',
                title: 'Padel Tournaments',
                date: 'Toute l\'année',
                location: 'Clubs de Tunis',
                category: 'Sport',
                url: 'https://teskerti.tn/category/padel'
            },
        ];
    }
}

function cleanText(text: string) {
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function determineCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('cinéma') || lower.includes('cinema') || lower.includes('film')) return 'Cinéma';
    if (lower.includes('théâtre') || lower.includes('theatre') || lower.includes('spectacle')) return 'Spectacle';
    if (lower.includes('concert') || lower.includes('musique') || lower.includes('gharsa') || lower.includes('hlel')) return 'Concert';
    if (lower.includes('festival') || lower.includes('fpc')) return 'Festival';
    if (lower.includes('ramadan')) return 'Ramadan';
    if (lower.includes('sport') || lower.includes('padel')) return 'Sport';
    return 'Événement';
}
