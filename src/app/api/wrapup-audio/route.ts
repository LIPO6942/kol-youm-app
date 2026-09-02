import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MONTH_FOLDERS: Record<number, string> = {
  0: '01-janvier',
  1: '02-fevrier',
  2: '03-mars',
  3: '04-avril',
  4: '05-mai',
  5: '06-juin',
  6: '07-juillet',
  7: '08-aout',
  8: '09-septembre',
  9: '10-octobre',
  10: '11-novembre',
  11: '12-decembre',
};

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac', '.webm'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthIndexParam = searchParams.get('monthIndex') ?? searchParams.get('month');

    if (monthIndexParam === null) {
      return NextResponse.json({ found: false, error: 'monthIndex or month parameter required' }, { status: 400 });
    }

    let monthIndex = parseInt(monthIndexParam, 10);
    // If passed 1-12, convert to 0-11
    if (monthIndex >= 1 && monthIndex <= 12 && searchParams.get('month')) {
      monthIndex = monthIndex - 1;
    }

    const folderName = MONTH_FOLDERS[monthIndex];
    if (!folderName) {
      return NextResponse.json({ found: false, error: 'Invalid monthIndex' }, { status: 400 });
    }

    const folderPath = path.join(process.cwd(), 'public', 'audio', 'wrapup', folderName);

    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ found: false, monthIndex, folderName });
    }

    const files = fs.readdirSync(folderPath);
    // Find the first audio file in the folder
    const audioFile = files.find(file => {
      const ext = path.extname(file).toLowerCase();
      return AUDIO_EXTENSIONS.includes(ext);
    });

    if (audioFile) {
      const publicUrl = `/audio/wrapup/${folderName}/${encodeURIComponent(audioFile)}`;
      return NextResponse.json({
        found: true,
        monthIndex,
        folderName,
        fileName: audioFile,
        url: publicUrl,
      });
    }

    return NextResponse.json({
      found: false,
      monthIndex,
      folderName,
    });
  } catch (error) {
    console.error('[WrapUp Audio API] Error:', error);
    return NextResponse.json({ found: false, error: 'Internal server error' }, { status: 500 });
  }
}
