
export interface TeskertiEvent {
    id: string;
    title: string;
    date: string;
    location: string;
    category: string;
    price?: string;
    url: string;
}

export interface TeskertiApiResponse {
    success: boolean;
    events: TeskertiEvent[];
    lastSync?: number;
    fromCache?: boolean;
    error?: string;
}

export const getTeskertiEvents = async (): Promise<TeskertiApiResponse> => {
    try {
        const response = await fetch('/api/teskerti-auto', {
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Failed to fetch automated Teskerti events:', error);
        return {
            success: false,
            events: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
