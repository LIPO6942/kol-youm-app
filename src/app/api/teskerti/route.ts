import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache
let cachedEvents: any[] | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET(req: NextRequest) {
    try {
        // Check if we have cached data that's still fresh
        const now = Date.now();
        if (cachedEvents && (now - lastFetch) < CACHE_DURATION) {
            return NextResponse.json({
                success: true,
                events: cachedEvents,
                cached: true,
                cachedAt: new Date(lastFetch).toISOString()
            });
        }

        // Fetch the Teskerti homepage
        const response = await fetch('https://teskerti.tn/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Teskerti: ${response.status}`);
        }

        const html = await response.text();

        // Parse events from HTML
        const events = parseEventsFromHTML(html);

        // Update cache
        cachedEvents = events;
        lastFetch = now;

        return NextResponse.json({
            success: true,
            events,
            cached: false,
            fetchedAt: new Date(now).toISOString()
        });

    } catch (error: any) {
        console.error('Teskerti scraping error:', error);

        // If scraping fails but we have cache, return it
        if (cachedEvents) {
            return NextResponse.json({
                success: true,
                events: cachedEvents,
                cached: true,
                error: 'Failed to fetch fresh data, using cache',
                cachedAt: new Date(lastFetch).toISOString()
            });
        }

        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to scrape Teskerti',
            events: getFallbackEvents()
        }, { status: 500 });
    }
}

function parseEventsFromHTML(html: string) {
    const events: any[] = [];

    try {
        // Look for event links - typically in format: /evenement/[slug]
        const eventLinkRegex = /href="(\/evenement\/[^"]+)"/g;
        const eventLinks = new Set<string>();

        let match;
        while ((match = eventLinkRegex.exec(html)) !== null) {
            eventLinks.add(match[1]);
        }

        // Extract event information from common patterns
        // This is a simplified approach - you may need to adjust based on actual HTML structure
        const eventBlocks = html.split(/(?=<div[^>]*class="[^"]*event)/i).slice(1, 11); // Get first 10 events

        eventBlocks.forEach((block, index) => {
            const titleMatch = block.match(/<h[1-4][^>]*>([^<]+)<\/h[1-4]>/i) ||
                block.match(/alt="([^"]+)"/i);
            const dateMatch = block.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            const locationMatch = block.match(/<span[^>]*>([^<]*(?:Théâtre|Cinéma|Culture|Tunis|Theater)[^<]*)<\/span>/i);

            const linkMatch = Array.from(eventLinks)[index];

            if (titleMatch || linkMatch) {
                events.push({
                    id: `scraped-${index + 1}`,
                    title: titleMatch ? titleMatch[1].trim() : `Événement ${index + 1}`,
                    date: dateMatch ? dateMatch[1] : 'À venir',
                    location: locationMatch ? locationMatch[1].trim() : 'Tunis',
                    category: determineCategoryFromText(block),
                    url: linkMatch ? `https://teskerti.tn${linkMatch}` : 'https://teskerti.tn/'
                });
            }
        });

    } catch (error) {
        console.error('HTML parsing error:', error);
    }

    // If we couldn't parse any events, return fallback
    return events.length > 0 ? events : getFallbackEvents();
}

function determineCategoryFromText(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('cinéma') || lower.includes('cinema') || lower.includes('film')) return 'Cinéma';
    if (lower.includes('théâtre') || lower.includes('theatre')) return 'Théâtre';
    if (lower.includes('concert') || lower.includes('musique')) return 'Concert';
    if (lower.includes('festival')) return 'Festival';
    if (lower.includes('spectacle')) return 'Spectacle';
    if (lower.includes('ramadan')) return 'Ramadan';
    return 'Événement';
}

function getFallbackEvents() {
    return [
        {
            id: 'fallback-1',
            title: 'Événements Teskerti',
            date: 'En cours',
            location: 'Tunis',
            category: 'Divers',
            url: 'https://teskerti.tn/'
        }
    ];
}
