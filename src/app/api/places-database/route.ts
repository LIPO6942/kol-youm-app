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
}

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'src', 'ai', 'flows', 'decision-maker-flow.ts');
    const fileContent = await readFile(filePath, 'utf-8');
    
    // Parser le contenu pour extraire les lieux
    const placesData: PlacesDatabase = {
      cafes: []
    };

    // Extraire les cafés par zone
    const cafeSection = fileContent.match(/- \*\*Zone La Soukra :\*\*([^-\n]+(?:\n[^-\n]+)*)/);
    if (cafeSection) {
      const places = cafeSection[1].split(',').map(p => p.trim()).filter(p => p);
      placesData.cafes.push({ zone: 'La Soukra', places });
    }

    const otherZones = [
      { name: 'El Aouina', pattern: /- \*\*Zone El Aouina :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Ain Zaghouan Nord', pattern: /- \*\*Zone Ain Zaghouan Nord :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Lac 1', pattern: /- \*\*Zone Lac 1 :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Lac 2', pattern: /- \*\*Zone Lac 2 :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'La Marsa', pattern: /- \*\*Zone La Marsa :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Jardins de Carthage', pattern: /- \*\*Zone Jardins de Carthage :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Carthage', pattern: /- \*\*Zone Carthage :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'La Goulette/Kram', pattern: /- \*\*Zone La Goulette\/Kram :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Mégrine/ Sidi Rzig', pattern: /- \*\*Zone Mégrine\/ Sidi Rzig :\*\*([^-\n]+(?:\n[^-\n]+)*)/ },
      { name: 'Boumhal', pattern: /- \*\*Zone Boumhal :\*\*([^-\n]+(?:\n[^-\n]+)*)/ }
    ];

    otherZones.forEach(zone => {
      const match = fileContent.match(zone.pattern);
      if (match) {
        const places = match[1].split(',').map(p => p.trim()).filter(p => p);
        placesData.cafes.push({ zone: zone.name, places });
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
      // Mettre à jour les lieux pour une zone spécifique
      const zonePattern = new RegExp(`- \\*\\*Zone ${zone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} :\\*\\*[^-\\n]+(?:\\n[^-\\n]+)*`, 'g');
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
