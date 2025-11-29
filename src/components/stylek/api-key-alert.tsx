'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ApiKeyAlert() {
    const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkApiKey = async () => {
            try {
                const response = await fetch('/api/check-hf-key');
                const data = await response.json();
                setIsApiKeyMissing(!data.isConfigured);
            } catch (error) {
                console.error('Error checking API key:', error);
                setIsApiKeyMissing(true);
            } finally {
                setIsChecking(false);
            }
        };

        checkApiKey();
    }, []);

    if (isChecking || !isApiKeyMissing) {
        return null;
    }

    return (
        <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Clé API Hugging Face manquante</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
                <p>
                    Pour utiliser la génération d'images, vous devez configurer votre clé API Hugging Face.
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/docs/STYLEK_IMAGE_GENERATION_FIX.md', '_blank')}
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Guide de configuration
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://huggingface.co/settings/tokens', '_blank')}
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Créer une clé API
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}
