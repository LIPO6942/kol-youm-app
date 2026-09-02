// Web Audio API ambient soundtrack generator for Monthly Wrap-Up
// Generates soft, warm, atmospheric chord progressions and melodic arpeggios tailored to each month.

type MonthlyTheme = {
  name: string;
  bpm: number;
  rootFreq: number; // Base root frequency (Hz)
  scale: number[];  // Frequency multipliers for chords/harmonics
  chordProgression: number[][]; // Indices into the scale
  waveform: OscillatorType;
  filterFreq: number; // Warm lowpass filter cutoff
  reverbDecay: number;
};

// 12 distinct musical mood themes for each month of the year
const MONTHLY_THEMES: Record<number, MonthlyTheme> = {
  // Janvier: Lofi Winter Chill (D minor 9th / F major 7th) - Soft, cozy, introspective
  0: {
    name: 'Hiver Feutré',
    bpm: 58,
    rootFreq: 146.83, // D3
    scale: [1, 1.2, 1.334, 1.5, 1.682, 1.888, 2.0, 2.4], // D natural minor
    chordProgression: [
      [0, 2, 4, 6], // Dm9
      [4, 6, 8, 10], // Bb maj7
      [2, 4, 6, 8], // F maj7
      [3, 5, 7, 9], // G min7
    ],
    waveform: 'triangle',
    filterFreq: 650,
    reverbDecay: 2.2,
  },
  // Février: Romance & Velvet (G major 7th / E minor 9th) - Smooth, warm
  1: {
    name: 'Douceur Velours',
    bpm: 62,
    rootFreq: 196.00, // G3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0], // G major
    chordProgression: [
      [0, 2, 4, 6], // Gmaj7
      [5, 7, 9, 11], // Em9
      [3, 5, 7, 9], // Cmaj7
      [1, 3, 5, 7], // Am7
    ],
    waveform: 'sine',
    filterFreq: 800,
    reverbDecay: 2.5,
  },
  // Mars: Éveil Printanier (C major 7th / A minor 9th) - Fresh, uplifting chime
  2: {
    name: 'Éveil Printanier',
    bpm: 72,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0], // C major
    chordProgression: [
      [0, 2, 4, 6], // Cmaj7
      [5, 7, 9, 11], // Am9
      [3, 5, 7, 9], // Fmaj7
      [4, 6, 8, 10], // G6
    ],
    waveform: 'sine',
    filterFreq: 950,
    reverbDecay: 2.0,
  },
  // Avril: Brise Douce (F major 7th / D minor 7th) - Light, airy arpeggios
  3: {
    name: 'Brise Douce',
    bpm: 76,
    rootFreq: 174.61, // F3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0], // F major
    chordProgression: [
      [0, 2, 4, 6], // Fmaj7
      [3, 5, 7, 9], // Bbmaj7
      [5, 7, 9, 11], // Dm7
      [2, 4, 6, 8], // Am7
    ],
    waveform: 'triangle',
    filterFreq: 850,
    reverbDecay: 2.4,
  },
  // Mai: Floraison Radieuse (D major 7th / G major 7th) - Sunlit, energetic
  4: {
    name: 'Floraison Solaire',
    bpm: 80,
    rootFreq: 220.00, // A3
    scale: [1, 1.125, 1.26, 1.334, 1.5, 1.682, 1.888, 2.0], // D major relative
    chordProgression: [
      [0, 2, 4, 6],
      [4, 6, 8, 10],
      [2, 4, 6, 8],
      [5, 7, 9, 11],
    ],
    waveform: 'triangle',
    filterFreq: 1100,
    reverbDecay: 1.8,
  },
  // Juin: Soleil Levant (A major / E major) - Warm summer breeze
  5: {
    name: 'Soleil Levant',
    bpm: 86,
    rootFreq: 220.00, // A3
    scale: [1, 1.125, 1.26, 1.334, 1.5, 1.682, 1.888, 2.0],
    chordProgression: [
      [0, 2, 4, 6], // Amaj7
      [4, 6, 8, 10], // Emaj7
      [5, 7, 9, 11], // F#m7
      [3, 5, 7, 9], // Dmaj7
    ],
    waveform: 'sine',
    filterFreq: 1200,
    reverbDecay: 2.0,
  },
  // Juillet: Énergie Estivale (Tropical Synthwave / D maj) - Upbeat, radiant
  6: {
    name: 'Vibes Estivales',
    bpm: 90,
    rootFreq: 293.66, // D4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0],
    chordProgression: [
      [0, 2, 4, 6], // Dmaj7
      [3, 5, 7, 9], // Gmaj7
      [5, 7, 9, 11], // Bm7
      [4, 6, 8, 10], // A7
    ],
    waveform: 'triangle',
    filterFreq: 1300,
    reverbDecay: 1.6,
  },
  // Août: Nuit Étoilée & Sunset (E major / A major) - Lush golden hour pads
  7: {
    name: 'Golden Hour',
    bpm: 82,
    rootFreq: 164.81, // E3
    scale: [1, 1.125, 1.26, 1.334, 1.5, 1.682, 1.888, 2.0],
    chordProgression: [
      [0, 2, 4, 6], // Emaj7
      [3, 5, 7, 9], // Amaj7
      [1, 3, 5, 7], // F#m7
      [4, 6, 8, 10], // B7
    ],
    waveform: 'sine',
    filterFreq: 950,
    reverbDecay: 2.8,
  },
  // Septembre: Rentrée & Jazz Lofi (F major 7th / D minor 7th) - Mellow, nostalgic
  8: {
    name: 'Rentrée Lofi',
    bpm: 72,
    rootFreq: 174.61, // F3
    scale: [1, 1.125, 1.2, 1.334, 1.5, 1.6, 1.875, 2.0],
    chordProgression: [
      [0, 2, 4, 6], // Fmaj7
      [5, 7, 9, 11], // Dm9
      [1, 3, 5, 7], // Gm7
      [4, 6, 8, 10], // C7
    ],
    waveform: 'triangle',
    filterFreq: 750,
    reverbDecay: 2.2,
  },
  // Octobre: Feuilles Dorées (A minor 7th / F major 7th) - Cozy fireplace chords
  9: {
    name: 'Feuilles Dorées',
    bpm: 66,
    rootFreq: 220.00, // A3
    scale: [1, 1.125, 1.2, 1.334, 1.5, 1.6, 1.78, 2.0], // A minor
    chordProgression: [
      [0, 2, 4, 6], // Am7
      [5, 7, 9, 11], // Fmaj7
      [2, 4, 6, 8], // Cmaj7
      [4, 6, 8, 10], // Em7
    ],
    waveform: 'sine',
    filterFreq: 700,
    reverbDecay: 2.6,
  },
  // Novembre: Pluie Douce & Cinématique (C# minor 7th / A major 7th) - Deep ambient
  10: {
    name: 'Brume Nocturne',
    bpm: 60,
    rootFreq: 138.59, // C#3
    scale: [1, 1.125, 1.2, 1.334, 1.5, 1.6, 1.78, 2.0],
    chordProgression: [
      [0, 2, 4, 6], // C#m7
      [5, 7, 9, 11], // Amaj7
      [3, 5, 7, 9], // F#m7
      [4, 6, 8, 10], // G#m7
    ],
    waveform: 'sine',
    filterFreq: 620,
    reverbDecay: 3.0,
  },
  // Décembre: Fêtes & Harmonies Célestes (G major / C major / D major) - Festive warm sparkle
  11: {
    name: 'Magie d’Hiver',
    bpm: 74,
    rootFreq: 196.00, // G3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0],
    chordProgression: [
      [0, 2, 4, 6], // Gmaj7
      [3, 5, 7, 9], // Cmaj7
      [4, 6, 8, 10], // D6
      [5, 7, 9, 11], // Em7
    ],
    waveform: 'triangle',
    filterFreq: 1050,
    reverbDecay: 2.8,
  },
};

export class WrapUpAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private intervalId: any = null;
  private isPlaying = false;
  private isMuted = false;
  private currentMonth = 0;
  private chordIndex = 0;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.filterNode = this.ctx.createBiquadFilter();

        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);
        this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.filterNode.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  public async start(monthIndex: number = 0) {
    if (this.isPlaying) return;

    this.initContext();
    if (!this.ctx || !this.masterGain || !this.filterNode) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.currentMonth = Math.max(0, Math.min(11, monthIndex));
    const theme = MONTHLY_THEMES[this.currentMonth] || MONTHLY_THEMES[0];

    this.filterNode.frequency.setValueAtTime(theme.filterFreq, this.ctx.currentTime);
    this.isPlaying = true;
    this.chordIndex = 0;

    // Smooth fade in
    const targetVolume = this.isMuted ? 0 : 0.22;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVolume), this.ctx.currentTime + 1.5);

    // Play first chord immediately
    this.playNextChord(theme);

    // Schedule subsequent chords according to BPM
    const chordDurationMs = (60 / theme.bpm) * 4 * 1000;
    this.intervalId = setInterval(() => {
      if (this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.playNextChord(theme);
      }
    }, chordDurationMs);
  }

  private playNextChord(theme: MonthlyTheme) {
    if (!this.ctx || !this.filterNode || !this.isPlaying) return;

    const progression = theme.chordProgression;
    const chordNoteIndices = progression[this.chordIndex % progression.length];
    this.chordIndex++;

    const now = this.ctx.currentTime;
    const chordDuration = (60 / theme.bpm) * 4;

    chordNoteIndices.forEach((noteIdx, i) => {
      if (!this.ctx || !this.filterNode) return;

      const scaleLen = theme.scale.length;
      const octave = Math.floor(noteIdx / scaleLen);
      const scaleDegree = noteIdx % scaleLen;
      const multiplier = (theme.scale[scaleDegree] || 1) * Math.pow(2, octave);
      const freq = theme.rootFreq * multiplier;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = theme.waveform;
      osc.frequency.setValueAtTime(freq, now);

      // Micro detuning for lush, warm chorus effect
      const detune = (i - 1.5) * 4.5;
      osc.detune.setValueAtTime(detune, now);

      // Gentle envelope
      const baseNoteVolume = 0.08 / Math.sqrt(chordNoteIndices.length);
      const attackTime = 0.4 + i * 0.08;
      const releaseTime = Math.min(chordDuration + 0.8, theme.reverbDecay + 1);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.exponentialRampToValueAtTime(baseNoteVolume, now + attackTime);
      noteGain.gain.setValueAtTime(baseNoteVolume, now + chordDuration - 0.5);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      osc.connect(noteGain);
      noteGain.connect(this.filterNode);

      osc.start(now + i * 0.04);
      osc.stop(now + releaseTime);

      this.activeOscillators.push(osc);
      this.activeGains.push(noteGain);

      // Cleanup finished nodes
      setTimeout(() => {
        const oscIdx = this.activeOscillators.indexOf(osc);
        if (oscIdx > -1) this.activeOscillators.splice(oscIdx, 1);
        const gainIdx = this.activeGains.indexOf(noteGain);
        if (gainIdx > -1) this.activeGains.splice(gainIdx, 1);
      }, releaseTime * 1000 + 100);
    });
  }

  public pause() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  }

  public resume() {
    if (!this.ctx || !this.masterGain || this.isMuted || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.22, now + 0.4);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      const target = this.isMuted ? 0.0001 : 0.22;
      this.masterGain.gain.exponentialRampToValueAtTime(target, now + 0.3);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getThemeName(monthIndex: number): string {
    return MONTHLY_THEMES[monthIndex]?.name || 'Ambiance Mensuelle';
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      setTimeout(() => {
        this.activeOscillators.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch (e) {}
        });
        this.activeGains.forEach(g => {
          try { g.disconnect(); } catch (e) {}
        });
        this.activeOscillators = [];
        this.activeGains = [];
      }, 700);
    }
  }
}

export const wrapUpAudio = new WrapUpAudioEngine();
