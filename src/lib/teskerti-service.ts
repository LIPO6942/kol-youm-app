
export interface TeskertiEvent {
    id: string;
    title: string;
    date: string;
    location: string;
    category: string;
    price?: string;
    url: string;
}

export const getTeskertiEvents = async (): Promise<TeskertiEvent[]> => {
    try {
        const response = await fetch('/api/teskerti', {
            cache: 'no-store', // Always get fresh data or cached from server
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.events) {
            return data.events;
        }

        // Fallback to static events if API fails
        return getStaticEvents();

    } catch (error) {
        console.error('Failed to fetch Teskerti events from API:', error);
        return getStaticEvents();
    }
};

// Fallback static events in case API is unavailable
function getStaticEvents(): TeskertiEvent[] {
    return [
        {
            id: '1',
            title: 'Al Lailu Ya Laila - Hommage à Wadih Al Safi',
            date: 'Prochainement',
            location: 'Théâtre municipal de Tunis',
            category: 'Musique',
            url: 'https://teskerti.tn/category/spectacle'
        },
        {
            id: '2',
            title: 'V!TAL - FPC 2026',
            date: 'Février 2026',
            location: 'Cité de la Culture',
            category: 'Festival',
            url: 'https://teskerti.tn/category/fpc-2026'
        },
        {
            id: '3',
            title: 'Sahbek Rajel 2',
            date: '04/02/2026',
            location: 'Cinéma Le Colisée',
            category: 'Cinéma',
            url: 'https://teskerti.tn/category/cinema'
        },
        {
            id: '4',
            title: 'Milonga Corazon | Soirée Tango',
            date: '05/02/2026',
            location: 'Tunis',
            category: 'Spectacle',
            url: 'https://teskerti.tn/category/spectacle'
        },
        {
            id: '5',
            title: 'Zied Gharsa - Ramadan a Tunis',
            date: 'Ramadan 2026',
            location: 'Médina de Tunis',
            category: 'Ramadan',
            url: 'https://teskerti.tn/category/ramadan-a-tunis'
        },
        {
            id: '6',
            title: 'Abba Symphonia 2nd Date',
            date: '08/02/2026',
            location: 'Théâtre de l\'Opéra',
            category: 'Concert',
            url: 'https://teskerti.tn/category/spectacle'
        }
    ];
}
