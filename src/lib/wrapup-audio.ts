// Hybrid Audio Engine for Monthly Wrap-Up
// 1. Checks if the user added a custom audio file in /public/audio/wrapup/<month-folder>/ (e.g. 08-aout/music.mp3)
// 2. If present, plays the custom track with seamless loop & volume controls.
// 3. If absent, falls back to the dynamic 120+ BPM Web Audio synth groove tailored per month.

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
  // 01-Janvier (Wrap-up de Janvier - notifié le 01 Février)
  0: {
    name: 'Électro Hivernale',
    bpm: 118,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 5, 5, 4, 4],
    leadPattern: [0, 4, 7, 9, 7, 4, 2, 4, 0, 7, 9, 11, 9, 7, 4, 2],
    chordStabs: [[0, 2, 4], [3, 5, 7], [5, 7, 9], [4, 6, 8]],
  },
  // 02-Février
  1: {
    name: 'Funky Vibe',
    bpm: 120,
    rootFreq: 196, // G3
    scale: [1, 1.125, 1.25, 1.414, 1.5, 1.667, 1.78, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 2, 2, 5, 5],
    leadPattern: [0, 2, 4, 7, 4, 2, 0, 7, 4, 7, 9, 7, 4, 2, 4, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [2, 4, 6], [5, 7, 9]],
  },
  // 03-Mars
  2: {
    name: 'Renouveau Festif',
    bpm: 122,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 9, 11, 9, 7, 4],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
  // 04-Avril
  3: {
    name: 'Rythme Solaire',
    bpm: 120,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 4, 4, 5, 5],
    leadPattern: [2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 12, 9, 7, 4, 2],
    chordStabs: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [5, 7, 9]],
  },
  // 05-Mai
  4: {
    name: 'Énergie Printanière',
    bpm: 124,
    rootFreq: 293.66, // D4
    scale: [1, 1.125, 1.26, 1.334, 1.5, 1.682, 1.888, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 1, 1, 3, 3],
    leadPattern: [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [1, 3, 5], [3, 5, 7]],
  },
  // 06-Juin
  5: {
    name: 'Summer Hits',
    bpm: 124,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 4, 7, 9, 11, 9, 7, 4, 0, 7, 9, 12, 11, 9, 7, 4],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
  // 07-Juillet
  6: {
    name: 'Fiesta Estivale',
    bpm: 125,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 4, 4, 5, 5],
    leadPattern: [0, 2, 4, 7, 9, 7, 4, 7, 0, 4, 7, 9, 12, 9, 7, 4],
    chordStabs: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [5, 7, 9]],
  },
  // 08-Août (Wrap-up d'Août - notifié le 01 Septembre)
  7: {
    name: 'Golden Hour Beat',
    bpm: 122,
    rootFreq: 196, // G3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 5, 5, 3, 3],
    leadPattern: [4, 7, 9, 11, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0],
    chordStabs: [[0, 2, 4], [4, 6, 8], [5, 7, 9], [3, 5, 7]],
  },
  // 09-Septembre
  8: {
    name: 'Rentrée Énergique',
    bpm: 120,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.2, 1.334, 1.5, 1.6, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 3, 3, 5, 5, 4, 4],
    leadPattern: [0, 2, 4, 7, 4, 2, 0, 7, 4, 7, 9, 7, 4, 2, 4, 0],
    chordStabs: [[0, 2, 4], [3, 5, 7], [5, 7, 9], [4, 6, 8]],
  },
  // 10-Octobre
  9: {
    name: 'Synthwave Automnale',
    bpm: 120,
    rootFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.414, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 2, 2, 5, 5],
    leadPattern: [2, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 11, 9, 7, 4, 2],
    chordStabs: [[0, 2, 4], [4, 6, 8], [2, 4, 6], [5, 7, 9]],
  },
  // 11-Novembre
  10: {
    name: 'Cosy & Dynamique',
    bpm: 118,
    rootFreq: 220, // A3
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 5, 5, 3, 3, 4, 4],
    leadPattern: [0, 4, 7, 4, 9, 7, 4, 2, 0, 7, 9, 7, 4, 2, 4, 0],
    chordStabs: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
  },
  // 12-Décembre
  11: {
    name: 'Célébration Fin d’Année',
    bpm: 125,
    rootFreq: 293.66, // D4
    scale: [1, 1.125, 1.25, 1.334, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5],
    bassProgression: [0, 0, 4, 4, 1, 1, 3, 3],
    leadPattern: [0, 4, 7, 9, 12, 9, 7, 4, 0, 4, 7, 11, 9, 7, 4, 2],
    chordStabs: [[0, 2, 4], [4, 6, 8], [1, 3, 5], [3, 5, 7]],
  },
};

class WrapUpAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private isMuted = false;
  private currentMonth = 0;
  private stepInterval: any = null;
  private step = 0;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // Custom audio player
  private customAudio: HTMLAudioElement | null = null;
  private isUsingCustomAudio = false;

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

    this.isPlaying = true;
    this.currentMonth = Math.max(0, Math.min(11, monthIndex));

    // 1. Check if a custom audio file is in the month folder
    try {
      const res = await fetch(`/api/wrapup-audio?monthIndex=${this.currentMonth}`);
      const data = await res.json();
      if (data.found && data.url && this.isPlaying) {
        this.playCustomAudio(data.url);
        return;
      }
    } catch (e) {
      console.warn('[WrapUp Audio] Could not load custom audio, falling back to synth:', e);
    }

    // 2. If no custom file, run synth
    if (this.isPlaying) {
      this.startSynthPlayback();
    }
  }

  private playCustomAudio(url: string) {
    if (typeof window === 'undefined') return;
    this.stopSynth();
    this.isUsingCustomAudio = true;

    if (!this.customAudio) {
      this.customAudio = new Audio();
      this.customAudio.loop = true;
      this.customAudio.preload = 'auto';
    }

    this.customAudio.src = url;
    this.customAudio.volume = this.isMuted ? 0 : 0.95;
    this.customAudio.play().catch(e => {
      console.warn('[WrapUp Audio] Autoplay custom audio error:', e);
      // If custom playback fails, fallback to synth
      if (this.isPlaying) {
        this.isUsingCustomAudio = false;
        this.startSynthPlayback();
      }
    });
  }

  private async startSynthPlayback() {
    this.isUsingCustomAudio = false;
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.filterNode) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const theme = UPBEAT_MONTHLY_THEMES[this.currentMonth] || UPBEAT_MONTHLY_THEMES[0];
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
      if (this.isPlaying && this.ctx && this.ctx.state === 'running' && !this.isUsingCustomAudio) {
        this.step++;
        this.playStep(theme);
      }
    }, stepDurationMs);
  }

  private playStep(theme: UpbeatTheme) {
    if (!this.ctx || !this.filterNode || !this.isPlaying || this.isUsingCustomAudio) return;

    const now = this.ctx.currentTime;
    const current16th = this.step % 16;

    // 1. Percussion
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

    if (current16th % 2 === 1) {
      const hihatOsc = this.ctx.createOscillator();
      const hihatGain = this.ctx.createGain();
      hihatOsc.type = 'square';
      hihatOsc.frequency.setValueAtTime(8000 + Math.random() * 2000, now);
      hihatGain.gain.setValueAtTime(0.12, now);
      hihatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      hihatOsc.connect(hihatGain);
      hihatGain.connect(this.filterNode);
      hihatOsc.start(now);
      hihatOsc.stop(now + 0.05);
    }

    // 2. Bassline
    const bassIdx = theme.bassProgression[Math.floor(this.step / 2) % theme.bassProgression.length];
    const bassFreq = (theme.rootFreq * 0.5) * (theme.scale[bassIdx % theme.scale.length] || 1);

    if (current16th % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.45, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      bassOsc.connect(bassGain);
      bassGain.connect(this.filterNode);
      bassOsc.start(now);
      bassOsc.stop(now + 0.15);
    }

    // 3. Lead Melody
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

    // 4. Chord Stabs
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
    if (this.isUsingCustomAudio && this.customAudio) {
      this.customAudio.pause();
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
    }
  }

  public resume() {
    if (this.isMuted || !this.isPlaying) return;
    if (this.isUsingCustomAudio && this.customAudio) {
      this.customAudio.play().catch(() => {});
    } else if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.85, now + 0.2);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isUsingCustomAudio && this.customAudio) {
      this.customAudio.volume = this.isMuted ? 0 : 0.95;
    } else if (this.ctx && this.masterGain && this.isPlaying) {
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

  private stopSynth() {
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.0001, now);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.stopSynth();

    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio.currentTime = 0;
    }
    this.isUsingCustomAudio = false;
  }
}

export const wrapUpAudio = new WrapUpAudioEngine();
