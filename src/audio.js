// ============================================================================
// THE PILGRIM WALK — Gentle Ambient & Chime Synthesizer (Web Audio API)
// Soft per-biome ambient beds (garden breeze/birds, primordial deep water,
// wilderness wind) + warm harmonic chime as the pilgrim nears and faces a Light.
// No external music imported (§9). Fully mutable.
// ============================================================================

export class PilgrimAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    this.masterGain = null;
    this.windGain = null;
    this.waterGain = null;
    this.lastChimeTime = 0;
  }

  init() {
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0.0 : 0.35;
    this.masterGain.connect(this.ctx.destination);

    // Create soft pink/brown noise buffer for gentle garden breeze & water wash
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.25;
    }

    const breezeSource = this.ctx.createBufferSource();
    breezeSource.buffer = noiseBuffer;
    breezeSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 1.8;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.22;

    breezeSource.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    breezeSource.start(0);

    this.initialized = true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0.0 : 0.35, this.ctx.currentTime, 0.15);
    }
  }

  // Soft harmonic bell/harp chime when nearing a hidden Light or kindling one
  playLightChime(intensity = 0.5, isKindle = false) {
    if (this.muted) return;
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    if (!isKindle && now - this.lastChimeTime < 2.2) return;
    this.lastChimeTime = now;

    const notes = isKindle ? [293.66, 369.99, 440.0, 587.33, 739.99] : [440.0, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * (isKindle ? 0.14 : 0.18);
      const dur = isKindle ? 2.8 : 1.6;
      const peak = Math.min(0.18, intensity * (isKindle ? 0.16 : 0.07));

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    });
  }
}
