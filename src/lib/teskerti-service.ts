
export interface TeskertiEvent {
    id: string;
    title: string;
    date: string;
    location: string;
    category: string;
    price?: string;
    imageUrl?: string;
    url: string;
}

export const getTeskertiEvents = async (): Promise<TeskertiEvent[]> => {
    // In a real scenario, this could be a fetch to a scraper or a local API
    // For now, we use the curated highlights from the research
    return [
        {
            id: '1',
            title: 'Al Lailu Ya Laila - Hommage à Wadih Al Safi',
            date: 'Prochainement',
            location: 'Théâtre municipal de Tunis',
            category: 'Musique',
            url: 'https://teskerti.tn/'
        },
        {
            id: '2',
            title: 'V!TAL',
            date: 'Fevrier 2026',
            location: 'FPC 2026',
            category: 'Festival',
            url: 'https://teskerti.tn/'
        },
        {
            id: '3',
            title: 'Sahbek rajel 2',
            date: '04/02/2026',
            location: 'Cinéma',
            category: 'Cinéma',
            url: 'https://teskerti.tn/'
        },
        {
            id: '4',
            title: 'Milonga corazon | Soirée Tango',
            date: '05/02/2026',
            location: 'Spectacle',
            category: 'Spectacle',
            url: 'https://teskerti.tn/'
        },
        {
            id: '5',
            title: 'Zied Gharsa - Ramadan a Tunis',
            date: 'Ramadan 2026',
            location: 'Tunis',
            category: 'Ramadan',
            url: 'https://teskerti.tn/'
        },
        {
            id: '6',
            title: 'Abba Symphonia 2nd Date',
            date: '08/02/2026',
            location: 'Tunis',
            category: 'Spectacle',
            url: 'https://teskerti.tn/'
        }
    ];
};
