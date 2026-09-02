// Web Audio API energetic soundtrack engine for Monthly Wrap-Up
// Produces loud, vibrant, upbeat, and rhythmic synth melodies & grooves tailored for smartphone speakers.

type UpbeatTheme = {
  name: string;
  bpm: number;
  rootFreq: number; // Hz
  scale: number[];  // Frequency multipliers
  bassProgression: number[]; // Bass notes
  leadPattern: number[]; // 16-step rhythmic melody
  chordStabs: number[][];
};

const UPBEAT_MONTHLY_THEMES: Record<number, UpbeatTheme> = {
  // Janvier: Energetic Nu-Disco / Electro-Pop (118 BPM)
  0: {
    name: 'Électro Hivernale',
    bpm: 118,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 5, 5, 4, 4],
    leadPattern: [0, 4, 7, 9, 7, 4, 2, 4, 0, 7, 9, 11, 9, 7, 4, 2],
    chordStabs: [[0, 2, 4], [3, 5, 7], [5, 7, 9], [4, 6, 8]],
  },
  // Février: Funky Groove (120 BPM)
  1: {
    name: 'Funky Vibe',
    bpm: 120,
    rootFreq: 196, // G3
    scale: [1, 1.125, 1.25, 1.414, 1.5, 1.667, 1.78, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 2, 2, 5, 5],
    leadPattern: [0, 2, 4, 7, 4, 2, 0, 7, 4, 7, 9, 7, 4, 2, 4, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [2, 4, 6], [5, 7, 9]],
  },
  // Mars: Spring Anthem / Uplifting House (122 BPM)
  2: {
    name: 'Renouveau Festif',
    bpm: 122,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 9, 11, 9, 7, 4],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
  // Avril: Sunny Pop Groove (120 BPM)
  3: {
    name: 'Rythme Solaire',
    bpm: 120,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 4, 4, 5, 5],
    leadPattern: [2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 12, 9, 7, 4, 2],
    chordStabs: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [5, 7, 9]],
  },
  // Mai: Tropical Dance (124 BPM)
  4: {
    name: 'Énergie Printanière',
    bpm: 124,
    rootFreq: 293.66, // D4
    scale: [1, 1.125, 1.26, 1.334, 1.5, 1.682, 1.888, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 1, 1, 3, 3],
    leadPattern: [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [1, 3, 5], [3, 5, 7]],
  },
  // Juin: Summer Kickoff / Festival Beat (124 BPM)
  5: {
    name: 'Summer Hits',
    bpm: 124,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 4, 7, 9, 11, 9, 7, 4, 0, 7, 9, 12, 11, 9, 7, 4],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
  // Juillet: Tropical Synthwave Party (125 BPM)
  6: {
    name: 'Fiesta Estivale',
    bpm: 125,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 4, 4, 5, 5],
    leadPattern: [0, 2, 4, 7, 9, 7, 4, 7, 0, 4, 7, 9, 12, 9, 7, 4],
    chordStabs: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [5, 7, 9]],
  },
  // Août: Golden Sunset Dance (122 BPM)
  7: {
    name: 'Golden Hour Beat',
    bpm: 122,
    rootFreq: 196, // G3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 5, 5, 3, 3],
    leadPattern: [4, 7, 9, 11, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [5, 7, 9], [3, 5, 7]],
  },
  // Septembre: Upbeat Back-to-School Bounce (120 BPM)
  8: {
    name: 'Rentrée Énergique',
    bpm: 120,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.2, 1.334, 1.5, 1.6, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 3, 7, 9, 7, 3, 0, 7, 3, 7, 10, 7, 3, 0, 3, 7],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
  // Octobre: Funky Autumn Beats (118 BPM)
  9: {
    name: 'Groove d’Automne',
    bpm: 118,
    rootFreq: 196, // G3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 2, 2, 5, 5],
    leadPattern: [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [2, 4, 6], [5, 7, 9]],
  },
  // Novembre: Neon Synth Drive (120 BPM)
  10: {
    name: 'Nuit Synthwave',
    bpm: 120,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.2, 1.334, 1.5, 1.6, 1.78, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 5, 5, 4, 4],
    leadPattern: [0, 3, 7, 8, 7, 3, 0, 7, 0, 3, 7, 10, 8, 7, 3, 0],
    chordStabs: [[0, 2, 4], [3, 5, 7], [5, 7, 9], [4, 6, 8]],
  },
  // Décembre: Celebratory Holiday Dance (124 BPM)
  11: {
    name: 'Célébration d’Hiver',
    bpm: 124,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 4, 7, 11, 9, 7, 4, 2, 0, 4, 7, 9, 12, 11, 9, 7],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
};

export class WrapUpAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private stepInterval: any = null;
  private isPlaying = false;
  private isMuted = false;
  private currentMonth = 0;
  private step = 0;

  constructor() {}

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        // Multi-band compressor to maximize loudness and punch on phone speakers without clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(2600, this.ctx.currentTime); // Bright & clear
        this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

        // Chain: Filter -> Compressor -> MasterGain -> Destination
        this.filterNode.connect(this.compressor);
        this.compressor.connect(this.masterGain);
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
    const theme = UPBEAT_MONTHLY_THEMES[this.currentMonth] || UPBEAT_MONTHLY_THEMES[0];

    this.isPlaying = true;
    this.step = 0;

    // Loud, punchy master volume (0.85)
    const targetVolume = this.isMuted ? 0 : 0.85;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0.001, targetVolume), this.ctx.currentTime + 0.4);

    // 16th note step sequencer timing (BPM based)
    const stepDurationMs = (60 / theme.bpm / 4) * 1000;
    
    // Play first step immediately
    this.playStep(theme);

    this.stepInterval = setInterval(() => {
      if (this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.step++;
        this.playStep(theme);
      }
    }, stepDurationMs);
  }

  private playStep(theme: UpbeatTheme) {
    if (!this.ctx || !this.filterNode || !this.isPlaying) return;

    const now = this.ctx.currentTime;
    const current16th = this.step % 16;
    const currentBarBeat = this.step % 4;

    // 1. Snappy Percussion: Kick on beat 0 & 2, Hi-hat on every odd 16th, Snare/Clap on beat 2 (step 8)
    // Kick (Punchy low sine sweep)
    if (current16th === 0 || current16th === 8 || current16th === 12) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
      kickGain.gain.setValueAtTime(0.6, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      kickOsc.connect(kickGain);
      kickGain.connect(this.filterNode);
      kickOsc.start(now);
      kickOsc.stop(now + 0.13);
    }

    // Snare / Clap on step 4 & 12
    if (current16th === 4 || current16th === 12) {
      const snareOsc = this.ctx.createOscillator();
      const snareGain = this.ctx.createGain();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(220, now);
      snareOsc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
      snareGain.gain.setValueAtTime(0.45, now);
      snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      snareOsc.connect(snareGain);
      snareGain.connect(this.filterNode);
      snareOsc.start(now);
      snareOsc.stop(now + 0.15);
    }

    // Hi-hat tick on off-beats
    if (current16th % 2 !== 0) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(8000 + (current16th * 200), now);
      hatGain.gain.setValueAtTime(0.18, now);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      hatOsc.connect(hatGain);
      hatGain.connect(this.filterNode);
      hatOsc.start(now);
      hatOsc.stop(now + 0.04);
    }

    // 2. Punchy Bassline (8th note pumping bass)
    if (current16th % 2 === 0) {
      const bassNoteIndex = theme.bassProgression[Math.floor(this.step / 8) % theme.bassProgression.length];
      const bassFreq = (theme.rootFreq * 0.5) * (theme.scale[bassNoteIndex % theme.scale.length] || 1);
      
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.35, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      bassOsc.connect(bassGain);
      bassGain.connect(this.filterNode);
      bassOsc.start(now);
      bassOsc.stop(now + 0.15);
    }

    // 3. Catchy Lead Melody (Lively Arpeggio)
    const leadNoteIdx = theme.leadPattern[current16th];
    const scaleLen = theme.scale.length;
    const octave = Math.floor(leadNoteIdx / scaleLen);
    const degree = leadNoteIdx % scaleLen;
    const leadFreq = (theme.rootFreq * (theme.scale[degree] || 1)) * Math.pow(2, octave);

    const leadOsc = this.ctx.createOscillator();
    const leadGain = this.ctx.createGain();
    leadOsc.type = 'triangle';
    leadOsc.frequency.setValueAtTime(leadFreq, now);

    leadGain.gain.setValueAtTime(0.28, now);
    leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    leadOsc.connect(leadGain);
    leadGain.connect(this.filterNode);
    leadOsc.start(now);
    leadOsc.stop(now + 0.12);

    // 4. Upbeat Chord Stabs on beats 0, 6, 10
    if (current16th === 0 || current16th === 6 || current16th === 10) {
      const chordIdx = Math.floor(this.step / 16) % theme.chordStabs.length;
      const notes = theme.chordStabs[chordIdx];
      
      notes.forEach((nIdx, i) => {
        if (!this.ctx || !this.filterNode) return;
        const cFreq = (theme.rootFreq * 1.5) * (theme.scale[nIdx % theme.scale.length] || 1);
        const cOsc = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        cOsc.type = 'sine';
        cOsc.frequency.setValueAtTime(cFreq, now);
        cOsc.detune.setValueAtTime((i - 1) * 8, now);

        cGain.gain.setValueAtTime(0.2, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        cOsc.connect(cGain);
        cGain.connect(this.filterNode);
        cOsc.start(now);
        cOsc.stop(now + 0.19);
      });
    }
  }

  public pause() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
  }

  public resume() {
    if (!this.ctx || !this.masterGain || this.isMuted || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(0.85, now + 0.2);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      const target = this.isMuted ? 0.0001 : 0.85;
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.15);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getThemeName(monthIndex: number): string {
    return UPBEAT_MONTHLY_THEMES[monthIndex]?.name || 'Beat Énergique';
  }

  public stop() {
    this.isPlaying = false;
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    }
  }
}

export const wrapUpAudio = new WrapUpAudioEngine();
