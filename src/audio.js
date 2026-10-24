// ============================================================================
// THE PILGRIM WALK — Music & Gentle Ambient Controller
// Plays:
//   - Per-book soothing street background MP3s (`Music/<NN>-<slug>/street<N>.mp3` or `street.mp3`)
//   - Special Step-Through Painting Scene MP3s (`Music/<NN>-<slug>/scene-<N>.mp3`) when
//     stepping through a painting doorway, and smoothly crossfades back to the street
//     ambient track when returning to the main path.
//   - Soft Web Audio harmonic chimes & gentle breeze bed.
//   - Deep voice ducking (drops music & ambient to a 3.5% whisper via Web Audio GainNode
//     so it works on iPhone/iOS as well as desktop whenever Selene reads a poem/devotional).
// ============================================================================

const DISTRICT_MUSIC_FOLDERS = {
  genesis: { num: 1, folder: '01-genesis' },
  exodus: { num: 2, folder: '02-exodus' },
  'fire-by-night': { num: 3, folder: '03-fire-by-night' },
  'choose-life': { num: 4, folder: '04-choose-life' },
  'joshua-judges': { num: 5, folder: '05-joshua-judges' },
  ruth: { num: 6, folder: '06-ruth' },
  samuel: { num: 7, folder: '07-samuel' },
  kings: { num: 8, folder: '08-kings' },
  'our-eyes-are-on-you': { num: 9, folder: '09-our-eyes-are-on-you' },
  'rise-up-and-build': { num: 10, folder: '10-rise-up-and-build' },
  'for-such-a-time-as-this': { num: 11, folder: '11-for-such-a-time-as-this' },
  'out-of-the-whirlwind': { num: 12, folder: '12-out-of-the-whirlwind' },
  'psalms-1': { num: 13, folder: '13-psalms-1' },
  'psalms-2': { num: 14, folder: '14-psalms-2' },
  'psalms-3': { num: 15, folder: '15-psalms-3' },
  'psalms-4': { num: 16, folder: '16-psalms-4' },
  'the-beginning-of-wisdom': { num: 17, folder: '17-the-beginning-of-wisdom' },
  'eternity-in-their-hearts': { num: 18, folder: '18-eternity-in-their-hearts' },
  'many-waters': { num: 19, folder: '19-many-waters' },
  'arise-shine': { num: 20, folder: '20-arise-shine' },
  'a-future-and-a-hope': { num: 21, folder: '21-a-future-and-a-hope' },
  'new-every-morning': { num: 22, folder: '22-new-every-morning' },
  'can-these-bones-live': { num: 23, folder: '23-can-these-bones-live' },
  'greatly-beloved': { num: 24, folder: '24-greatly-beloved' },
  'a-door-of-hope': { num: 25, folder: '25-a-door-of-hope' },
  'out-of-the-deep': { num: 26, folder: '26-out-of-the-deep' },
  'the-day-of-small-things': { num: 27, folder: '27-the-day-of-small-things' },
  'good-news-of-great-joy': { num: 28, folder: '28-good-news-of-great-joy' },
  'i-am-with-you-always': { num: 29, folder: '29-i-am-with-you-always' },
  'peace-be-still': { num: 30, folder: '30-peace-be-still' },
  'come-and-see': { num: 31, folder: '31-come-and-see' },
  'to-the-ends-of-the-earth': { num: 32, folder: '32-to-the-ends-of-the-earth' },
  'nothing-can-separate': { num: 33, folder: '33-nothing-can-separate' },
  'treasure-in-clay-jars': { num: 34, folder: '34-treasure-in-clay-jars' },
  'rooted-and-free': { num: 35, folder: '35-rooted-and-free' },
  'joy-in-chains': { num: 36, folder: '36-joy-in-chains' },
  'held-together': { num: 37, folder: '37-held-together' },
  'children-of-the-day': { num: 38, folder: '38-children-of-the-day' },
  'grace-mercy-and-peace': { num: 39, folder: '39-grace-mercy-and-peace' },
  'anchor-of-the-soul': { num: 40, folder: '40-anchor-of-the-soul' },
  'doers-of-the-word': { num: 41, folder: '41-doers-of-the-word' },
  'a-living-hope': { num: 42, folder: '42-a-living-hope' },
  'little-children': { num: 43, folder: '43-little-children' },
  'all-things-new': { num: 44, folder: '44-all-things-new' }
};

// Known dedicated step-through scene MP3 tracks across the 44 Music folders
// (prevents 404 network probes on scenes that keep their book's street music playing)
const KNOWN_SCENE_TRACKS = {
  genesis: new Set([1, 4, 11]),
  exodus: new Set([5, 14, 20, 40]),
  'fire-by-night': new Set([5, 21, 32, 33]),
  'choose-life': new Set([10, 25, 30, 35]),
  'psalms-1': new Set([22]),
  'psalms-2': new Set([1, 5]),
  'psalms-3': new Set([19, 31]),
  'psalms-4': new Set([44]),
  'the-beginning-of-wisdom': new Set([6, 14, 25, 38]),
  'many-waters': new Set([5, 7, 14, 29])
};

export class PilgrimAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    this.masterGain = null;
    this.windGain = null;
    this.musicBusGain = null;
    this.lastChimeTime = 0;

    // Master, Music & Voice Volume Controls (0.0 .. 1.0, persisted in saveData)
    this.masterVolume = 1.0;
    this.musicVolume = 1.0;
    this.voiceVolume = 1.0;
    this.onVolumeChange = null;

    // Background Music State
    this.baseMusicVolume = 0.26;
    this.duckedMusicVolume = 0.035; // Whisper-quiet (3.5%) when Selene is reading aloud
    this.voiceDucked = false;
    this.currentTrackUrl = null;
    this.currentAudio = null;
    this.fadingElements = new Set();
    this.streetTrackPositions = new Map(); // remembers playback position per book street
    this.activeStreetSlug = 'genesis';
    this.activeSceneNum = null;
    this._requestToken = 0;

    // Unlock audio playback on first user gesture if browser deferred autoplay
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.currentAudio && this.currentAudio.paused && !this.muted) {
        this.currentAudio.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.currentAudio && this.currentAudio.paused && !this.muted) {
      this.currentAudio.play().catch(() => {});
    }
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.getEffectiveMasterGain();
    this.masterGain.connect(this.ctx.destination);

    // Dedicated Web Audio bus for background MP3 music so volume & ducking work even on iOS Safari
    this.musicBusGain = this.ctx.createGain();
    this.musicBusGain.gain.value = this.getEffectiveMusicBusGain();
    this.musicBusGain.connect(this.ctx.destination);

    // Attach existing currentAudio to Web Audio bus if it was created before init()
    if (this.currentAudio && !this.currentAudio._webAudioRouted) {
      this.routeElementThroughWebAudio(this.currentAudio);
    }

    // Subtle garden breeze bed underneath the music
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.12;
    }

    const breezeSource = this.ctx.createBufferSource();
    breezeSource.buffer = noiseBuffer;
    breezeSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320;
    filter.Q.value = 1.8;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = this.voiceDucked ? 0.01 : 0.08;

    breezeSource.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    breezeSource.start(0);

    this.initialized = true;
  }

  routeElementThroughWebAudio(audioEl) {
    if (!audioEl || audioEl._webAudioRouted || !this.ctx || !this.musicBusGain) return;
    try {
      const srcNode = this.ctx.createMediaElementSource(audioEl);
      const trackGain = this.ctx.createGain();
      trackGain.gain.value = 1.0;
      srcNode.connect(trackGain);
      trackGain.connect(this.musicBusGain);
      audioEl._trackGainNode = trackGain;
      audioEl._webAudioRouted = true;
    } catch (_) {
      // Fallback to standard HTMLAudioElement volume if createMediaElementSource is not supported
    }
  }

  getEffectiveMasterGain() {
    if (this.muted) return 0.0;
    return 0.22 * this.masterVolume;
  }

  getEffectiveMusicBusGain() {
    if (this.muted) return 0.0;
    const duckFactor = this.voiceDucked ? 0.14 : 1.0;
    return duckFactor * this.masterVolume * this.musicVolume;
  }

  getEffectiveVoiceVolume() {
    if (this.muted) return 0.0;
    return Math.max(0.0, Math.min(1.0, this.masterVolume * this.voiceVolume));
  }

  getTargetMusicVolume() {
    if (this.muted) return 0.0;
    const base = this.voiceDucked ? this.duckedMusicVolume : this.baseMusicVolume;
    return Math.max(0.0, Math.min(1.0, base * this.masterVolume * this.musicVolume));
  }

  setVolumes({ master, music, voice, muted } = {}) {
    if (typeof master === 'number' && !Number.isNaN(master)) {
      this.masterVolume = Math.max(0.0, Math.min(1.0, master));
    }
    if (typeof music === 'number' && !Number.isNaN(music)) {
      this.musicVolume = Math.max(0.0, Math.min(1.0, music));
    }
    if (typeof voice === 'number' && !Number.isNaN(voice)) {
      this.voiceVolume = Math.max(0.0, Math.min(1.0, voice));
    }
    if (typeof muted === 'boolean') {
      this.muted = muted;
    }
    this.applyVolumeState();
  }

  applyVolumeState() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.getEffectiveMasterGain(), this.ctx.currentTime, 0.08);
    }
    if (this.musicBusGain && this.ctx) {
      this.musicBusGain.gain.setTargetAtTime(this.getEffectiveMusicBusGain(), this.ctx.currentTime, 0.08);
    }
    if (this.currentAudio) {
      this.currentAudio.volume = this.getTargetMusicVolume();
      if (!this.muted && this.masterVolume > 0 && this.musicVolume > 0 && this.currentAudio.paused && !this.voiceDucked) {
        this.currentAudio.play().catch(() => {});
      }
    }
    if (typeof this.onVolumeChange === 'function') {
      this.onVolumeChange(this);
    }
  }

  setVoiceDucking(ducked) {
    this.voiceDucked = !!ducked;
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.currentAudio) {
      if (!this.currentAudio._webAudioRouted) {
        this.routeElementThroughWebAudio(this.currentAudio);
      }
      this.currentAudio.volume = this.getTargetMusicVolume();
      // On iOS devices where HTMLAudioElement.volume is locked at 1.0 if not routed prior to play,
      // gently pause the background music while Selene speaks and resume when she finishes
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS && !this.currentAudio._webAudioRouted) {
        if (this.voiceDucked && !this.currentAudio.paused) {
          this.currentAudio._pausedForVoice = true;
          this.currentAudio.pause();
        } else if (!this.voiceDucked && this.currentAudio._pausedForVoice && !this.muted) {
          this.currentAudio._pausedForVoice = false;
          this.currentAudio.play().catch(() => {});
        }
      }
    }
    if (this.musicBusGain && this.ctx) {
      this.musicBusGain.gain.setTargetAtTime(this.getEffectiveMusicBusGain(), this.ctx.currentTime, 0.10);
    }
    if (this.windGain && this.ctx) {
      const targetWind = this.voiceDucked ? 0.002 : 0.07;
      this.windGain.gain.setTargetAtTime(targetWind, this.ctx.currentTime, 0.10);
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
    this.applyVolumeState();
  }

  getStreetCandidates(slug) {
    const info = DISTRICT_MUSIC_FOLDERS[slug] || DISTRICT_MUSIC_FOLDERS.genesis;
    if (info.num === 1) {
      return [`Music/${info.folder}/street.mp3`];
    }
    return [
      `Music/${info.folder}/street${info.num}.mp3`,
      `Music/${info.folder}/street.mp3`
    ];
  }

  getSceneCandidates(slug, paintingNum) {
    const info = DISTRICT_MUSIC_FOLDERS[slug] || DISTRICT_MUSIC_FOLDERS.genesis;
    const known = KNOWN_SCENE_TRACKS[slug];
    if (!known || !known.has(Number(paintingNum))) {
      return [];
    }
    return [`Music/${info.folder}/scene-${paintingNum}.mp3`];
  }

  async playStreetMusic(slug) {
    this.activeStreetSlug = slug || 'genesis';
    this.activeSceneNum = null;
    const candidates = this.getStreetCandidates(this.activeStreetSlug);
    const savedTime = this.streetTrackPositions.get(this.activeStreetSlug) || 0;
    await this.crossfadeToFirstAvailable(candidates, savedTime, false);
  }

  async playSceneMusic(slug, paintingNum) {
    const targetSlug = slug || this.activeStreetSlug || 'genesis';
    this.activeStreetSlug = targetSlug;
    this.activeSceneNum = paintingNum;

    // Save current street playback position before transitioning into the painting doorway
    if (this.currentAudio && this.currentTrackUrl && this.currentTrackUrl.includes('/street')) {
      this.streetTrackPositions.set(targetSlug, this.currentAudio.currentTime || 0);
    }

    const candidates = this.getSceneCandidates(targetSlug, paintingNum);
    const loadedScene = await this.crossfadeToFirstAvailable(candidates, 0, true);
    if (!loadedScene && !this.currentAudio) {
      // If this painting doorway doesn't have a specific scene MP3 yet, make sure the book's street track is playing
      await this.playStreetMusic(targetSlug);
    }
  }

  tryLoadAudio(url) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = true;
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        audio.oncanplaythrough = null;
        audio.onloadeddata = null;
        audio.onerror = null;
        resolve(ok ? audio : null);
      };
      audio.oncanplaythrough = () => finish(true);
      audio.onloadeddata = () => finish(true);
      audio.onerror = () => finish(false);
      audio.src = url;
      audio.load();
      setTimeout(() => finish(false), 3500);
    });
  }

  fadeOutAudioElement(audioEl) {
    if (!audioEl) return;
    this.fadingElements.add(audioEl);
    const startVol = audioEl.volume;
    const steps = 16;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const frac = Math.max(0, 1 - step / steps);
      audioEl.volume = startVol * frac;
      if (audioEl._trackGainNode && this.ctx) {
        audioEl._trackGainNode.gain.setValueAtTime(frac, this.ctx.currentTime);
      }
      if (step >= steps) {
        clearInterval(timer);
        audioEl.pause();
        audioEl.src = '';
        this.fadingElements.delete(audioEl);
      }
    }, 65);
  }

  async crossfadeToFirstAvailable(candidates, startTime = 0, keepCurrentIfNoneFound = false) {
    const token = ++this._requestToken;

    // If one of the candidates is already the active playing track, keep it playing smoothly
    if (this.currentAudio && this.currentTrackUrl && candidates.includes(this.currentTrackUrl)) {
      if (this.currentAudio.paused && !this.muted) {
        this.currentAudio.play().catch(() => {});
      }
      return true;
    }

    let nextAudio = null;
    let chosenUrl = null;
    for (const url of candidates) {
      const loaded = await this.tryLoadAudio(url);
      if (token !== this._requestToken) {
        if (loaded) {
          loaded.pause();
          loaded.src = '';
        }
        return false;
      }
      if (loaded) {
        nextAudio = loaded;
        chosenUrl = url;
        break;
      }
    }

    if (!nextAudio) {
      if (!keepCurrentIfNoneFound && this.currentAudio) {
        this.fadeOutAudioElement(this.currentAudio);
        this.currentAudio = null;
        this.currentTrackUrl = null;
      }
      return false;
    }

    // Fade out previous track
    if (this.currentAudio) {
      this.fadeOutAudioElement(this.currentAudio);
    }

    this.currentAudio = nextAudio;
    this.currentTrackUrl = chosenUrl;
    if (this.initialized) {
      this.routeElementThroughWebAudio(nextAudio);
    }
    if (startTime > 0 && nextAudio.duration && startTime < nextAudio.duration - 2) {
      try {
        nextAudio.currentTime = startTime;
      } catch (_) {}
    }

    nextAudio.volume = 0.0;
    if (nextAudio._trackGainNode && this.ctx) {
      nextAudio._trackGainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
    }
    if (!this.muted) {
      nextAudio.play().catch(() => {});
    }

    // Smooth fade-in
    const steps = 18;
    let step = 0;
    const timer = setInterval(() => {
      if (this.currentAudio !== nextAudio) {
        clearInterval(timer);
        return;
      }
      step++;
      const frac = Math.min(1, step / steps);
      const targetVol = this.getTargetMusicVolume();
      nextAudio.volume = targetVol * frac;
      if (nextAudio._trackGainNode && this.ctx) {
        nextAudio._trackGainNode.gain.setValueAtTime(frac, this.ctx.currentTime);
      }
      if (step >= steps) {
        clearInterval(timer);
      }
    }, 65);

    return true;
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
