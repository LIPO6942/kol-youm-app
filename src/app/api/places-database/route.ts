import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface PlaceData {
  zone: string;
  places: string[];
}

interface PlacesDatabase {
  cafes: PlaceData[];
  restaurants?: PlaceData[];
  fastFoods?: PlaceData[];
  brunch?: PlaceData[];
  bars?: PlaceData[];
}

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'src', 'ai', 'flows', 'decision-maker-flow.ts');
    const fileContent = await readFile(filePath, 'utf-8');
    
    // Parser le contenu pour extraire toutes les catégories
    const placesData: PlacesDatabase = {
      cafes: [],
      restaurants: [],
      fastFoods: [],
      brunch: [],
      bars: []
    };

    // Fonction helper pour extraire les lieux d'une catégorie
    const extractCategoryPlaces = (categoryName: string, pattern: RegExp) => {
      const categoryMatch = fileContent.match(pattern);
      if (categoryMatch) {
        const zonePattern = /- \*\*Zone ([^:]+) :\*\*([^\n]+(?:\n[^\n-]+)*)/g;
        const zones: PlaceData[] = [];
        let match;
        
        while ((match = zonePattern.exec(categoryMatch[1])) !== null) {
          const zoneName = match[1].trim();
          const placesText = match[2].replace(/\.\s*$/, ''); // Remove trailing dot
          const places = placesText.split(',').map(p => p.trim()).filter(p => p);
          zones.push({ zone: zoneName, places });
        }
        
        return zones;
      }
      return [];
    };

    // Extraire les cafés
    placesData.cafes = extractCategoryPlaces(
      'cafés',
      /{{#if isCafeCategory}}([\s\S]*?){{\/if}}/
    );

    // Extraire les fast foods
    placesData.fastFoods = extractCategoryPlaces(
      'fast foods',
      /{{#if isFastFoodCategory}}([\s\S]*?){{\/if}}/
    );

    // Rechercher d'autres catégories (restaurants, brunch, etc.)
    const otherCategories = [
      { name: 'restaurants', pattern: /{{#if isRestaurantCategory}}([\s\S]*?){{\/if}}/ },
      { name: 'brunch', pattern: /{{#if isBrunchCategory}}([\s\S]*?){{\/if}}/ },
      { name: 'bars', pattern: /{{#if isBarCategory}}([\s\S]*?){{\/if}}/ }
    ];

    otherCategories.forEach(cat => {
      const match = fileContent.match(cat.pattern);
      if (match) {
        placesData[cat.name as keyof PlacesDatabase] = extractCategoryPlaces(cat.name, cat.pattern);
      }
    });

    return NextResponse.json({ success: true, data: placesData });
  } catch (error) {
    console.error('Error reading places database:', error);
    return NextResponse.json({ success: false, error: 'Failed to read places database' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, zone, places, category } = await request.json();

    const filePath = join(process.cwd(), 'src', 'ai', 'flows', 'decision-maker-flow.ts');
    let fileContent = await readFile(filePath, 'utf-8');

    if (action === 'update') {
      // Mettre à jour les lieux pour une zone spécifique dans la catégorie donnée
      const escapedZone = zone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const zonePattern = new RegExp(`- \\*\\*Zone ${escapedZone} :\\*\\*[^-\\n]+(?:\\n[^-\\n]+)*`, 'g');
      const newZoneContent = `- **Zone ${zone} :** ${places.join(', ')}.`;
      
      fileContent = fileContent.replace(zonePattern, newZoneContent);
    }

    await writeFile(filePath, fileContent, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating places database:', error);
    return NextResponse.json({ success: false, error: 'Failed to update places database' }, { status: 500 });
  }
}
