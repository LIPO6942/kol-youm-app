
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

const getCategoryDetails = (category: string) => {
    const term = category.toLowerCase();
    if (term.includes('cinéma') || term.includes('cinema')) {
        return {
            image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop",
            color: "bg-red-100 text-red-700"
        };
    }
    if (term.includes('théâtre') || term.includes('theatre') || term.includes('spectacle')) {
        return {
            image: "https://images.unsplash.com/photo-1503095392237-736213917042?q=80&w=800&auto=format&fit=crop",
            color: "bg-purple-100 text-purple-700"
        };
    }
    if (term.includes('musique') || term.includes('concert') || term.includes('festival') || term.includes('song')) {
        return {
            image: "https://images.unsplash.com/photo-1501612766622-27c7f65d6208?q=80&w=800&auto=format&fit=crop",
            color: "bg-blue-100 text-blue-700"
        };
    }
    if (term.includes('ramadan')) {
        return {
            image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=800&auto=format&fit=crop",
            color: "bg-amber-100 text-amber-700"
        };
    }
    return {
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop",
        color: "bg-gray-100 text-gray-700"
    };
};

export const getTeskertiEvents = async (): Promise<TeskertiEvent[]> => {
    const baseEvents = [
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
            title: 'V!TAL - FPC 2026',
            date: 'Février 2026',
            location: 'Cité de la Culture',
            category: 'Festival',
            url: 'https://teskerti.tn/'
        },
        {
            id: '3',
            title: 'Sahbek Rajel 2',
            date: '04/02/2026',
            location: 'Cinéma Le Colisée',
            category: 'Cinéma',
            url: 'https://teskerti.tn/'
        },
        {
            id: '4',
            title: 'Milonga Corazon | Soirée Tango',
            date: '05/02/2026',
            location: 'Tunis',
            category: 'Spectacle',
            url: 'https://teskerti.tn/'
        },
        {
            id: '5',
            title: 'Zied Gharsa - Ramadan a Tunis',
            date: 'Ramadan 2026',
            location: 'Médina de Tunis',
            category: 'Ramadan',
            url: 'https://teskerti.tn/'
        },
        {
            id: '6',
            title: 'Abba Symphonia 2nd Date',
            date: '08/02/2026',
            location: 'Théâtre de l\'Opéra',
            category: 'Concert',
            url: 'https://teskerti.tn/'
        },
        {
            id: '7',
            title: 'Exposition : L\'Art de la Calle',
            date: 'En cours',
            location: 'Galerie Marsa',
            category: 'Art',
            url: 'https://teskerti.tn/'
        }
    ];

    return baseEvents.map(event => {
        const details = getCategoryDetails(event.category);
        return {
            ...event,
            imageUrl: details.image
        };
    });
};
