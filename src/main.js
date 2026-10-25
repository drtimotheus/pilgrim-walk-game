// ============================================================================
// THE PILGRIM WALK — Main 3D Game Controller (All 44 Books · 1,677 Paintings)
// Implements:
//   - All 44 Books in Bible storyline order as data-driven painterly 3D streets
//   - 175 Step-Through Painting Scenes with .glb sculptures & 53 Sacred Hero Relics
//   - Story Walk (part Light-gates & Amen Gates), Free Walk, and 1,633-Day Daily Walk
//   - Unmissable Scene Exits (§5: persistent "Back to the street" button on screen,
//     lit exit doorway inside every scene, exact street position & facing restoration)
//   - Dynamic palette color grading, book-specific street biomes, & lazy-loaded districts
//   - Per-book & per-scene MP3 music, Selene voice narration with music ducking, & Mandarin toggle
// ============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PainterlyEngine } from './painterly.js?v=44_12';
import { PainterlyPostProcess, createPainterlySkyDome } from './postprocess.js?v=44_16';
import { PainterlyPropBuilder } from './props.js?v=44_67';
import { StepThroughSceneManager } from './scenes.js?v=44_67';
import { GenesisDistrictBuilder } from './district.js?v=44_67';
import { PilgrimAudio } from './audio.js?v=44_57';
import { TripoRelicManager } from './tripo.js?v=44_55';
import { DailyWalkManager } from './daily-walk.js?v=44_28';
import { formatZh } from './zh-convert.js?v=44_12';

const SAVE_KEY = 'pilgrim_walk_save_v1';

class PilgrimWalkApp {
  constructor() {
    this.canvas = document.getElementById('world-canvas');
    this.mode = 'STREET'; // 'STREET' | 'SCENE'
    this.walkMode = 'STORY'; // 'STORY' | 'FREE'
    this.lang = 'en'; // 'en' | 'zh' (Simplified CUV) | 'zh-TW' (Traditional CUV)
    this.reducedMotion = false;
    this.largeText = false;
    // Start minimized automatically on mobile/tablet screens so the artwork is unobstructed
    this.hudMinimized = window.innerWidth <= 900;

    // Saved progress in localStorage (§4 & §5d)
    this.saveData = this.loadSaveData();
    this.lang = this.saveData.lang || 'en';
    this.graphicsQuality = this.resolveInitialGraphicsQuality();

    // Pre-allocated scratch colors & cached UI state to avoid per-frame allocations and DOM churn
    this._colorTop = new THREE.Color();
    this._colorHorizon = new THREE.Color();
    this._colorGround = new THREE.Color();
    this._colorAccent = new THREE.Color();
    this._colorFog = new THREE.Color();
    this._ghTopColor = new THREE.Color('#6a8298');
    this._ghHorizonColor = new THREE.Color('#d2ab7a');
    this._ghGroundColor = new THREE.Color('#695843');
    this._ghAccentColor = new THREE.Color('#f5d79c');
    this._ghFogColor = new THREE.Color('#b69772');
    this._domCache = {};
    this._uiState = {
      promptHidden: null,
      promptText: '',
      secondaryHidden: null,
      secondaryText: '',
      lanternOpacity: '',
      lanternText: ''
    };
    this._rafId = null;
    this._isLoopRunning = false;
    this._lastFrameTime = 0;
    this._wasModalOpen = false;
    this._needsRender = true;

    // Player transform state
    this.player = {
      position: new THREE.Vector3(-2.2, 1.72, 14.0),
      yaw: 0.0,
      pitch: 0.0,
      speed: 5.4,
      bobPhase: 0.0
    };

    // Saved street return transform when stepping into a painting scene (§5c)
    this.streetReturnState = {
      position: new THREE.Vector3(-2.2, 1.72, 14.0),
      yaw: 0.0,
      pitch: 0.0
    };

    this.keys = {};
    this.touchMove = { x: 0, y: 0 };
    this.isPointerLocked = false;
    this.isDraggingLook = false;
    this.lastPointer = { x: 0, y: 0 };

    this.manifests = {};
    this.districtCache = {};
    this.gatehouseHubWorld = null;
    this.currentDistrictSlug = this.saveData.currentDistrictSlug || 'genesis';
    this.manifest = null;
    this.routeData = null;
    this.coversData = null;
    this.district = null;
    this.activeSceneObj = null;
    this.currentInteractTarget = null;
    this.openPoemPainting = null;

    this.districtMeta = {
      genesis: {
        num: 'I',
        shortName: 'Genesis',
        fullLabel: 'Genesis (In the Beginning)',
        loadingSub: 'District I: In the Beginning — Genesis in Poems & Pictures',
        nextSlug: 'exodus',
        nextLabel: 'District II: Let My People Go (Exodus)',
        amenQuote: '“God will surely visit you… take my bones with you when you go.”'
      },
      exodus: {
        num: 'II',
        shortName: 'Exodus',
        fullLabel: 'Exodus (Let My People Go)',
        loadingSub: 'District II: Let My People Go — Exodus in Poems & Pictures',
        nextSlug: 'fire-by-night',
        nextLabel: 'District III: Fire by Night (Leviticus & Numbers)',
        amenQuote: '“Yahweh’s glory filled the tabernacle… fire was in it by night, in the sight of all the house of Israel.”'
      },
      'fire-by-night': {
        num: 'III',
        shortName: 'Fire by Night',
        fullLabel: 'Fire by Night (Leviticus & Numbers)',
        loadingSub: 'District III: Fire by Night — Leviticus & Numbers in Poems & Pictures',
        nextSlug: 'choose-life',
        nextLabel: 'District IV: Choose Life (Deuteronomy)',
        amenQuote: '“When the cloud was taken up from the tabernacle, after that the children of Israel traveled.”'
      },
      'choose-life': {
        num: 'IV',
        shortName: 'Choose Life',
        fullLabel: 'Choose Life (Deuteronomy)',
        loadingSub: 'District IV: Choose Life — Deuteronomy in Poems & Pictures',
        nextSlug: 'joshua-judges',
        nextLabel: 'District V: Be Strong and Courageous (Joshua & Judges)',
        amenQuote: '“I have set before you life and death, the blessing and the curse: therefore choose life, that you may live.”'
      },
      'joshua-judges': {
        num: 'V',
        shortName: 'Joshua & Judges',
        fullLabel: 'Be Strong and Courageous (Joshua & Judges)',
        loadingSub: 'District V: Be Strong and Courageous — Joshua & Judges in Poems & Pictures',
        nextSlug: 'ruth',
        nextLabel: 'District VI: Where You Go (Ruth)',
        amenQuote: '“Not one thing has failed of all the good things which Yahweh your God spoke concerning you.”'
      },
      ruth: {
        num: 'VI',
        shortName: 'Ruth',
        fullLabel: 'Where You Go (Ruth)',
        loadingSub: 'District VI: Where You Go — Ruth in Poems & Pictures',
        nextSlug: 'samuel',
        nextLabel: 'District VII: The Lamp Had Not Gone Out (1–2 Samuel)',
        amenQuote: '“Blessed be Yahweh, who has not left you today without a near kinsman.”'
      },
      samuel: {
        num: 'VII',
        shortName: '1–2 Samuel',
        fullLabel: 'The Lamp Had Not Gone Out (1–2 Samuel)',
        loadingSub: 'District VII: The Lamp Had Not Gone Out — 1–2 Samuel in Poems & Pictures',
        nextSlug: 'kings',
        nextLabel: 'District VIII: A Still Small Voice (1 & 2 Kings)',
        amenQuote: '“For you are my lamp, Yahweh. Yahweh will light up my darkness.”'
      },
      kings: {
        num: 'VIII',
        shortName: '1 & 2 Kings',
        fullLabel: 'A Still Small Voice (1 & 2 Kings)',
        loadingSub: 'District VIII: A Still Small Voice — 1 & 2 Kings in Poems & Pictures',
        nextSlug: 'our-eyes-are-on-you',
        nextLabel: 'District IX: Our Eyes Are on You (1 & 2 Chronicles)',
        amenQuote: '“After the fire, there was a still small voice… a lamp still burning in a far country.”'
      }
    };

    const remaining36 = [
      [9, 'IX', 'our-eyes-are-on-you', '1–2 Chronicles', 'Our Eyes Are on You (1 & 2 Chronicles)', '“We don’t know what to do, but our eyes are on you.”'],
      [10, 'X', 'rise-up-and-build', 'Ezra & Nehemiah', 'Rise Up and Build (Ezra & Nehemiah)', '“Don’t be grieved, for the joy of Yahweh is your strength.”'],
      [11, 'XI', 'for-such-a-time-as-this', 'Esther', 'For Such a Time as This (Esther)', '“Who knows if you haven’t come to the kingdom for such a time as this?”'],
      [12, 'XII', 'out-of-the-whirlwind', 'Job', 'Out of the Whirlwind (Job)', '“I had heard of you by the hearing of the ear, but now my eye sees you.”'],
      [13, 'XIII', 'psalms-1', 'Psalms 1–41', 'Planted by the Water (Psalms 1–41)', '“Blessed be Yahweh, the God of Israel, from everlasting and to everlasting! Amen and amen.”'],
      [14, 'XIV', 'psalms-2', 'Psalms 42–72', 'As the Deer (Psalms 42–72)', '“He will come down like rain on the mown grass… The prayers of David the son of Jesse are ended.”'],
      [15, 'XV', 'psalms-3', 'Psalms 73–106', 'A Day in Your Courts (Psalms 73–106)', '“For a day in your courts is better than a thousand… Let all the people say, ‘Amen.’ Praise Yah!”'],
      [16, 'XVI', 'psalms-4', 'Psalms 107–150', 'Everything That Has Breath (Psalms 107–150)', '“Your word is a lamp to my feet… Let everything that has breath praise Yah! Praise Yah!”'],
      [17, 'XVII', 'the-beginning-of-wisdom', 'Proverbs', 'The Beginning of Wisdom (Proverbs)', '“Trust in Yahweh with all your heart, and don’t lean on your own understanding.”'],
      [18, 'XVIII', 'eternity-in-their-hearts', 'Ecclesiastes', 'Eternity in Their Hearts (Ecclesiastes)', '“He has made everything beautiful in its time. He has also set eternity in their hearts.”'],
      [19, 'XIX', 'many-waters', 'Song of Songs', 'Many Waters (Song of Songs)', '“Many waters can’t quench love, neither can floods drown it.”'],
      [20, 'XX', 'arise-shine', 'Isaiah', 'Arise, Shine (Isaiah)', '“Arise, shine; for your light has come, and Yahweh’s glory has risen on you.”'],
      [21, 'XXI', 'a-future-and-a-hope', 'Jeremiah', 'A Future and a Hope (Jeremiah)', '“Thoughts of peace, and not of evil, to give you hope and a future.”'],
      [22, 'XXII', 'new-every-morning', 'Lamentations', 'New Every Morning (Lamentations)', '“They are new every morning. Great is your faithfulness.”'],
      [23, 'XXIII', 'can-these-bones-live', 'Ezekiel', 'Can These Bones Live? (Ezekiel)', '“Everything will live wherever the river comes.”'],
      [24, 'XXIV', 'greatly-beloved', 'Daniel', 'Greatly Beloved (Daniel)', '“Greatly beloved man, don’t be afraid… Go your way until the end; for you will rest, and will stand in your allotted inheritance at the end of the days.”'],
      [25, 'XXV', 'a-door-of-hope', 'Hosea–Obadiah', 'A Door of Hope (Hosea, Joel, Amos & Obadiah)', '“I will give her vineyards from there, and the valley of Achor for a door of hope.”'],
      [26, 'XXVI', 'out-of-the-deep', 'Jonah', 'Out of the Deep (Jonah)', '“When my soul fainted within me, I remembered Yahweh.”'],
      [27, 'XXVII', 'the-day-of-small-things', 'Micah–Malachi', 'The Day of Small Things (Micah to Malachi)', '“Not by might, nor by power, but by my Spirit, says Yahweh of Armies.”'],
      [28, 'XXVIII', 'good-news-of-great-joy', 'Luke', 'Good News of Great Joy (Luke)', '“Weren’t our hearts burning within us, while he spoke to us along the way?”'],
      [29, 'XXIX', 'i-am-with-you-always', 'Matthew', 'I Am With You Always (Matthew)', '“Behold, I am with you always, even to the end of the age.”'],
      [30, 'XXX', 'peace-be-still', 'Mark', 'Peace, Be Still (Mark)', '“Peace! Be still! The wind ceased, and there was a great calm.”'],
      [31, 'XXXI', 'come-and-see', 'John', 'Come and See (John)', '“The light shines in the darkness, and the darkness hasn’t overcome it.”'],
      [32, 'XXXII', 'to-the-ends-of-the-earth', 'Acts', 'To the Ends of the Earth (Acts)', '“Preaching God’s Kingdom… with all boldness, without hindrance.”'],
      [33, 'XXXIII', 'nothing-can-separate', 'Romans', 'Nothing Can Separate (Romans)', '“Nothing will be able to separate us from God’s love which is in Christ Jesus our Lord.”'],
      [34, 'XXXIV', 'treasure-in-clay-jars', '1–2 Corinthians', 'Treasure in Clay Jars (1 & 2 Corinthians)', '“My grace is sufficient for you, for my power is made perfect in weakness.”'],
      [35, 'XXXV', 'rooted-and-free', 'Galatians & Ephesians', 'Rooted and Free (Galatians & Ephesians)', '“Being rooted and grounded in love… having done all, to stand.”'],
      [36, 'XXXVI', 'joy-in-chains', 'Philippians', 'Joy in Chains (Philippians)', '“And the peace of God, which surpasses all understanding, will guard your hearts.”'],
      [37, 'XXXVII', 'held-together', 'Colossians & Philemon', 'Held Together (Colossians & Philemon)', '“He is before all things, and in him all things are held together.”'],
      [38, 'XXXVIII', 'children-of-the-day', '1–2 Thessalonians', 'Children of the Day (1 & 2 Thessalonians)', '“You are all children of light and children of the day.”'],
      [39, 'XXXIX', 'grace-mercy-and-peace', '1–2 Timothy & Titus', 'Grace, Mercy, and Peace (1–2 Timothy & Titus)', '“I have fought the good fight. I have finished the course. I have kept the faith.”'],
      [40, 'XL', 'anchor-of-the-soul', 'Hebrews', 'Anchor of the Soul (Hebrews)', '“This hope we have as an anchor of the soul, a hope both sure and steadfast.”'],
      [41, 'XLI', 'doers-of-the-word', 'James', 'Doers of the Word (James)', '“Every good gift and every perfect gift is from above, coming down from the Father of lights.”'],
      [42, 'XLII', 'a-living-hope', '1–2 Peter & Jude', 'A Living Hope (1–2 Peter & Jude)', '“Until the day dawns, and the morning star arises in your hearts.”'],
      [43, 'XLIII', 'little-children', '1–3 John', 'Little Children (The Letters of John)', '“There is no fear in love; but perfect love casts out fear.”'],
      [44, 'XLIV', 'all-things-new', 'Revelation', 'All Things New (Revelation)', '“Yes, come, Lord Jesus. The grace of the Lord Jesus be with all the saints. Amen.”']
    ];

    remaining36.forEach(([idx, rom, slug, shortName, fullLabel, amenQuote], i) => {
      const nextEntry = remaining36[i + 1];
      this.districtMeta[slug] = {
        idx,
        num: rom,
        shortName,
        fullLabel,
        loadingSub: `District ${rom}: ${fullLabel} — Poems & Pictures`,
        nextSlug: nextEntry ? nextEntry[2] : 'genesis',
        nextLabel: nextEntry ? `District ${nextEntry[1]}: ${nextEntry[4]}` : '3D Gatehouse Courtyard (All 44 Books Completed!)',
        amenQuote
      };
    });

    this.audio = new PilgrimAudio();
    this.audio.setVolumes({
      master: this.saveData.masterVolume,
      music: this.saveData.musicVolume,
      voice: this.saveData.voiceVolume,
      muted: this.saveData.audioMuted
    });
    this.audio.onVolumeChange = () => {
      if (this.dailyWalk && typeof this.dailyWalk.syncVoiceVolume === 'function') {
        this.dailyWalk.syncVoiceVolume();
      }
      if (this._introAudioEl) {
        this._introAudioEl.volume = this.audio.getEffectiveVoiceVolume();
      }
    };
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.bindUIAndControls();
    this.bootstrap();
  }

  normalizeSaveData(parsed = {}) {
    const src = parsed && typeof parsed === 'object' ? parsed : {};
    const clamp01 = (v, def = 1.0) =>
      typeof v === 'number' && !Number.isNaN(v) ? Math.max(0.0, Math.min(1.0, v)) : def;
    const dw = src.dailyWalk && typeof src.dailyWalk === 'object' ? src.dailyWalk : {};
    return {
      currentDistrictSlug: typeof src.currentDistrictSlug === 'string' && src.currentDistrictSlug
        ? src.currentDistrictSlug
        : 'genesis',
      lightsKindled: Array.isArray(src.lightsKindled) ? [...new Set(src.lightsKindled)] : [],
      paintingsSeen: Array.isArray(src.paintingsSeen) ? [...new Set(src.paintingsSeen)] : [],
      scenesVisited: Array.isArray(src.scenesVisited) ? [...new Set(src.scenesVisited)] : [],
      relicsInspected: Array.isArray(src.relicsInspected) ? [...new Set(src.relicsInspected)] : [],
      districtsCompleted: Array.isArray(src.districtsCompleted) ? [...new Set(src.districtsCompleted)] : [],
      introNarrated: !!src.introNarrated,
      walkMode: ['STORY', 'FREE', 'DAILY'].includes(src.walkMode) ? src.walkMode : 'STORY',
      lang: ['en', 'zh', 'zh-TW'].includes(src.lang) ? src.lang : 'en',
      graphicsQuality: ['balanced', 'eco', 'high'].includes(src.graphicsQuality)
        ? src.graphicsQuality
        : null,
      graphicsQualityUserSet: !!src.graphicsQualityUserSet,
      reducedMotion: !!src.reducedMotion,
      largeText: !!src.largeText,
      audioMuted: typeof src.audioMuted === 'boolean' ? src.audioMuted : false,
      masterVolume: clamp01(src.masterVolume, 1.0),
      musicVolume: clamp01(src.musicVolume, 1.0),
      voiceVolume: clamp01(src.voiceVolume, 1.0),
      dailyWalk: {
        currentDay:
          typeof dw.currentDay === 'number' && !Number.isNaN(dw.currentDay)
            ? Math.max(1, Math.min(1633, Math.floor(dw.currentDay)))
            : 1,
        completedDays: Array.isArray(dw.completedDays) ? [...new Set(dw.completedDays)] : [],
        journalNotes: dw.journalNotes && typeof dw.journalNotes === 'object' ? { ...dw.journalNotes } : {},
        lastWalkedDate: typeof dw.lastWalkedDate === 'string' ? dw.lastWalkedDate : null
      }
    };
  }

  loadSaveData() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.normalizeSaveData(parsed);
      }
    } catch (e) {
      console.warn('localStorage load fallback', e);
    }
    return this.normalizeSaveData({});
  }

  persistSaveData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
    } catch (e) {
      console.warn('localStorage write fallback', e);
    }
    this.updateHUDProgress();
    this.refreshProgressCodeUI();
  }

  detectDefaultGraphicsQuality() {
    try {
      const ua = navigator.userAgent || '';
      const isMobileUA =
        Boolean(navigator.userAgentData && navigator.userAgentData.mobile) ||
        /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini|Kindle|Silk/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isCoarseSmallScreen =
        Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) &&
        window.innerWidth <= 960;
      const isLowMemoryOrCores =
        (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4) ||
        (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4);

      if (isMobileUA || isCoarseSmallScreen || isLowMemoryOrCores) {
        return 'eco';
      }

      const probeCanvas = document.createElement('canvas');
      const gl =
        probeCanvas.getContext('webgl2') ||
        probeCanvas.getContext('webgl') ||
        probeCanvas.getContext('experimental-webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const rendererStr = dbg
          ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
          : String(gl.getParameter(gl.RENDERER) || '');
        if (
          /Mali-|Adreno|PowerVR|Apple A(7|8|9|10|11|12|13|14|15)\b|Intel\(R\) (HD|UHD) Graphics|Intel HD Graphics|Vivante|VideoCore|Tegra|GMA /i.test(
            rendererStr
          )
        ) {
          return 'eco';
        }
      }
    } catch (_) {}
    return 'balanced';
  }

  resolveInitialGraphicsQuality() {
    const saved = this.saveData && this.saveData.graphicsQuality;
    const userSet = Boolean(this.saveData && this.saveData.graphicsQualityUserSet);
    if (userSet && ['balanced', 'eco', 'high'].includes(saved)) {
      return saved;
    }
    if (saved === 'eco' || saved === 'high') {
      return saved;
    }
    const detected = this.detectDefaultGraphicsQuality();
    if (this.saveData) {
      this.saveData.graphicsQuality = detected;
    }
    return detected;
  }

  getTargetPixelRatio(tier = this.graphicsQuality) {
    const dpr = window.devicePixelRatio || 1;
    if (tier === 'eco') return 1.0;
    if (tier === 'balanced') return Math.min(dpr, 1.5);
    return Math.min(dpr, 2.0);
  }

  getTargetFrameIntervalMs(tier = this.graphicsQuality) {
    if (tier === 'high') return 0; // Native display refresh rate (60+ FPS)
    return 1000 / 30; // 30 FPS max in Balanced & Eco
  }

  applyGraphicsQuality(tier = this.graphicsQuality) {
    const validTier = ['balanced', 'eco', 'high'].includes(tier) ? tier : 'balanced';
    this.graphicsQuality = validTier;
    this.saveData.graphicsQuality = validTier;

    const pr = this.getTargetPixelRatio(validTier);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.renderer) {
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h);
    }
    if (this.postProcess) {
      this.postProcess.setQuality(validTier, w, h, pr);
    }
    this._needsRender = true;
    if (this.scene && this.camera && this.postProcess && this.isAnyModalOpen() && !document.hidden) {
      this.postProcess.render(this.scene, this.camera, this.clock.getElapsedTime());
      this._needsRender = false;
    }
  }

  initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'default'
      });
    } catch (err) {
      document.getElementById('webgl-fallback').classList.remove('hidden');
      throw err;
    }

    const pr = this.getTargetPixelRatio(this.graphicsQuality);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#948067', 0.014);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 350);
    this.camera.rotation.order = 'YXZ';

    // Painterly Engine, Sky Dome, and Post-Processing
    this.painterly = new PainterlyEngine(THREE, this.renderer);
    this.tripoManager = new TripoRelicManager(THREE, this.painterly);
    this.propBuilder = new PainterlyPropBuilder(THREE, this.painterly);
    this.propBuilder.setTripoManager(this.tripoManager);
    this.sceneManager = new StepThroughSceneManager(THREE, this.painterly, this.propBuilder);
    this.districtBuilder = new GenesisDistrictBuilder(THREE, this.painterly, this.propBuilder);
    this.districtBuilder.onTextureStreamed = () => {
      this._needsRender = true;
    };
    this.postProcess = new PainterlyPostProcess(THREE, this.renderer, this.painterly, this.graphicsQuality);
    this.dailyWalk = new DailyWalkManager(this);

    this.skyDome = createPainterlySkyDome(THREE, 280);
    this.scene.add(this.skyDome);

    // Warm Golden-Hour Hemisphere & Directional Sun Light + Pilgrim's Lantern Light
    this.hemiLight = new THREE.HemisphereLight('#f2dfc2', '#8f795e', 1.65);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#ffe8bf', 1.85);
    this.dirLight.position.set(18, 36, 28);
    this.scene.add(this.dirLight);

    // The Pilgrim's Lantern (carried by the player, brightens with progress & glows when facing a hidden Light)
    this.lanternLight = new THREE.PointLight('#ffcf78', 1.4, 14);
    this.scene.add(this.lanternLight);

    window.addEventListener('resize', () => {
      const nextPr = this.getTargetPixelRatio(this.graphicsQuality);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(nextPr);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.postProcess.setSize(window.innerWidth, window.innerHeight, nextPr);
      this._needsRender = true;
      if (this.isAnyModalOpen() && !document.hidden) {
        this.postProcess.render(this.scene, this.camera, this.clock.getElapsedTime());
        this._needsRender = false;
      }
    });
  }

  async ensureManifestLoaded(slug) {
    if (this.manifests[slug]) return this.manifests[slug];
    try {
      const res = await fetch(`assets/data/${slug}-manifest.json?v=44_25`);
      if (res.ok) {
        this.manifests[slug] = await res.json();
        return this.manifests[slug];
      }
    } catch (e) {
      console.warn(`Failed to load manifest for ${slug}`, e);
    }
    return null;
  }

  async bootstrap() {
    try {
      const urlParams = new URLSearchParams(window.location.search || '');
      const urlBook = urlParams.get('book') || urlParams.get('district');
      const initialSlug =
        urlBook && this.districtMeta[urlBook]
          ? urlBook
          : this.districtMeta[this.currentDistrictSlug]
          ? this.currentDistrictSlug
          : 'genesis';
      if (urlBook && this.districtMeta[urlBook]) {
        this.currentDistrictSlug = urlBook;
      }
      // Start streaming the district's street music immediately in parallel with asset loading
      this.audio.playStreetMusic(initialSlug);
      const [, routeRes, coversRes] = await Promise.all([
        this.ensureManifestLoaded(initialSlug),
        fetch('assets/data/route.json?v=44_8'),
        fetch('assets/data/covers.json?v=44_8'),
        this.tripoManager.init()
      ]);

      this.routeData = await routeRes.json();
      this.coversData = await coversRes.json();

      this.walkMode = this.saveData.walkMode || 'STORY';
      this.reducedMotion = !!this.saveData.reducedMotion;
      this.largeText = !!this.saveData.largeText;
      this.applyAccessibilitySettings();

      await this.switchDistrict(initialSlug, true);
      await this.dailyWalk.init();
      this.initOneTimeIntroNarrator();

      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        if (loadingScreen) loadingScreen.classList.add('hidden');
      }, 650);

      this._isBootstrapped = true;
      this.startRenderLoop();
    } catch (err) {
      console.error('Bootstrap error:', err);
      const status = document.getElementById('loading-status');
      if (status) {
        status.textContent = `Loading note: ${err.message || err}. Please hard-refresh (Cmd+Shift+R).`;
      }
    }
  }

  isZh() {
    return this.lang === 'zh' || this.lang === 'zh-TW';
  }

  zh(text) {
    return formatZh(text, this.lang);
  }

  getZhBookTitle(slug) {
    const zhMap = {
      genesis: '创世记 · 起初',
      exodus: '出埃及记 · 容我的百姓去',
      'fire-by-night': '利未记与民数记 · 夜间火柱',
      'choose-life': '申命记 · 拣选生命',
      'joshua-judges': '约书亚记与士师记 · 刚强壮胆',
      ruth: '路得记 · 你往哪里去',
      samuel: '撒母耳记 · 神的灯尚未熄灭',
      kings: '列王纪 · 微小的声音',
      'our-eyes-are-on-you': '历代志 · 我们的眼目仰望你',
      'rise-up-and-build': '以斯拉与尼希米记 · 起来建造',
      'for-such-a-time-as-this': '以斯帖记 · 焉知不为现今的机会',
      'out-of-the-whirlwind': '约伯记 · 旋风中的回答',
      'psalms-1': '诗篇 1–41 · 栽在溪水旁',
      'psalms-2': '诗篇 42–72 · 如鹿切慕溪水',
      'psalms-3': '诗篇 73–106 · 在你的院宇住一日',
      'psalms-4': '诗篇 107–150 · 凡有气息的',
      'the-beginning-of-wisdom': '箴言 · 智慧的开端',
      'eternity-in-their-hearts': '传道书 · 将永恒安置在心里',
      'many-waters': '雅歌 · 众水不能熄灭',
      'arise-shine': '以赛亚书 · 兴起发光',
      'a-future-and-a-hope': '耶利米书 · 有指望的未来',
      'new-every-morning': '耶利米哀歌 · 每早晨都是新的',
      'can-these-bones-live': '以西结书 · 这些骸骨能复活吗',
      'greatly-beloved': '但以理书 · 大蒙眷爱的人',
      'a-door-of-hope': '何西阿至俄巴底亚 · 指望之门',
      'out-of-the-deep': '约拿书 · 从深处求告',
      'the-day-of-small-things': '弥迦至玛拉基 · 小事之日',
      'good-news-of-great-joy': '路加福音 · 大喜的好信息',
      'i-am-with-you-always': '马太福音 · 我常与你们同在',
      'peace-be-still': '马可福音 · 住了吧！静了吧！',
      'come-and-see': '约翰福音 · 你们来看',
      'to-the-ends-of-the-earth': '使徒行传 · 直到地极',
      'nothing-can-separate': '罗马书 · 绝不能隔绝',
      'treasure-in-clay-jars': '哥林多前后书 · 瓦器里的宝贝',
      'rooted-and-free': '加拉太与以弗所书 · 扎根与自由',
      'joy-in-chains': '腓立比书 · 锁链中的喜乐',
      'held-together': '歌罗西与腓利门书 · 万有靠他而立',
      'children-of-the-day': '帖撒罗尼迦前后书 · 光明之子',
      'grace-mercy-and-peace': '提摩太与提多书 · 恩惠怜悯平安',
      'anchor-of-the-soul': '希伯来书 · 灵魂的锚',
      'doers-of-the-word': '雅各书 · 行道的人',
      'a-living-hope': '彼得与犹大书 · 活泼的盼望',
      'little-children': '约翰书信 · 小子们哪',
      'all-things-new': '启示录 · 我将一切都更新了'
    };
    return this.zh(zhMap[slug] || slug);
  }

  isDistrictUnlocked(slug) {
    if (!slug) return false;
    if (this.walkMode === 'FREE' || this.walkMode === 'DAILY') return true;
    if (slug === 'genesis') return true;
    if (this.saveData.districtsCompleted.includes(slug)) return true;
    if (this.saveData.currentDistrictSlug === slug) return true;
    if (this.saveData.lightsKindled.some((id) => typeof id === 'string' && id.startsWith(`${slug}-`))) {
      return true;
    }
    if (this.saveData.paintingsSeen.some((id) => typeof id === 'string' && id.startsWith(`${slug}-`))) {
      return true;
    }
    const allSlugs = Object.keys(this.districtMeta);
    const idx = allSlugs.indexOf(slug);
    if (idx > 0) {
      const prevSlug = allSlugs[idx - 1];
      if (this.saveData.districtsCompleted.includes(prevSlug)) return true;
      const prevPartsCount = this.manifests[prevSlug]?.parts?.length || 4;
      const prevKindledCount = this.saveData.lightsKindled.filter(
        (id) => typeof id === 'string' && id.startsWith(`${prevSlug}-`)
      ).length;
      if (prevKindledCount >= prevPartsCount) return true;
    }
    return false;
  }

  getFirstBlockingVeil() {
    if (this.walkMode !== 'STORY' || !this.district || !this.district.partGatesAndLights) {
      return null;
    }
    if (this.saveData.districtsCompleted.includes(this.currentDistrictSlug)) {
      return null;
    }
    for (const lObj of this.district.partGatesAndLights) {
      if (!lObj.kindled) {
        return lObj;
      }
    }
    return null;
  }

  syncPartVeilsWithMode() {
    if (!this.district || !this.district.partGatesAndLights) return;
    const isCompletedDistrict = this.saveData.districtsCompleted.includes(this.currentDistrictSlug);
    const isStory = this.walkMode === 'STORY';
    this.district.partGatesAndLights.forEach((lObj) => {
      const isKindled = this.saveData.lightsKindled.includes(lObj.id);
      lObj.kindled = isKindled;
      if (isKindled) {
        lObj.haloSprite.scale.set(3.6, 3.6, 1);
        lObj.pointLight.intensity = 3.4;
      } else {
        lObj.haloSprite.scale.set(3.2, 3.2, 1);
        lObj.pointLight.intensity = 2.6;
      }
      if (lObj.veilGroup) {
        lObj.veilGroup.visible = isStory && !isCompletedDistrict && !isKindled;
      }
    });
    this._needsRender = true;
  }

  updateActivePillHighlight() {
    const isGH = this.mode === 'GATEHOUSE';
    const zh = this.isZh();
    const elGH = document.getElementById('btn-walk-gatehouse');
    if (elGH) {
      elGH.classList.toggle('active-pill', isGH);
      elGH.textContent = zh ? this.zh('⛩ 3D 城门庭院 (44 卷书门)') : '⛩ 3D Gatehouse (44 Gates)';
    }

    const sel = document.getElementById('hud-district-select');
    if (sel) {
      sel.classList.toggle('active-pill', !isGH);
      Array.from(sel.options).forEach((opt, i) => {
        const slug = opt.value;
        const m = this.districtMeta[slug];
        if (m) {
          const unlocked = this.isDistrictUnlocked(slug);
          const lockPrefix = unlocked ? '' : '🔒 ';
          opt.textContent = zh
            ? `${lockPrefix}${m.num} · #${i + 1} ${this.getZhBookTitle(slug)}`
            : `${lockPrefix}${m.num} · #${i + 1} ${m.fullLabel}`;
        }
      });
      if (!isGH) sel.value = this.currentDistrictSlug;
    }

    const ribbon = document.getElementById('all-44-ribbon');
    if (ribbon) {
      if (ribbon.children.length === 0) {
        Object.entries(this.districtMeta).forEach(([slug, m], i) => {
          const btn = document.createElement('button');
          btn.className = 'hud-pill';
          btn.dataset.districtPill = slug;
          btn.textContent = `${m.num} · #${i + 1} ${m.shortName}`;
          btn.addEventListener('click', () => this.switchDistrict(slug));
          ribbon.appendChild(btn);
        });
      }
      ribbon.querySelectorAll('[data-district-pill]').forEach((btn, idx) => {
        const slug = btn.dataset.districtPill;
        const m = this.districtMeta[slug];
        const unlocked = this.isDistrictUnlocked(slug);
        const lockPrefix = unlocked ? '' : '🔒 ';
        if (m) {
          btn.textContent = zh
            ? `${lockPrefix}${m.num} · #${idx + 1} ${this.getZhBookTitle(slug).split(' · ')[0]}`
            : `${lockPrefix}${m.num} · #${idx + 1} ${m.shortName}`;
        }
        btn.style.opacity = unlocked ? '1' : '0.62';
        const active = !isGH && slug === this.currentDistrictSlug;
        btn.classList.toggle('active-pill', active);
        if (active) {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    }
  }

  getRouteSlugMap() {
    const map = {
      genesis: 'genesis',
      'let-my-people-go': 'exodus',
      'fire-by-night': 'fire-by-night',
      'choose-life': 'choose-life',
      'be-strong-and-courageous': 'joshua-judges',
      'where-you-go': 'ruth',
      'the-lamp-had-not-gone-out': 'samuel',
      'a-still-small-voice': 'kings'
    };
    if (this.routeData) {
      this.routeData.forEach((d) => {
        if (!map[d.slug]) map[d.slug] = d.slug;
      });
    }
    return map;
  }

  async enterGatehouse3DHub() {
    this.closeAllModals();
    if (this.mode === 'SCENE') {
      this.exitStepThroughSceneToStreet();
    }
    if (this.district && this.district.streetGroup) {
      this.district.streetGroup.visible = false;
    }

    if (this.gatehouseHubWorld && this.gatehouseHubWorld.group) {
      this.scene.remove(this.gatehouseHubWorld.group);
    }

    const playableRouteSlugs = this.getRouteSlugMap();

    this.gatehouseHubWorld = await this.districtBuilder.buildGatehouseHubWorld(
      this.routeData,
      this.coversData,
      this.saveData,
      playableRouteSlugs,
      (slug) => this.isDistrictUnlocked(slug)
    );
    this.scene.add(this.gatehouseHubWorld.group);
    this.mode = 'GATEHOUSE';

    this.player.position.set(0.0, 1.72, 10.0);
    this.player.yaw = 0.0;
    this.player.pitch = 0.0;

    document.getElementById('back-to-street-btn').classList.add('hidden');
    document.getElementById('scene-active-banner').classList.add('hidden');

    this.updateActivePillHighlight();
    this.renderQuickSceneStrip();
    this.updateHUDProgress();
    this.showToast('Entered the 3D Gatehouse Courtyard — Walk among all 44 Book Gates in storyline order.');
  }

  async switchDistrict(slug, isInitialBoot = false) {
    if (!isInitialBoot && this.walkMode === 'STORY' && !this.isDistrictUnlocked(slug)) {
      const lockedMeta = this.districtMeta[slug] || { fullLabel: slug };
      const sel = document.getElementById('hud-district-select');
      if (sel && this.mode !== 'GATEHOUSE') sel.value = this.currentDistrictSlug;
      this.showToast(
        this.isZh()
          ? this.zh(`✦ 书卷同行模式：请先点亮上一卷书的明灯并步入阿们之门以解锁《${this.getZhBookTitle(slug)}》（或切换为自由漫步模式）。`)
          : `✦ Locked in Story Walk — kindle the previous book’s Lights and pass through its Amen Gate to unlock ${lockedMeta.fullLabel} (or switch to Free Walk).`
      );
      return false;
    }

    // Begin streaming the new district's street music immediately (before waiting on 40 painting textures)
    this.audio.playStreetMusic(slug);
    await this.ensureManifestLoaded(slug);
    if (!this.manifests[slug]) return false;
    this.closeAllModals();
    if (this.mode === 'SCENE') {
      this.exitStepThroughSceneToStreet();
    }
    if (this.gatehouseHubWorld && this.gatehouseHubWorld.group) {
      this.gatehouseHubWorld.group.visible = false;
    }

    const loadScreen = document.getElementById('loading-screen');
    const loadBar = document.getElementById('loading-bar-fill');
    const loadStatus = document.getElementById('loading-status');
    const loadSub = document.querySelector('#loading-screen .loading-sub');

    if (!isInitialBoot && !this.districtCache[slug] && loadScreen) {
      loadScreen.classList.remove('hidden', 'fade-out');
    }

    if (this.district && this.district.streetGroup) {
      this.scene.remove(this.district.streetGroup);
    }

    this.mode = 'STREET';
    this.currentDistrictSlug = slug;
    this.saveData.currentDistrictSlug = slug;
    this.manifest = this.manifests[slug];
    this._amenTriggeredOnWalk = false;
    const meta = this.districtMeta[slug] || this.districtMeta.genesis;

    if (loadSub) {
      loadSub.textContent = meta.loadingSub;
    }

    if (!this.districtCache[slug]) {
      const [builtDistrict] = await Promise.all([
        this.districtBuilder.buildDistrict(this.manifest, (loaded, total) => {
          const pct = Math.round((loaded / total) * 100);
          if (loadBar) loadBar.style.width = `${pct}%`;
          if (loadStatus) {
            loadStatus.textContent = `Dressing ${meta.fullLabel} Street from Timothy Holt’s paintings (${loaded}/${total})…`;
          }
        }),
        this.tripoManager.preloadDistrictModels(slug, this.manifest)
      ]);
      this.districtCache[slug] = builtDistrict;
    } else {
      await this.tripoManager.preloadDistrictModels(slug, this.manifest);
    }

    this.district = this.districtCache[slug];
    this.district.streetGroup.visible = true;
    this.scene.add(this.district.streetGroup);
    this._lastPaletteNode = null;
    if (this.skyDome && this.skyDome.material && this.skyDome.material.uniforms) {
      const bCfg = this.district.biomeCfg || this.districtBuilder.getDistrictBiomeConfig(slug);
      this.skyDome.material.uniforms.uStarIntensity.value = bCfg.starIntensity || 0.0;
      this.skyDome.material.uniforms.uRainbowIntensity.value = 0.0;
      this.skyDome.material.uniforms.uTopColor.value.set(bCfg.skyTop || '#4a6b82');
      this.skyDome.material.uniforms.uHorizonColor.value.set(bCfg.skyHorizon || '#f2d399');
      this.skyDome.material.uniforms.uGroundColor.value.set(bCfg.groundColor || '#686050');
      this.skyDome.material.uniforms.uAccentColor.value.set(bCfg.groundAccent || '#d9b08b');
      if (this.scene && this.scene.fog) {
        this.scene.fog.color.set(bCfg.fogColor || '#948067');
      }
    }

    // Restore any kindled Sanctuary Lights and sync Part Veils with active Walk Mode (Story Walk vs Free Walk)
    this.district.partGatesAndLights.forEach((lObj) => {
      if (this.saveData.lightsKindled.includes(lObj.id)) {
        this.markLightKindled(lObj, true);
      } else {
        lObj.kindled = false;
        lObj.haloSprite.scale.set(3.2, 3.2, 1);
        lObj.pointLight.intensity = 2.6;
        if (lObj.veilGroup) {
          lObj.veilGroup.visible = true;
        }
      }
    });
    this.syncPartVeilsWithMode();

    // Land at the Gatehouse courtyard start of the district
    const startPt = this.districtBuilder.getPathPoint(12.0);
    this.player.position.set(startPt.x, startPt.y + 1.72, startPt.z);
    this.player.yaw = 0.0;
    this.player.pitch = 0.0;

    this.updateActivePillHighlight();
    this.renderQuickSceneStrip();
    this.populateModals();
    this.persistSaveData();
    if (this.dailyWalk) this.dailyWalk.updateHUDCandlePill();
    this.audio.playStreetMusic(slug);

    if (!isInitialBoot && loadScreen) {
      loadScreen.classList.add('fade-out');
      setTimeout(() => loadScreen.classList.add('hidden'), 500);
      if (window.innerWidth <= 900 && !this.hudMinimized) {
        this.hudMinimized = true;
        this.applyAccessibilitySettings();
      }
      this.showToast(`Entered District ${meta.num} · ${meta.fullLabel}`);
    }
  }

  renderQuickSceneStrip() {
    const strip = document.getElementById('prototype-scene-strip');
    if (!strip) return;

    const zh = this.isZh();
    if (this.mode === 'GATEHOUSE') {
      strip.innerHTML = `
        <span class="strip-label">${zh ? this.zh('3D 城门庭院（全部 44 卷书）：') : '3D Gatehouse Courtyard (44 Books):'}</span>
        <button class="scene-jump-btn" data-gh-jump="-2" data-gh-yaw="0.45">${zh ? this.zh('摩西五经与历史书 (#1–#11)') : 'Torah &amp; History (#1–#11)'}</button>
        <button class="scene-jump-btn" data-gh-jump="-55" data-gh-yaw="0.45">${zh ? this.zh('诗歌智慧书与大先知书 (#12–#22)') : 'Wisdom &amp; Major Prophets (#12–#22)'}</button>
        <button class="scene-jump-btn" data-gh-jump="-2" data-gh-yaw="-0.45">${zh ? this.zh('小先知书与四福音书 (#23–#33)') : 'Minor Prophets &amp; Gospels (#23–#33)'}</button>
        <button class="scene-jump-btn" data-gh-jump="-58" data-gh-yaw="-0.45">${zh ? this.zh('使徒书信与启示录 (#34–#44)') : 'Epistles &amp; Revelation (#34–#44)'}</button>
      `;
      strip.querySelectorAll('[data-gh-jump]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const z = parseFloat(btn.getAttribute('data-gh-jump'));
          const yaw = parseFloat(btn.getAttribute('data-gh-yaw') || '0');
          this.player.position.set(0, 1.72, z);
          this.player.yaw = yaw;
        });
      });
      return;
    }

    if (!this.manifest) return;

    const sceneMap = {
      genesis: [
        { n: 1, label: '1 · “let there be” (Light on the Deep)' },
        { n: 4, label: '4 · “the seventh day” (Stone Bench & Tree)' },
        { n: 11, label: '11 · “the bow in the cloud” (Stone Altar & Rainbow)' },
        { n: 12, label: '12 · “a name for ourselves” (Tower of Babel)' }
      ],
      exodus: [
        { n: 5, label: '5 · “turn aside” (Burning Bush)' },
        { n: 14, label: '14 · “when I see” (Passover Doorway)' },
        { n: 20, label: '20 · “a road through” (Parted Red Sea)' },
        { n: 40, label: '40 · “moving in” (Tabernacle & Pillar)' }
      ],
      'fire-by-night': [
        { n: 5, label: '5 · “kept burning” (Altar of Perpetual Fire)' },
        { n: 21, label: '21 · “keep You” (Golden Lampstand)' },
        { n: 32, label: '32 · “speak to the rock” (Water from the Crag)' },
        { n: 33, label: '33 · “look and live” (Bronze Serpent)' }
      ],
      'choose-life': [
        { n: 10, label: '10 · “by the way” (Doorpost & Mezuzah)' },
        { n: 25, label: '25 · “the forgotten sheaf” (Harvest Field)' },
        { n: 30, label: '30 · “choose life” (Fork of Two Gates)' },
        { n: 35, label: '35 · “from Pisgah’s top” (Mount Nebo)' }
      ],
      'joshua-judges': [
        { n: 3, label: '3 · “the scarlet line” (Rahab’s Window)' },
        { n: 6, label: '6 · “what these stones mean” (12 Jordan Stones)' },
        { n: 10, label: '10 · “the wall fell down flat” (Shofar & Stones)' },
        { n: 33, label: '33 · “torches in jars” (Gideon’s Pitcher)' }
      ],
      ruth: [
        { n: 4, label: '4 · “where you go” (Bethlehem Road)' },
        { n: 8, label: '8 · “the edges” (Gleaning Barley)' },
        { n: 15, label: '15 · “the corner of the cloak” (Threshing Floor)' },
        { n: 20, label: '20 · “the sandal” (Bethlehem Gate & Sandal)' }
      ],
      samuel: [
        { n: 6, label: '6 · “speak” (Tabernacle Lamp & Mat)' },
        { n: 15, label: '15 · “the youngest” (Anointing Horn)' },
        { n: 18, label: '18 · “five smooth stones” (Brook of Elah)' },
        { n: 30, label: '30 · “at the king’s table” (Mephibosheth’s Place)' }
      ],
      kings: [
        { n: 6, label: '6 · “the cloud” (Cedar Temple & Cloud)' },
        { n: 18, label: '18 · “fire on Carmel” (12-Stone Altar)' },
        { n: 21, label: '21 · “a still small voice” (Horeb Cave)' },
        { n: 32, label: '32 · “more with us” (Chariots of Fire)' }
      ],
      'psalms-1': [
        { n: 1, label: '1 · “planted” (Tree by the Streams)' },
        { n: 8, label: '8 · “the work of your fingers” (Shepherd Under Stars)' },
        { n: 22, label: '22 · “through the valley” (Rod, Staff & Table)' },
        { n: 26, label: '26 · “one thing” (Open Threshold of the Lord’s House)' }
      ],
      'psalms-2': [
        { n: 1, label: '1 · “preach to yourself” (Deer by the Water Brook)' },
        { n: 5, label: '5 · “be still” (Broken Bow & Still Waters)' },
        { n: 15, label: '15 · “your bottle” (Tear-Bottle at the Window)' },
        { n: 20, label: '20 · “higher than I” (The High Rock & Winding Trail)' }
      ],
      'psalms-3': [
        { n: 1, label: '1 · “until I walked in” (Sanctuary Portal & Menorah)' },
        { n: 12, label: '12 · “the sparrow’s nest” (Sparrow’s Nest by the Altar)' },
        { n: 19, label: '19 · “under his feathers” (Shadow of His Wings)' },
        { n: 31, label: '31 · “east from west” (Sunlit Terrace & Horizon)' }
      ],
      'psalms-4': [
        { n: 1, label: '1 · “say so” (Desired Haven Ship & Terrace)' },
        { n: 13, label: '13 · “come find me” (Lamp to My Feet & Lost Sheep)' },
        { n: 20, label: '20 · “sow in tears” (Golden Harvest Sheaves)' },
        { n: 44, label: '44 · “if you’re breathing” (Symphony of Praise)' }
      ],
      'greatly-beloved': [
        { n: 4, label: '4 · “ten days” (Table of Pulse & Water)' },
        { n: 14, label: '14 · “a fourth in the fire” (The Fiery Furnace)' },
        { n: 24, label: '24 · “windows open toward Jerusalem” (Open Window & Prayer Mat)' },
        { n: 26, label: '26 · “the lions’ den” (Peaceful Lions & Light Shaft)' }
      ],
      'arise-shine': [
        { n: 3, label: '3 · “undone” (Seraph’s Live Coal & Altar)' },
        { n: 9, label: '9 · “the wolf and the lamb” (Peaceable Kingdom Meadow)' },
        { n: 19, label: '19 · “wings like eagles” (High Crag & Rising Eagle)' },
        { n: 35, label: '35 · “arise, shine” (Open Gates of Dawn)' }
      ],
      'good-news-of-great-joy': [
        { n: 5, label: '5 · “no room” (Bethlehem Manger & Lantern)' },
        { n: 19, label: '19 · “two denarii” (Good Samaritan’s Inn)' },
        { n: 27, label: '27 · “a long way off” (Prodigal’s Road Home)' },
        { n: 40, label: '40 · “he broke the bread” (Emmaus Supper Table)' }
      ],
      'i-am-with-you-always': [
        { n: 4, label: '4 · “the star” (Bethlehem Star & Three Gifts)' },
        { n: 13, label: '13 · “a lamp on a stand” (Hillside Lampstand)' },
        { n: 26, label: '26 · “little faith” (Walking on the Sea)' },
        { n: 39, label: '39 · “he is not here” (Empty Garden Tomb)' }
      ],
      'peace-be-still': [
        { n: 11, label: '11 · “the cushion” (Galilee Boat in the Storm)' },
        { n: 18, label: '18 · “twelve baskets” (Green Grass & 12 Baskets)' },
        { n: 27, label: '27 · “he threw off his cloak” (Bartimaeus’s Cloak)' },
        { n: 30, label: '30 · “she broke the jar” (Broken Alabaster Jar)' }
      ],
      'come-and-see': [
        { n: 6, label: '6 · “the best for last” (Six Stone Jars at Cana)' },
        { n: 9, label: '9 · “the jar left behind” (Jacob’s Well at Noon)' },
        { n: 25, label: '25 · “twelve pairs” (Upper Room Basin & Towel)' },
        { n: 39, label: '39 · “a charcoal fire” (Galilee Beach Breakfast)' }
      ],
      'all-things-new': [
        { n: 4, label: '4 · “among the lampstands” (7 Golden Lampstands)' },
        { n: 8, label: '8 · “knocking” (Door & Supper Table)' },
        { n: 13, label: '13 · “the Lion is a Lamb” (Lamb & Emerald Throne)' },
        { n: 38, label: '38 · “leaves for healing” (Tree of Life & Bench)' }
      ],
      'out-of-the-whirlwind': [
        { n: 6, label: '6 · “the ash heap” (Ash-Heap & Potsherd)' },
        { n: 16, label: '16 · “at the scent of water” (Cut Stump & Tender Shoot)' },
        { n: 19, label: '19 · “with an iron pen” (Redeemer Rock Inscription)' },
        { n: 32, label: '32 · “out of the whirlwind” (Whirlwind & Morning Stars)' }
      ],
      'a-future-and-a-hope': [
        { n: 3, label: '3 · “an almond branch” (Blossoming Almond Branch)' },
        { n: 16, label: '16 · “the potter’s house” (Potter’s Wheel & Clay)' },
        { n: 24, label: '24 · “build houses, plant gardens” (Exile Letter & Figs)' },
        { n: 30, label: '30 · “the deed in the jar” (Anathoth Deed Jars)' }
      ],
      'can-these-bones-live': [
        { n: 3, label: '3 · “the bow in the cloud” (Chebar Wheels & Sapphire Throne)' },
        { n: 30, label: '30 · “a heart of flesh” (Clean Water & Heart of Flesh)' },
        { n: 32, label: '32 · “can these bones live” (Valley of Dry Bones)' },
        { n: 38, label: '38 · “wherever the river goes” (Temple River & Healing Trees)' }
      ],
      'out-of-the-deep': [
        { n: 3, label: '3 · “fast asleep in the hold” (Tarshish Ship in the Storm)' },
        { n: 8, label: '8 · “the roots of the mountains” (Great Fish & Sea Depths)' },
        { n: 16, label: '16 · “sackcloth and ashes” (Nineveh’s Empty Throne)' },
        { n: 22, label: '22 · “the little vine” (East Hill Booth & Vine)' }
      ],
      'to-the-ends-of-the-earth': [
        { n: 5, label: '5 · “tongues like fire” (Pentecost Upper Room)' },
        { n: 9, label: '9 · “silver and gold have I none” (Gate Called Beautiful)' },
        { n: 29, label: '29 · “at midnight” (Philippi Prison & Sprung Shackles)' },
        { n: 37, label: '37 · “not one of you will be lost” (Malta Ship & 4 Anchors)' }
      ],
      'anchor-of-the-soul': [
        { n: 16, label: '16 · “boldly” (Throne of Grace)' },
        { n: 19, label: '19 · “the anchor” (Anchor of the Soul)' },
        { n: 23, label: '23 · “through the curtain” (Parted Veil & Living Way)' },
        { n: 33, label: '33 · “so great a cloud” (Cloud of Witnesses Arena)' }
      ],
      'our-eyes-are-on-you': [
        { n: 4, label: '4 · “keepers of the thresholds” (Temple Threshold Gates)' },
        { n: 8, label: '8 · “a loaf and a raisin cake” (Ark Tent & Feast)' },
        { n: 18, label: '18 · “one sound” (120 Silver Trumpets & Cloud)' },
        { n: 24, label: '24 · “our eyes are on you” (Jehoshaphat’s Courtyard)' }
      ],
      'rise-up-and-build': [
        { n: 4, label: '4 · “on its base” (Rebuilt Altar on Its Base)' },
        { n: 23, label: '23 · “the night ride” (Moonlit Wall Inspection)' },
        { n: 29, label: '29 · “one hand” (Trowel, Sword & Shofar Wall)' },
        { n: 34, label: '34 · “all the people stood” (Water Gate Scroll Platform)' }
      ],
      'for-such-a-time-as-this': [
        { n: 4, label: '4 · “every day by the court” (Susa Mosaic Courtyard)' },
        { n: 16, label: '16 · “if I perish” (Three-Day Fast & Unlit Lamp)' },
        { n: 18, label: '18 · “the golden scepter” (Extended Golden Scepter)' },
        { n: 21, label: '21 · “the sleepless king” (Book of Chronicles by Night)' }
      ],
      'the-beginning-of-wisdom': [
        { n: 6, label: '6 · “the wellspring” (Guarded Wellspring of Life)' },
        { n: 14, label: '14 · “apples of gold” (Apples of Gold in Silver Filigree)' },
        { n: 25, label: '25 · “iron” (Iron Sharpens Iron Forge)' },
        { n: 38, label: '38 · “before dawn” (Spindle, Loom & Lamp Before Dawn)' }
      ],
      'eternity-in-their-hearts': [
        { n: 4, label: '4 · “the wind and the sea” (Rivers Flowing to the Sea)' },
        { n: 13, label: '13 · “eternity in their hearts” (Sundial of Seasons)' },
        { n: 16, label: '16 · “a threefold cord” (Threefold Braided Golden Cord)' },
        { n: 34, label: '34 · “the almond tree” (Blossoming Almond & Silver Cord)' }
      ],
      'many-waters': [
        { n: 5, label: '5 · “the banner” (Banqueting House & Banner of Love)' },
        { n: 7, label: '7 · “the winter is past” (Lattice Window, Fig & Vine)' },
        { n: 14, label: '14 · “the enclosed garden” (Walled Garden & Living Fountain)' },
        { n: 29, label: '29 · “the seal” (Signet Seal & Unquenchable Flame)' }
      ],
      'new-every-morning': [
        { n: 1, label: '1 · “how” (Solitary City Well & Lantern)' },
        { n: 10, label: '10 · “pour out your heart” (Overturned Night-Watch Jar)' },
        { n: 14, label: '14 · “new every morning” (Morning Light Over Dew-Wet Stones)' },
        { n: 30, label: '30 · “renew our days” (Restored Lyre by the Dawn Wall)' }
      ],
      'a-door-of-hope': [
        { n: 6, label: '6 · “a door of hope” (Valley of Achor Door & Vine)' },
        { n: 16, label: '16 · “like the dew” (Dew-Covered Lily & Olive Tree)' },
        { n: 23, label: '23 · “the years the locust ate” (Restored Harvest Basket)' },
        { n: 33, label: '33 · “the plumb line” (Amos’s Plumb Line & Stone Wall)' }
      ],
      'the-day-of-small-things': [
        { n: 3, label: '3 · “under the fig tree” (Stool, Pitcher & Fig Tree)' },
        { n: 12, label: '12 · “the watchtower” (Watchman’s Rampart & Tablets)' },
        { n: 28, label: '28 · “seven lamps” (Golden Lampstand & Olive Trees)' },
        { n: 38, label: '38 · “a book of memory” (Scroll of Remembrance & Cups)' }
      ],
      'nothing-can-separate': [
        { n: 9, label: '9 · “where we stand” (Open Door of Grace & Courtyard)' },
        { n: 19, label: '19 · “Abba” (Child’s & Father’s Sandals on the Threshold)' },
        { n: 25, label: '25 · “nothing” (Starlit Parapet Table & Scroll)' },
        { n: 30, label: '30 · “the olive tree” (Wild Olive Grafted Into the Root)' }
      ],
      'treasure-in-clay-jars': [
        { n: 15, label: '15 · “wait for one another” (Low Table, Loaf & Cup)' },
        { n: 18, label: '18 · “dimly” (Polished Bronze Mirror on Linen)' },
        { n: 29, label: '29 · “clay jars” (Cracked Clay Jar Shining with Light)' },
        { n: 40, label: '40 · “when I am weak” (Open Jar in Window Sunlight)' }
      ],
      'rooted-and-free': [
        { n: 17, label: '17 · “the fruit” (Harvest Bowl of Figs, Grapes & Pomegranate)' },
        { n: 27, label: '27 · “the wall” (Broken Dividing Wall & Homeward Path)' },
        { n: 30, label: '30 · “rooted” (Deep-Rooted Olive Tree on the Ridge)' },
        { n: 39, label: '39 · “the armor on the table” (Whole Armor of God on Timber Table)' }
      ],
      'joy-in-chains': [
        { n: 4, label: '4 · “the palace guard” (Praetorian Helmet, Cloak & Scroll)' },
        { n: 8, label: '8 · “the way down” (Servant’s Water Basin & Folded Towel)' },
        { n: 17, label: '17 · “one thing” (Stadium Track & Finish-Line Wreath)' },
        { n: 21, label: '21 · “the sentry” (Night Sentry Gate & Watch-Lantern)' }
      ],
      'held-together': [
        { n: 6, label: '6 · “held together” (Keystone Arch Over River & Bridge)' },
        { n: 12, label: '12 · “wiped clean” (Wiped-Clean Wax Tablet & Bronze Stylus)' },
        { n: 19, label: '19 · “dwell richly” (Courtyard Lyre, Scroll & Benches)' },
        { n: 32, label: '32 · “the guest room” (Prepared Guest Room & Lit Lamp)' }
      ],
      'children-of-the-day': [
        { n: 8, label: '8 · “like a nursing mother” (Clay Lamp & Swaddling Cloths)' },
        { n: 10, label: '10 · “night and day” (Tentmaker’s Workbench & Needle)' },
        { n: 21, label: '21 · “a thief in the night” (Dawn Windowsill Lamp & Scroll)' },
        { n: 34, label: '34 · “your own bread” (Quiet Work-Table, Loaf & Gloves)' }
      ],
      'grace-mercy-and-peace': [
        { n: 7, label: '7 · “a pillar” (Courtyard Pillar of Truth & Loaf Table)' },
        { n: 18, label: '18 · “Lois and Eunice” (Family Table Lamp & Scroll)' },
        { n: 28, label: '28 · “fought, finished, kept” (Stadium Finish Stone & Laurel Crown)' },
        { n: 29, label: '29 · “the cloak and the parchments” (Troas Cloak & Rolled Parchments)' }
      ],
      'doers-of-the-word': [
        { n: 5, label: '5 · “the mirror” (Bronze Mirror, Water Basin & Open Door)' },
        { n: 14, label: '14 · “small things steer” (Harbor Boat Stern & Timber Rudder)' },
        { n: 17, label: '17 · “the spring” (Fresh Limestone Spring & Fig Bough)' },
        { n: 26, label: '26 · “the farmer” (Sprouting Barley Furrows & Farmer’s Staff)' }
      ]
    };

    const dynamicScenes = (this.manifest.paintings || [])
      .filter((p) => p.isScene)
      .map((p) => ({
        n: p.n,
        label: zh
          ? this.zh(`${p.n} · 《${p.zh_title || p.title}》（${p.zh_ref || p.ref}）`)
          : `${p.n} · “${p.title}” (${p.ref})`
      }));

    const scenes = zh ? dynamicScenes : (sceneMap[this.currentDistrictSlug] || dynamicScenes || sceneMap.genesis);
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    const lastN = this.manifest.paintings.length;
    const stripTitle = zh
      ? this.zh(`${this.getZhBookTitle(this.currentDistrictSlug).split(' · ')[0]} 3D 画境：`)
      : `${meta.shortName} Scenes:`;
    const primaryRelic = this.tripoManager?.getDistrictPrimaryRelicInfo(this.currentDistrictSlug);
    const relicPillHtml = primaryRelic
      ? `<button class="scene-jump-btn" data-jump-relic="${primaryRelic.id}" title="${
          zh ? this.zh('前往本卷圣物纪念碑') : 'Stand before this district’s Hero Relic'
        }">🗿 ${
          zh
            ? this.zh(`圣物 · #${primaryRelic.slot || ''} ${primaryRelic.title}`)
            : `Relic · ${primaryRelic.title}`
        }</button>`
      : '';

    strip.innerHTML = `
      <span class="strip-label">${stripTitle}</span>
      ${scenes
        .map(
          (s) =>
            `<button class="scene-jump-btn" data-jump-scene="${s.n}" data-jump-mode="enter">${s.label}</button>`
        )
        .join('')}
      ${relicPillHtml}
      <button class="scene-jump-btn" data-jump-scene="1" data-jump-mode="street">${zh ? this.zh('街道起点') : 'Walk Street Start'}</button>
      <button class="scene-jump-btn" data-jump-scene="${lastN}" data-jump-mode="street">${zh ? this.zh('阿们终章广场') : 'Finale Plaza'}</button>
    `;

    strip.querySelectorAll('[data-jump-scene]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.getAttribute('data-jump-scene'), 10);
        const mode = btn.getAttribute('data-jump-mode');
        this.jumpToPaintingOnStreet(num, mode === 'enter');
      });
    });

    strip.querySelectorAll('[data-jump-relic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const relicId = btn.getAttribute('data-jump-relic');
        this.jumpToHeroRelicOnStreet(relicId);
      });
    });
  }

  // ==========================================================================
  // STEP-THROUGH SCENE ENTRY & UNMISSABLE EXIT (§5 & §6)
  // ==========================================================================
  async enterStepThroughScene(paintingNode) {
    if (!paintingNode || !paintingNode.data.isScene) return;
    this.closePoemModal();

    if (!paintingNode.textureLoaded && this.districtBuilder) {
      await this.districtBuilder.ensureNodeTextureLoaded(paintingNode);
    }

    // Save exact street position and facing before entering (§5c)
    if (this.mode === 'STREET') {
      this.streetReturnState.position.copy(this.player.position);
      this.streetReturnState.yaw = this.player.yaw;
      this.streetReturnState.pitch = this.player.pitch;
    }

    // Remove previous active scene if jumping directly between scenes
    if (this.activeSceneObj) {
      this.scene.remove(this.activeSceneObj.group);
      this.activeSceneObj = null;
    }

    // Hide the street group and build the step-through world derived from this painting
    this.district.streetGroup.visible = false;
    this.activeSceneObj = this.sceneManager.buildStepThroughWorld(
      paintingNode.data,
      paintingNode.texture,
      this.skyDome,
      this.currentDistrictSlug
    );
    this.scene.add(this.activeSceneObj.group);

    // Place player just inside the threshold facing the heart of the painting & signature element
    this.player.position.set(0.0, 1.72, 2.2);
    this.player.yaw = 0.0;
    this.player.pitch = 0.02;
    this.mode = 'SCENE';

    // Track scene visited
    const sceneKey = `${this.currentDistrictSlug}-${paintingNode.data.n}`;
    if (!this.saveData.scenesVisited.includes(sceneKey)) {
      this.saveData.scenesVisited.push(sceneKey);
      this.persistSaveData();
    }

    // Show the ALWAYS-VISIBLE "Back to the street" control & Scene Banner (§5a)
    document.getElementById('back-to-street-btn').classList.remove('hidden');
    const banner = document.getElementById('scene-active-banner');
    banner.classList.remove('hidden');
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    document.getElementById('scene-banner-title').textContent =
      `${meta.shortName} No. ${paintingNode.data.n} · “${paintingNode.data.title}” (${paintingNode.data.ref})`;
    document.getElementById('scene-banner-sub').textContent =
      this.activeSceneObj.signatureLabel;

    this.audio.playLightChime(0.65, false);
    this.audio.playSceneMusic(this.currentDistrictSlug, paintingNode.data.n);
  }

  exitStepThroughSceneToStreet() {
    if (this.mode !== 'SCENE') return;

    if (this.activeSceneObj) {
      this.scene.remove(this.activeSceneObj.group);
      this.activeSceneObj = null;
    }

    this.district.streetGroup.visible = true;
    this.mode = 'STREET';

    // Restore exact street position and facing the pilgrim entered from (§5c)
    this.player.position.copy(this.streetReturnState.position);
    this.player.yaw = this.streetReturnState.yaw;
    this.player.pitch = this.streetReturnState.pitch;

    // Reset sky dome special uniforms to the book's street biome
    const bCfg = (this.district && this.district.biomeCfg) || this.districtBuilder.getDistrictBiomeConfig(this.currentDistrictSlug);
    this.skyDome.material.uniforms.uStarIntensity.value = bCfg.starIntensity || 0.0;
    this.skyDome.material.uniforms.uRainbowIntensity.value = 0.0;
    this._lastPaletteNode = null;

    // Hide the scene-only UI
    document.getElementById('back-to-street-btn').classList.add('hidden');
    document.getElementById('scene-active-banner').classList.add('hidden');
    this.audio.playStreetMusic(this.currentDistrictSlug);
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    this.showToast(`Returned to your exact place on ${meta.shortName} Street.`);
  }

  // Quick-jump helper so Timothy can immediately test any of the step-through scenes or any part of the street
  jumpToPaintingOnStreet(paintingNum, enterSceneImmediately = false) {
    if (!this.district) return;
    if (this.mode === 'SCENE') {
      this.exitStepThroughSceneToStreet();
    }
    const targetNode = this.district.paintingNodes.find((n) => n.data.n === paintingNum);
    if (!targetNode) return;

    const blockingVeil = this.getFirstBlockingVeil();
    if (blockingVeil && targetNode.roadPosition.z < blockingVeil.veilZ) {
      const veilPt = this.districtBuilder.getPathPoint(blockingVeil.veilZ + 1.8);
      this.player.position.set(veilPt.x, veilPt.y + 1.72, veilPt.z);
      this.player.yaw = 0.0;
      this.player.pitch = 0.0;
      this._needsRender = true;
      this.showToast(
        this.isZh()
          ? this.zh(`✦ 前往第 ${blockingVeil.part + 1} 篇章的道路被金色帷幕遮蔽——请先点亮【${blockingVeil.name}】（或切换为自由漫步模式）。`)
          : `✦ The way ahead is veiled in Story Walk — kindle ${blockingVeil.name} first (${blockingVeil.hint}), or switch to Free Walk.`
      );
      return;
    }

    // Place pilgrim on the road 3.6m in front of the painting, facing it
    const roadPt = targetNode.roadPosition;
    const dx = targetNode.position.x - roadPt.x;
    const dz = targetNode.position.z - roadPt.z;
    const yawToPainting = Math.atan2(-dx, -dz);

    this.player.position.set(roadPt.x, roadPt.y + 1.72, roadPt.z + 1.2);
    this.player.yaw = yawToPainting;
    this.player.pitch = 0.0;

    // Save this as the street return point so exiting the scene puts you right outside its frame!
    this.streetReturnState.position.copy(this.player.position);
    this.streetReturnState.yaw = this.player.yaw;
    this.streetReturnState.pitch = 0.0;

    if (!targetNode.textureLoaded && this.districtBuilder) {
      this.districtBuilder.ensureNodeTextureLoaded(targetNode);
    }

    if (enterSceneImmediately && targetNode.data.isScene) {
      return this.enterStepThroughScene(targetNode);
    } else {
      this.showToast(`Moved to No. ${targetNode.data.n} · “${targetNode.data.title}”`);
    }
  }

  jumpToHeroRelicOnStreet(relicId = null, bypassVeilCheck = false) {
    if (!this.district) return;
    if (this.mode === 'SCENE') {
      this.exitStepThroughSceneToStreet();
    }

    const relicNodes = this.district.heroRelicNodes || [];
    const targetRelicNode =
      (relicId && relicNodes.find((rn) => rn.id === relicId && !rn.isFinale)) ||
      relicNodes.find((rn) => !rn.isFinale) ||
      relicNodes[0];

    if (targetRelicNode) {
      const blockingVeil = bypassVeilCheck ? null : this.getFirstBlockingVeil();
      if (blockingVeil && targetRelicNode.position.z < blockingVeil.veilZ) {
        const veilPt = this.districtBuilder.getPathPoint(blockingVeil.veilZ + 1.8);
        this.player.position.set(veilPt.x, veilPt.y + 1.72, veilPt.z);
        this.player.yaw = 0.0;
        this.player.pitch = 0.0;
        this._needsRender = true;
        this.showToast(
          this.isZh()
            ? this.zh(
                `✦ 前往圣物纪念碑的道路被金色帷幕遮蔽——请先点亮【${blockingVeil.name}】（或切换为自由漫步模式）。`
              )
            : `✦ The way to this Hero Relic is veiled in Story Walk — kindle ${blockingVeil.name} first (${blockingVeil.hint}), or switch to Free Walk.`
        );
        return;
      }

      const roadPt = targetRelicNode.roadPosition;
      const dx = targetRelicNode.position.x - roadPt.x;
      const dz = targetRelicNode.position.z - roadPt.z;
      const yawToRelic = Math.atan2(-dx, -dz);

      this.player.position.set(roadPt.x, roadPt.y + 1.72, roadPt.z);
      this.player.yaw = yawToRelic;
      this.player.pitch = 0.0;

      this.streetReturnState.position.copy(this.player.position);
      this.streetReturnState.yaw = this.player.yaw;
      this.streetReturnState.pitch = 0.0;
      this._needsRender = true;

      const rItem = this.tripoManager?.relicById?.get(targetRelicNode.id);
      const rTitle = rItem ? rItem.title : targetRelicNode.id;
      this.markRelicInspected(targetRelicNode.id, true);
      this.showToast(
        this.isZh()
          ? this.zh(`🗿 已抵达本卷圣物：#${rItem?.slot || ''} ${rTitle} — 按 [E] 瞻仰圣物并阅读第 ${targetRelicNode.paintingNum} 首诗歌`)
          : `🗿 Standing before Hero Relic · #${rItem?.slot || ''} ${rTitle} (No. ${targetRelicNode.paintingNum}) — Press [E] to inspect & read source poem.`
      );
      return;
    }

    // Fallback for Districts I–VIII whose Hero Relics live at a specific painting or step-through scene
    const loc =
      (relicId && this.tripoManager?.getRelicLocationInfo(relicId)) ||
      this.tripoManager?.getDistrictPrimaryRelicInfo(this.currentDistrictSlug);
    if (loc && loc.id) {
      this.markRelicInspected(loc.id, true);
    }
    if (loc && loc.paintingNum) {
      this.jumpToPaintingOnStreet(loc.paintingNum, Boolean(loc.enterScene));
    }
  }

  markRelicInspected(relicId, silent = false) {
    if (!relicId || typeof relicId !== 'string') return false;
    if (!Array.isArray(this.saveData.relicsInspected)) {
      this.saveData.relicsInspected = [];
    }
    if (!this.saveData.relicsInspected.includes(relicId)) {
      this.saveData.relicsInspected.push(relicId);
      this.persistSaveData();
      if (!silent) {
        const rItem = this.tripoManager?.relicById?.get(relicId);
        const total = this.tripoManager?.manifest?.models?.length || 53;
        const count = this.saveData.relicsInspected.length;
        if (rItem) {
          this.showToast(`🗿 Discovered #${rItem.slot} · ${rItem.title} (${count} / ${total} Hero Relics Inspected)`);
        }
      }
      return true;
    }
    this.updateHUDProgress();
    return false;
  }

  async standBeforeRelicIn3D(relicId) {
    if (!relicId || !this.tripoManager) return;
    const loc = this.tripoManager.getRelicLocationInfo(relicId);
    if (!loc) return;

    this.markRelicInspected(relicId, true);
    this.closeAllModals();

    // Ensure Free Walk if the target district or part is veiled in Story Walk so Workshop inspection is immediate
    if (this.walkMode === 'STORY') {
      this.walkMode = 'FREE';
      this.saveData.walkMode = 'FREE';
      this.persistSaveData();
      this.syncPartVeilsWithMode();
      this.updateActivePillHighlight();
      this.updateHUDProgress();
    }

    if (this.currentDistrictSlug !== loc.slug || this.mode !== 'STREET') {
      await this.switchDistrict(loc.slug);
    }

    await this.tripoManager.ensureRelicLoaded(relicId);

    if (relicId === 'pilgrim-lantern') {
      const startPt = this.districtBuilder.getPathPoint(11.5);
      this.player.position.set(startPt.x, startPt.y + 1.72, startPt.z);
      this.player.yaw = 0.0;
      this.player.pitch = 0.0;
      this._needsRender = true;
      this.showToast('🗿 Standing with #1 · The Pilgrim’s Brass & Parchment Lantern at the Gatehouse threshold.');
      return;
    }

    this.jumpToHeroRelicOnStreet(relicId, true);
  }

  // ==========================================================================
  // INTERACTIONS: Poems, Hidden Lights, Step-Through Frames, Amen Gate, 3D Gatehouse Gates
  // ==========================================================================
  triggerPrimaryInteract() {
    this.audio.init();

    // If poem modal is open, close it
    if (this.openPoemPainting) {
      this.closePoemModal();
      return;
    }

    if (!this.currentInteractTarget) return;
    const t = this.currentInteractTarget;

    if (t.type === 'EXIT_SCENE') {
      this.exitStepThroughSceneToStreet();
    } else if (t.type === 'STEP_THROUGH') {
      this.enterStepThroughScene(t.node);
    } else if (t.type === 'READ_POEM') {
      this.openPoemModal(t.node.data, t.node.data.isScene ? () => this.enterStepThroughScene(t.node) : null);
    } else if (t.type === 'INSPECT_HERO_RELIC') {
      const inspectedId = t.relicNode?.id || t.relicMeta?.id;
      if (inspectedId) {
        this.markRelicInspected(inspectedId, true);
      }
      const pData = t.relicNode?.paintingData;
      const pNode =
        this.district?.paintingNodes?.find((n) => n.data.n === t.relicNode?.paintingNum) ||
        (pData ? { data: pData } : null);
      if (t.relicMeta) {
        this.showToast(`🗿 #${t.relicMeta.slot} · ${t.relicMeta.title} — ${t.relicMeta.imageTo3DTip}`);
      }
      if (pNode && pNode.data) {
        this.openPoemModal(pNode.data, pNode.data.isScene ? () => this.enterStepThroughScene(pNode) : null);
      }
    } else if (t.type === 'KINDLE_LIGHT') {
      this.markLightKindled(t.lightObj, false);
    } else if (t.type === 'VEIL_LOCKED' || t.type === 'VEIL_BLOCKED') {
      this.audio.playLightChime(0.45, false);
      this.showToast(
        this.isZh()
          ? this.zh(`✦ 道路尚待开启——请先寻找并点亮本篇的明灯：【${t.lightObj.name}】（${t.lightObj.hint}）`)
          : `✦ Kindle this part’s Light to open the veil: ${t.lightObj.name} — ${t.lightObj.hint}`
      );
    } else if (t.type === 'SIGNATURE_ELEMENT') {
      this.showToast(t.text);
      this.audio.playLightChime(0.8, true);
    } else if (t.type === 'AMEN_GATE') {
      this.triggerAmenGateCeremony();
    } else if (t.type === 'GATEHOUSE_HUB') {
      this.openModal('gatehouse-modal');
    } else if (t.type === 'ENTER_BOOK_GATE') {
      if (t.gate.playableSlug) {
        this.switchDistrict(t.gate.playableSlug);
      } else {
        this.showToast(`Book #${t.gate.bookData.n} · “${t.gate.bookData.title}” (${t.gate.bookData.subtitle}) stands on the 44-book Pilgrim Route.`);
        this.openModal('scroll-modal');
      }
    }
  }

  markLightKindled(lightObj, silent = false) {
    lightObj.kindled = true;
    lightObj.haloSprite.scale.set(3.6, 3.6, 1);
    lightObj.pointLight.intensity = 3.4;
    // Dissolve the veil blocking the next part of the book
    if (lightObj.veilGroup) {
      lightObj.veilGroup.visible = false;
    }
    if (!this.saveData.lightsKindled.includes(lightObj.id)) {
      this.saveData.lightsKindled.push(lightObj.id);
      this.persistSaveData();
    }
    const allKindled =
      this.district &&
      this.district.partGatesAndLights &&
      this.district.partGatesAndLights.length > 0 &&
      this.district.partGatesAndLights.every((l) => l.kindled);

    if (allKindled) {
      this.updateActivePillHighlight();
    }
    this._needsRender = true;

    if (!silent) {
      this.audio.playLightChime(1.0, true);
      if (allKindled) {
        const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
        this.showToast(
          `✦ Kindled ${lightObj.name}! All Lights of ${meta.shortName} shine — the Amen Gate is open & ${meta.nextLabel} is unlocked!`
        );
      } else {
        this.showToast(`✦ Kindled ${lightObj.name}! The veil dissolves and the way to Part ${lightObj.part + 1} opens.`);
      }
    }
  }

  triggerAmenGateCeremony() {
    const blockingVeil = this.getFirstBlockingVeil();
    if (blockingVeil) {
      this.audio.playLightChime(0.45, false);
      this.showToast(`✦ Kindle ${blockingVeil.name} first to open the Amen Gate (${blockingVeil.hint}).`);
      return;
    }
    const slug = this.currentDistrictSlug;
    if (!this.saveData.districtsCompleted.includes(slug)) {
      this.saveData.districtsCompleted.push(slug);
      this.persistSaveData();
    }
    this.syncPartVeilsWithMode();
    this.updateActivePillHighlight();
    this.audio.playLightChime(1.0, true);
    this.openModal('amen-modal');
  }

  openPoemModal(paintingData, stepThroughCallback = null) {
    this.openPoemPainting = paintingData;
    const seenKey = `${this.currentDistrictSlug}-${paintingData.n}`;
    if (!this.saveData.paintingsSeen.includes(seenKey) && !this.saveData.paintingsSeen.includes(paintingData.n)) {
      this.saveData.paintingsSeen.push(seenKey);
      this.persistSaveData();
    }

    const zh = this.isZh();
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    const pTitle = zh && paintingData.zh_title ? this.zh(paintingData.zh_title) : paintingData.title;
    const pRef = zh && paintingData.zh_ref ? this.zh(paintingData.zh_ref) : paintingData.ref;
    const pPoem = zh && paintingData.zh_poem ? this.zh(paintingData.zh_poem) : paintingData.poem;
    const pPrompt = zh && paintingData.zh_reflectionPrompt ? this.zh(paintingData.zh_reflectionPrompt) : paintingData.reflectionPrompt;
    const bookLabel = zh ? this.getZhBookTitle(this.currentDistrictSlug) : meta.shortName.toUpperCase();

    document.getElementById('poem-modal-num').textContent = zh
      ? this.zh(`${bookLabel} · 第 ${paintingData.n} 幅`)
      : `${bookLabel} · NO. ${paintingData.n}`;
    document.getElementById('poem-modal-title').textContent = pTitle;
    document.getElementById('poem-modal-ref').textContent = pRef;
    document.getElementById('poem-modal-body').textContent = pPoem;
    document.getElementById('poem-modal-img').src = paintingData.isScene ? paintingData.heroSrc : paintingData.webSrc;

    const reflBox = document.getElementById('poem-modal-reflection-box');
    const reflText = document.getElementById('poem-modal-reflection-text');
    const reflLabel = reflBox ? reflBox.querySelector('.reflection-callout-label') : null;
    if (reflLabel) {
      reflLabel.textContent = zh ? this.zh('✦ 今日心灵默想') : '✦ Reflection Prompt';
    }
    if (reflBox && reflText) {
      if (pPrompt) {
        reflText.textContent = pPrompt;
        reflBox.classList.remove('hidden');
      } else {
        reflBox.classList.add('hidden');
      }
    }

    const stepBtn = document.getElementById('poem-modal-step-btn');
    if (stepBtn && stepThroughCallback && this.mode === 'STREET') {
      stepBtn.textContent = zh ? this.zh('✦ 步入此画作的 3D 秘境') : '✦ Step Through Frame into this Painting';
      stepBtn.classList.remove('hidden');
      stepBtn.onclick = () => {
        this.closePoemModal();
        stepThroughCallback();
      };
    } else if (stepBtn) {
      stepBtn.classList.add('hidden');
    }

    const seleneBtn = document.getElementById('poem-modal-selene-btn');
    if (seleneBtn && this.dailyWalk) {
      const lbl = this.dailyWalk.getListenBtnLabel();
      seleneBtn.textContent = lbl;
      seleneBtn.onclick = () => {
        this.dailyWalk.speakPaintingWithSelene(paintingData, seleneBtn, lbl);
      };
    }

    document.getElementById('poem-modal').classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closePoemModal() {
    this.openPoemPainting = null;
    if (this.dailyWalk) this.dailyWalk.stopActiveVoice();
    document.getElementById('poem-modal').classList.add('hidden');
  }

  openModal(id) {
    this.populateModals(id);
    document.getElementById(id).classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeAllModals() {
    this.closePoemModal();
    this.stopTurntableLoop();
    const dailyWalkEl = document.getElementById('daily-walk-modal');
    if (this.dailyWalk) {
      if (dailyWalkEl && !dailyWalkEl.classList.contains('hidden')) {
        this.dailyWalk.saveCurrentJournalNote();
      }
      this.dailyWalk.stopActiveVoice();
    }
    ['gatehouse-modal', 'scroll-modal', 'shelf-modal', 'amen-modal', 'tripo-modal', 'daily-walk-modal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  // ==========================================================================
  // CONTROLS & UI BINDINGS (§5)
  // ==========================================================================
  bindUIAndControls() {
    window.addEventListener('keydown', (e) => {
      if (
        e.target &&
        (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.tagName === 'SELECT')
      ) {
        if (e.code === 'Escape') this.closeAllModals();
        return;
      }
      this.keys[e.code] = true;
      if (e.code === 'KeyE') {
        e.preventDefault();
        this.triggerPrimaryInteract();
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        this.toggleHudMinimized();
      } else if (e.code === 'KeyP' && !this.isAnyModalOpen()) {
        e.preventDefault();
        this.capturePilgrimPostcard();
      } else if (e.code === 'KeyR' && this.currentInteractTarget && this.currentInteractTarget.node) {
        e.preventDefault();
        const node = this.currentInteractTarget.node;
        this.openPoemModal(node.data, node.data.isScene ? () => this.enterStepThroughScene(node) : null);
      } else if (e.code === 'Backspace' || (e.code === 'Escape' && this.mode === 'SCENE' && !this.openPoemPainting)) {
        this.exitStepThroughSceneToStreet();
      } else if (e.code === 'Escape') {
        this.closeAllModals();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse look (Pointer Lock + Drag-look fallback so it feels effortless on Mac trackpads and mice)
    this.canvas.addEventListener('click', () => {
      this.audio.init();
      if (!this.openPoemPainting && !this.isAnyModalOpen() && window.innerWidth > 900) {
        if (this.canvas.requestPointerLock) {
          this.canvas.requestPointerLock();
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.player.yaw -= e.movementX * 0.0022;
        this.player.pitch = Math.max(-1.15, Math.min(1.15, this.player.pitch - e.movementY * 0.0020));
      } else if (this.isDraggingLook) {
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;
        this.lastPointer.x = e.clientX;
        this.lastPointer.y = e.clientY;
        this.player.yaw -= dx * 0.0045;
        this.player.pitch = Math.max(-1.15, Math.min(1.15, this.player.pitch - dy * 0.0040));
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) {
        this.isDraggingLook = true;
        this.lastPointer.x = e.clientX;
        this.lastPointer.y = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => {
      this.isDraggingLook = false;
    });

    // Touch drag-look on canvas
    let touchLookId = null;
    this.canvas.addEventListener('touchstart', (e) => {
      this.audio.init();
      const t = e.changedTouches[0];
      touchLookId = t.identifier;
      this.lastPointer.x = t.clientX;
      this.lastPointer.y = t.clientY;
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchLookId) {
          const dx = t.clientX - this.lastPointer.x;
          const dy = t.clientY - this.lastPointer.y;
          this.lastPointer.x = t.clientX;
          this.lastPointer.y = t.clientY;
          this.player.yaw -= dx * 0.005;
          this.player.pitch = Math.max(-1.1, Math.min(1.1, this.player.pitch - dy * 0.0045));
        }
      }
    }, { passive: true });

    // Mobile Virtual Joystick
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    if (joyZone && joyKnob) {
      let joyActive = false;
      const updateJoystick = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width * 0.38;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.touchMove.x = dx / maxR;
        this.touchMove.y = -dy / maxR;
      };
      joyZone.addEventListener('touchstart', (e) => {
        joyActive = true;
        updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      joyZone.addEventListener('touchmove', (e) => {
        if (joyActive) updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      const endJoy = () => {
        joyActive = false;
        joyKnob.style.transform = 'translate(0px, 0px)';
        this.touchMove.x = 0;
        this.touchMove.y = 0;
      };
      joyZone.addEventListener('touchend', endJoy);
      joyZone.addEventListener('touchcancel', endJoy);
    }

    // Persistent "Back to the street" button (§5a)
    document.getElementById('back-to-street-btn').addEventListener('click', () => {
      this.exitStepThroughSceneToStreet();
    });

    // Prompt bar click / touch action button
    document.getElementById('interact-prompt-btn').addEventListener('click', () => {
      this.triggerPrimaryInteract();
    });
    document.getElementById('read-poem-secondary-btn').addEventListener('click', () => {
      if (this.currentInteractTarget && this.currentInteractTarget.node) {
        const n = this.currentInteractTarget.node;
        this.openPoemModal(n.data, n.data.isScene ? () => this.enterStepThroughScene(n) : null);
      }
    });

    // Top HUD & District Switcher buttons
    document.getElementById('btn-gatehouse').addEventListener('click', () => this.openModal('gatehouse-modal'));
    document.getElementById('btn-long-scroll').addEventListener('click', () => this.openModal('scroll-modal'));
    document.getElementById('btn-cover-shelf').addEventListener('click', () => this.openModal('shelf-modal'));
    const btnTripo = document.getElementById('btn-tripo-studio');
    if (btnTripo) btnTripo.addEventListener('click', () => this.openModal('tripo-modal'));
    const hudRelicsPill = document.getElementById('hud-relics-pill');
    if (hudRelicsPill) {
      hudRelicsPill.addEventListener('click', () => this.openModal('tripo-modal'));
    }
    const btnPostcard = document.getElementById('btn-postcard-snapshot');
    if (btnPostcard) {
      btnPostcard.addEventListener('click', () => this.capturePilgrimPostcard());
    }

    const btnWalkGH = document.getElementById('btn-walk-gatehouse');
    if (btnWalkGH) btnWalkGH.addEventListener('click', () => this.enterGatehouse3DHub());

    const allSlugs = Object.keys(this.districtMeta);
    const btnPrev = document.getElementById('btn-prev-district');
    const btnNext = document.getElementById('btn-next-district');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        const idx = allSlugs.indexOf(this.currentDistrictSlug);
        const prevIdx = idx <= 0 ? allSlugs.length - 1 : idx - 1;
        this.switchDistrict(allSlugs[prevIdx]);
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const idx = allSlugs.indexOf(this.currentDistrictSlug);
        const nextIdx = idx < 0 || idx >= allSlugs.length - 1 ? 0 : idx + 1;
        this.switchDistrict(allSlugs[nextIdx]);
      });
    }

    const hudSelect = document.getElementById('hud-district-select');
    if (hudSelect) {
      hudSelect.addEventListener('change', (e) => {
        if (e.target.value) this.switchDistrict(e.target.value);
      });
    }

    const ghBtnCourt = document.getElementById('gatehouse-btn-courtyard');
    if (ghBtnCourt) ghBtnCourt.addEventListener('click', () => this.enterGatehouse3DHub());

    const ghAllBtns = document.getElementById('gatehouse-all-44-buttons');
    if (ghAllBtns) {
      allSlugs.forEach((slug, i) => {
        const m = this.districtMeta[slug];
        const b = document.createElement('button');
        b.className = 'gold-btn';
        b.textContent = `${m.num} · #${i + 1}: ${m.shortName}`;
        b.addEventListener('click', () => this.switchDistrict(slug));
        ghAllBtns.appendChild(b);
      });
    }

    const amenNextBtn = document.getElementById('amen-next-district-btn');
    if (amenNextBtn) {
      amenNextBtn.addEventListener('click', () => {
        if (this.currentDistrictSlug === 'all-things-new') {
          this.enterGatehouse3DHub();
        } else {
          const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
          this.switchDistrict(meta.nextSlug);
        }
      });
    }

    const btnLang = document.getElementById('btn-lang-toggle');
    if (btnLang) {
      btnLang.addEventListener('click', () => {
        const order = ['en', 'zh', 'zh-TW'];
        const nextIdx = (order.indexOf(this.lang) + 1) % order.length;
        this.lang = order[nextIdx];
        this.saveData.lang = this.lang;
        if (this.dailyWalk) this.dailyWalk.stopActiveVoice();
        this.applyAccessibilitySettings();
        this.updateActivePillHighlight();
        this.renderQuickSceneStrip();
        this.populateModals();
        this.persistSaveData();
        if (this.dailyWalk) {
          this.dailyWalk.updateHUDCandlePill();
          const dwModal = document.getElementById('daily-walk-modal');
          if (dwModal && !dwModal.classList.contains('hidden')) {
            this.dailyWalk.renderDailyWalkModal();
          }
        }
        if (this.openPoemPainting) {
          const p = this.openPoemPainting;
          const node = this.district?.paintingNodes?.find((n) => n.data.n === p.n);
          this.openPoemModal(p, node && p.isScene ? () => this.enterStepThroughScene(node) : null);
        }
        this.showToast(
          this.lang === 'zh'
            ? '🌐 已切换为【简体中文 · 和合本】：全部 44 卷诗画、经文、默想与 Selene 朗读已转换为简体中文（再次点击可切换繁體）。'
            : this.lang === 'zh-TW'
            ? '🌐 已切換為【繁體中文 · 和合本】：全部 44 卷詩畫、經文、默想與 Selene 朗讀已轉換為繁體中文（再次點擊可切換英文）。'
            : '🌐 Switched to English: All 44 books, poems, Scripture, reflections, and Selene audio are now in English.'
        );
      });
    }

    const btnHudCollapse = document.getElementById('btn-hud-collapse');
    if (btnHudCollapse) {
      btnHudCollapse.addEventListener('click', () => {
        this.toggleHudMinimized();
      });
    }

    document.getElementById('btn-mode-toggle').addEventListener('click', () => {
      const modes = ['STORY', 'FREE', 'DAILY'];
      const nextIdx = (modes.indexOf(this.walkMode) + 1) % modes.length;
      this.walkMode = modes[nextIdx];
      this.saveData.walkMode = this.walkMode;
      this.applyAccessibilitySettings();
      this.syncPartVeilsWithMode();
      this.updateActivePillHighlight();
      this.populateModals();
      this.persistSaveData();
      if (this.mode === 'GATEHOUSE') {
        this.enterGatehouse3DHub();
      } else if (this.mode === 'STREET' && this.walkMode === 'STORY') {
        const blockingVeil = this.getFirstBlockingVeil();
        if (blockingVeil && this.player.position.z < blockingVeil.veilZ + 1.15) {
          const safeZ = blockingVeil.veilZ + 1.8;
          const roadPt = this.districtBuilder.getPathPoint(safeZ);
          this.player.position.set(roadPt.x, roadPt.y + 1.72, safeZ);
        }
      }
      if (this.dailyWalk) {
        this.dailyWalk.updateHUDCandlePill();
        if (this.walkMode === 'DAILY') {
          this.dailyWalk.walkCurrentDayIn3D(false);
          return;
        }
      }
      this.showToast(
        this.walkMode === 'FREE'
          ? 'Free Walk active: all parts, paintings, and gates open to wander freely.'
          : 'Story Walk active: each part’s hidden Light unlocks the veil to the next part.'
      );
    });

    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      this.audio.init();
      const nextMuted = !this.audio.muted;
      this.audio.setMuted(nextMuted);
      this.saveData.audioMuted = nextMuted;
      this.syncAudioUI();
      this.persistSaveData();
    });

    const bindVolumeSlider = (sliderId, key, audioProp) => {
      const slider = document.getElementById(sliderId);
      if (!slider) return;
      const onInput = () => {
        this.audio.init();
        const pct = Math.max(0, Math.min(100, parseInt(slider.value, 10) || 0));
        const val01 = pct / 100;
        this.saveData[key] = val01;
        const updatePayload = { [audioProp]: val01 };
        // If user drags a slider above 0 while muted, automatically unmute so sound plays immediately
        if (val01 > 0 && this.audio.muted) {
          this.saveData.audioMuted = false;
          updatePayload.muted = false;
        }
        this.audio.setVolumes(updatePayload);
        this.syncAudioUI();
        this.persistSaveData();
      };
      slider.addEventListener('input', onInput);
      slider.addEventListener('change', onInput);
    };

    bindVolumeSlider('slider-master-vol', 'masterVolume', 'master');
    bindVolumeSlider('slider-music-vol', 'musicVolume', 'music');
    bindVolumeSlider('slider-voice-vol', 'voiceVolume', 'voice');

    // Progress Export / Import controls in Intro / Gatehouse Modal
    const copyProgressBtn = document.getElementById('gh-btn-copy-progress');
    if (copyProgressBtn) {
      copyProgressBtn.addEventListener('click', () => this.copyProgressCode());
    }
    const progressOutEl = document.getElementById('gh-progress-code-output');
    if (progressOutEl) {
      progressOutEl.addEventListener('click', () => {
        progressOutEl.select();
      });
    }
    const restoreProgressBtn = document.getElementById('gh-btn-restore-progress');
    const restoreProgressInput = document.getElementById('gh-progress-code-input');
    if (restoreProgressBtn && restoreProgressInput) {
      restoreProgressBtn.addEventListener('click', () => {
        this.restoreProgressFromCode(restoreProgressInput.value);
      });
      restoreProgressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.restoreProgressFromCode(restoreProgressInput.value);
        }
      });
    }

    // One-Time Intro Audible Narrator & Replay Controls
    const btnIntroToggle = document.getElementById('btn-intro-narrator-toggle');
    if (btnIntroToggle) {
      btnIntroToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleIntroWelcomeNarration();
      });
    }
    const btnIntroDismiss = document.getElementById('btn-intro-narrator-dismiss');
    if (btnIntroDismiss) {
      btnIntroDismiss.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismissIntroWelcomeBanner();
      });
    }
    const btnGatehouseIntro = document.getElementById('gatehouse-btn-listen-intro');
    if (btnGatehouseIntro) {
      btnGatehouseIntro.addEventListener('click', () => {
        this.toggleIntroWelcomeNarration();
      });
    }

    const btnGraphics = document.getElementById('btn-graphics-quality');
    if (btnGraphics) {
      btnGraphics.addEventListener('click', () => {
        const order = ['balanced', 'eco', 'high'];
        const nextIdx = (order.indexOf(this.graphicsQuality) + 1) % order.length;
        const nextTier = order[nextIdx];
        this.saveData.graphicsQualityUserSet = true;
        this.applyGraphicsQuality(nextTier);
        this.applyAccessibilitySettings();
        this.persistSaveData();
        const zh = this.isZh();
        const msgMap = {
          balanced: zh
            ? this.zh('⚡ 画质已设为【均衡 (Balanced)】：30 FPS · 1.5x 像素比 · 智能降噪油画滤镜，兼顾清晰度与笔记本清凉续航。')
            : '⚡ Graphics: Balanced — 30 FPS max, 1.5x pixel ratio, optimized painterly shaders.',
          eco: zh
            ? this.zh('🌿 画质已设为【省电 (Eco)】：30 FPS · 1.0x 像素比 · 轻量化油画渲染，大幅降低发热与电池消耗。')
            : '🌿 Graphics: Eco — 30 FPS max, 1.0x pixel ratio for coolest laptop temperature & longest battery life.',
          high: zh
            ? this.zh('✦ 画质已设为【高画质 (High Quality)】：60 FPS · 最高 2.0x 视网膜像素比 · 全分辨率油画笔触与圣光。')
            : '✦ Graphics: High Quality — 60 FPS, up to 2.0x Retina pixel ratio, full-resolution brushwork & god-rays.'
        };
        this.showToast(msgMap[nextTier]);
      });
    }

    document.getElementById('btn-a11y-motion').addEventListener('click', () => {
      this.reducedMotion = !this.reducedMotion;
      this.saveData.reducedMotion = this.reducedMotion;
      this.applyAccessibilitySettings();
      this.persistSaveData();
    });

    document.getElementById('btn-a11y-text').addEventListener('click', () => {
      this.largeText = !this.largeText;
      this.saveData.largeText = this.largeText;
      this.applyAccessibilitySettings();
      this.persistSaveData();
    });

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Pause rendering and world updates when the browser tab is hidden; resume cleanly without time jumps
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keys = {};
        this.isDraggingLook = false;
        this.stopRenderLoop();
      } else {
        this.clock.getDelta(); // Discard accumulated hidden-tab time delta
        this._lastFrameTime = performance.now();
        this._needsRender = true;
        this.startRenderLoop();
      }
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.isDraggingLook = false;
    });
  }

  toggleHudMinimized() {
    this.hudMinimized = !this.hudMinimized;
    this.applyAccessibilitySettings();
    if (this.dailyWalk) {
      this.dailyWalk.updateHUDCandlePill();
    }
  }

  applyAccessibilitySettings() {
    const zh = this.isZh();
    document.body.classList.toggle('large-text', this.largeText);
    document.body.classList.toggle('hud-minimized', !!this.hudMinimized);
    const hudCollapseBtn = document.getElementById('btn-hud-collapse');
    if (hudCollapseBtn) {
      hudCollapseBtn.textContent = this.hudMinimized
        ? (zh ? this.zh('☰ 菜单') : '☰ Menu')
        : (zh ? this.zh('👁 隐藏图标') : '👁 Hide Icons');
    }
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
      const isCompact = window.innerWidth <= 820 && this.hudMinimized;
      langBtn.textContent =
        this.lang === 'zh'
          ? (isCompact ? '🌐 简→繁' : '🌐 简体中文 · 切换繁體')
          : this.lang === 'zh-TW'
          ? (isCompact ? '🌐 繁→EN' : '🌐 繁體中文 · 切换英文')
          : (isCompact ? '🌐 中文/EN' : '🌐 中文 (简/繁) / EN');
    }
    const prevBtn = document.getElementById('btn-prev-district');
    const nextBtn = document.getElementById('btn-next-district');
    const scrollBtn = document.getElementById('btn-long-scroll');
    const shelfBtn = document.getElementById('btn-cover-shelf');
    const introBtn = document.getElementById('btn-gatehouse');
    const workshopBtn = document.getElementById('btn-tripo-studio');
    const postcardBtn = document.getElementById('btn-postcard-snapshot');
    const backStreetBtn = document.getElementById('back-to-street-btn');
    const hintEl = document.getElementById('controls-hint');
    if (prevBtn) prevBtn.textContent = zh ? this.zh('◀ 上一卷') : '◀ Prev';
    if (nextBtn) nextBtn.textContent = zh ? this.zh('下一卷 ▶') : 'Next ▶';
    if (scrollBtn) scrollBtn.textContent = zh ? this.zh('📜 全部 44 卷') : '📜 All 44 Books';
    if (shelfBtn) shelfBtn.textContent = zh ? this.zh('📚 44 卷书架') : '📚 44-Book Shelf';
    if (introBtn) introBtn.textContent = zh ? this.zh('📖 导言') : '📖 Intro';
    if (workshopBtn) workshopBtn.textContent = zh ? this.zh('🗿 圣物工坊') : '🗿 Relic Workshop';
    if (postcardBtn) postcardBtn.textContent = zh ? this.zh('📷 明信片') : '📷 Postcard';
    if (backStreetBtn) backStreetBtn.textContent = zh ? this.zh('← 返回主街道') : '← Back to the street';
    if (hintEl) {
      hintEl.textContent = zh
        ? this.zh('WASD / 方向键：行走 · 鼠标拖拽：环视 · [E]：互动 / 步入画中 · [R]：阅读诗歌 · [P]：保存明信片')
        : 'WASD / Arrows: Walk · Mouse / Drag: Look · [E]: Interact / Step Through Frame · [R]: Read Poem · [P]: Postcard';
    }

    const gBtn = document.getElementById('btn-graphics-quality');
    if (gBtn) {
      if (this.graphicsQuality === 'eco') {
        gBtn.textContent = zh ? this.zh('🌿 画质：省电') : '🌿 Graphics: Eco';
      } else if (this.graphicsQuality === 'high') {
        gBtn.textContent = zh ? this.zh('✦ 画质：高画质') : '✦ Graphics: High Quality';
      } else {
        gBtn.textContent = zh ? this.zh('⚡ 画质：均衡') : '⚡ Graphics: Balanced';
      }
    }
    const mBtn = document.getElementById('btn-a11y-motion');
    if (mBtn) mBtn.textContent = zh ? this.zh(this.reducedMotion ? '动态：平缓' : '动态：标准') : (this.reducedMotion ? 'Motion: Calm' : 'Motion: Standard');
    const tBtn = document.getElementById('btn-a11y-text');
    if (tBtn) tBtn.textContent = zh ? this.zh(this.largeText ? '字号：大字' : '字号：标准') : (this.largeText ? 'Text: Large' : 'Text: Standard');
    const aBtn = document.getElementById('btn-audio-toggle');
    if (aBtn) aBtn.textContent = zh ? this.zh(this.audio.muted ? '音效：关' : '音效：开') : (this.audio.muted ? 'Sound: Off' : 'Sound: On');
    this.syncAudioUI();
    const wBtn = document.getElementById('btn-mode-toggle');
    if (wBtn) {
      wBtn.textContent =
        this.walkMode === 'STORY'
          ? (zh ? this.zh('模式：书卷同行') : 'Mode: Story Walk')
          : this.walkMode === 'FREE'
          ? (zh ? this.zh('模式：自由漫步') : 'Mode: Free Walk')
          : (zh ? this.zh('模式：每日灵修 🕯') : 'Mode: Daily Walk 🕯');
    }
  }

  syncAudioUI() {
    const zh = this.isZh();
    const aBtn = document.getElementById('btn-audio-toggle');
    if (aBtn) {
      aBtn.textContent = zh
        ? this.zh(this.audio.muted ? '音效：关' : '音效：开')
        : (this.audio.muted ? 'Sound: Off' : 'Sound: On');
    }
    const lblMaster = document.getElementById('lbl-master-vol');
    const lblMusic = document.getElementById('lbl-music-vol');
    const lblVoice = document.getElementById('lbl-voice-vol');
    if (lblMaster) lblMaster.textContent = zh ? this.zh('总音量') : 'Vol';
    if (lblMusic) lblMusic.textContent = zh ? this.zh('配乐') : 'Music';
    if (lblVoice) lblVoice.textContent = zh ? this.zh('朗读') : 'Voice';

    const masterPct = Math.round((this.audio.masterVolume ?? 1) * 100);
    const musicPct = Math.round((this.audio.musicVolume ?? 1) * 100);
    const voicePct = Math.round((this.audio.voiceVolume ?? 1) * 100);

    const sMaster = document.getElementById('slider-master-vol');
    const sMusic = document.getElementById('slider-music-vol');
    const sVoice = document.getElementById('slider-voice-vol');
    if (sMaster && document.activeElement !== sMaster) sMaster.value = String(masterPct);
    if (sMusic && document.activeElement !== sMusic) sMusic.value = String(musicPct);
    if (sVoice && document.activeElement !== sVoice) sVoice.value = String(voicePct);

    const vMaster = document.getElementById('val-master-vol');
    const vMusic = document.getElementById('val-music-vol');
    const vVoice = document.getElementById('val-voice-vol');
    if (vMaster) vMaster.textContent = `${masterPct}%`;
    if (vMusic) vMusic.textContent = `${musicPct}%`;
    if (vVoice) vVoice.textContent = `${voicePct}%`;
    this.syncIntroNarratorUI();
  }

  encodeProgressCode() {
    const payload = {
      v: 1,
      key: SAVE_KEY,
      exportedAt: new Date().toISOString(),
      data: this.saveData
    };
    const jsonStr = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(jsonStr);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    const b64url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `PW1-${b64url}`;
  }

  decodeProgressCode(rawText) {
    if (typeof rawText !== 'string') {
      throw new Error('Empty progress code');
    }
    const cleaned = rawText.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!cleaned) {
      throw new Error('Empty progress code');
    }

    let parsedObj = null;
    if (cleaned.startsWith('{')) {
      parsedObj = JSON.parse(cleaned);
    } else {
      const match = cleaned.match(/^PW(\d+)[-.:](.+)$/i);
      if (!match) {
        throw new Error('Unrecognized progress code prefix (expected PW1-...)');
      }
      const version = parseInt(match[1], 10);
      if (version !== 1) {
        throw new Error(`Unsupported progress code version: PW${version}`);
      }
      const body = match[2].replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - (body.length % 4)) % 4;
      const b64 = body + '='.repeat(padLen);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const jsonStr = new TextDecoder().decode(bytes);
      parsedObj = JSON.parse(jsonStr);
    }

    if (!parsedObj || typeof parsedObj !== 'object') {
      throw new Error('Invalid progress payload');
    }
    const saveCandidate =
      parsedObj.v === 1 && parsedObj.data && typeof parsedObj.data === 'object'
        ? parsedObj.data
        : parsedObj;
    return this.normalizeSaveData(saveCandidate);
  }

  getProgressSummaryText(save = this.saveData) {
    const zh = this.isZh();
    const lights = (save.lightsKindled || []).length;
    const books = (save.districtsCompleted || []).length;
    const poems = (save.paintingsSeen || []).length;
    const relics = (save.relicsInspected || []).length;
    const candles = (save.dailyWalk?.completedDays || []).length;
    const notes = Object.keys(save.dailyWalk?.journalNotes || {}).length;
    if (zh) {
      return this.zh(
        `当前存档进度（v1）：已点亮 ${lights} 盏明灯 · 已完成 ${books} 卷书 · 已读 ${poems} 首诗歌 · 已瞻仰 ${relics} 尊圣物 · 每日灵修已点亮 ${candles} 天烛光 · ${notes} 篇默想笔记`
      );
    }
    return `Current save (v1): ${lights} Lights kindled · ${books} Books completed · ${poems} Poems read · ${relics} Relics inspected · ${candles} Daily Walk candles · ${notes} Journal notes`;
  }

  refreshProgressCodeUI(customStatusMsg = null) {
    const zh = this.isZh();
    const eyebrow = document.getElementById('gh-transfer-eyebrow');
    const desc = document.getElementById('gh-transfer-desc');
    const copyBtn = document.getElementById('gh-btn-copy-progress');
    const restoreBtn = document.getElementById('gh-btn-restore-progress');
    const outInput = document.getElementById('gh-progress-code-output');
    const inInput = document.getElementById('gh-progress-code-input');
    const statusEl = document.getElementById('gh-progress-transfer-status');

    if (eyebrow) {
      eyebrow.textContent = zh
        ? this.zh('✦ 天路同行进度码 (PW1) · 备份与跨网址迁移')
        : '✦ PILGRIM PROGRESS CODE · BACKUP & ADDRESS BRIDGE';
    }
    if (desc) {
      desc.textContent = zh
        ? this.zh(
            '浏览器存档与当前网址绑定。点击下方「复制我的进度码」可保存您的全部明灯、已完成书卷、每日灵修烛光与默想笔记；若将来更换网址或设备，只需粘贴进度码即可完整恢复。'
          )
        : 'Saves are stored per web address. Copy your progress code below to back up your walk or carry your kindled Lights, completed Books, Daily Walk streak, and journal notes to a new web address or device.';
    }
    if (copyBtn) {
      copyBtn.textContent = zh ? this.zh('📋 复制我的进度码') : '📋 Copy My Progress Code';
    }
    if (restoreBtn) {
      restoreBtn.textContent = zh ? this.zh('✦ 从进度码恢复') : '✦ Restore from Code';
    }
    if (inInput) {
      inInput.placeholder = zh
        ? this.zh('在此粘贴您的 PW1-... 进度码以恢复存档…')
        : 'Paste your PW1-... progress code here to restore…';
    }
    if (outInput) {
      try {
        outInput.value = this.encodeProgressCode();
      } catch (_) {}
    }
    if (statusEl) {
      statusEl.textContent = customStatusMsg || this.getProgressSummaryText(this.saveData);
    }
  }

  async copyProgressCode() {
    const zh = this.isZh();
    const code = this.encodeProgressCode();
    const outInput = document.getElementById('gh-progress-code-output');
    if (outInput) {
      outInput.value = code;
      outInput.focus();
      outInput.select();
    }
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        copied = true;
      }
    } catch (_) {}
    if (!copied && outInput) {
      try {
        copied = document.execCommand('copy');
      } catch (_) {}
    }
    const msg = zh
      ? this.zh(`📋 已复制您的天路进度码！(${this.getProgressSummaryText(this.saveData)})`)
      : `📋 Copied your Pilgrim Progress Code! (${this.getProgressSummaryText(this.saveData)})`;
    this.refreshProgressCodeUI(msg);
    this.showToast(msg);
  }

  async restoreProgressFromCode(rawText) {
    const zh = this.isZh();
    let restored;
    try {
      restored = this.decodeProgressCode(rawText);
    } catch (err) {
      const errMsg = zh
        ? this.zh('⚠ 进度码格式无效，请确认粘贴了完整的 PW1-... 进度码。')
        : '⚠ Invalid progress code. Please paste a complete PW1-... progress code.';
      this.refreshProgressCodeUI(errMsg);
      this.showToast(errMsg);
      return false;
    }

    this.saveData = restored;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
    } catch (e) {
      console.warn('localStorage write fallback', e);
    }

    this.lang = this.saveData.lang || 'en';
    this.walkMode = this.saveData.walkMode || 'STORY';
    this.reducedMotion = !!this.saveData.reducedMotion;
    this.largeText = !!this.saveData.largeText;
    const nextGraphics = this.resolveInitialGraphicsQuality();
    this.applyGraphicsQuality(nextGraphics);
    this.audio.setVolumes({
      master: this.saveData.masterVolume,
      music: this.saveData.musicVolume,
      voice: this.saveData.voiceVolume,
      muted: this.saveData.audioMuted
    });
    this.applyAccessibilitySettings();

    if (this.dailyWalk) {
      const dw = this.saveData.dailyWalk || {};
      this.dailyWalk.currentDay = dw.currentDay || 1;
      await this.dailyWalk.loadDayEntry(this.dailyWalk.currentDay);
      this.dailyWalk.updateHUDCandlePill();
    }

    const targetSlug = this.districtMeta[this.saveData.currentDistrictSlug]
      ? this.saveData.currentDistrictSlug
      : 'genesis';
    await this.switchDistrict(targetSlug, true);

    const inInput = document.getElementById('gh-progress-code-input');
    if (inInput) inInput.value = '';

    const okMsg = zh
      ? this.zh(`✦ 已成功从进度码恢复存档！${this.getProgressSummaryText(this.saveData)}`)
      : `✦ Progress restored from code! ${this.getProgressSummaryText(this.saveData)}`;
    this.populateModals('gatehouse-modal');
    this.refreshProgressCodeUI(okMsg);
    this.showToast(okMsg);
    return true;
  }

  isAnyModalOpen() {
    return ['poem-modal', 'gatehouse-modal', 'scroll-modal', 'shelf-modal', 'amen-modal', 'tripo-modal', 'daily-walk-modal'].some((id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
  }

  updateHUDProgress() {
    const elLights = document.getElementById('hud-lights-count');
    const elSeen = document.getElementById('hud-paintings-count');
    const elRelics = document.getElementById('hud-relics-count');
    const zh = this.isZh();

    const totalRelics = this.tripoManager?.manifest?.models?.length || 53;
    const inspectedRelics = Array.isArray(this.saveData.relicsInspected)
      ? this.saveData.relicsInspected.length
      : 0;
    if (elRelics) {
      elRelics.textContent = zh
        ? this.zh(`${inspectedRelics} / ${totalRelics} 尊圣物`)
        : `${inspectedRelics} / ${totalRelics} Relics`;
    }

    if (this.mode === 'GATEHOUSE') {
      if (elLights) elLights.textContent = `${this.saveData.lightsKindled.length} Total Lights`;
      if (elSeen) elSeen.textContent = `44 / 44 Gates Open`;
      return;
    }

    const slugPrefix = `${this.currentDistrictSlug}-`;
    const districtLights = this.saveData.lightsKindled.filter((id) => id.startsWith(slugPrefix)).length;
    const districtPoems = this.saveData.paintingsSeen.filter((id) =>
      typeof id === 'string' ? id.startsWith(slugPrefix) : this.currentDistrictSlug === 'genesis'
    ).length;

    const totalLights = this.manifest && this.manifest.parts ? this.manifest.parts.length : 4;
    const totalPoems = this.manifest && this.manifest.paintings ? this.manifest.paintings.length : 40;

    if (elLights) elLights.textContent = zh ? this.zh(`${districtLights} / ${totalLights} 盏明灯`) : `${districtLights} / ${totalLights} Lights`;
    if (elSeen) elSeen.textContent = zh ? this.zh(`${districtPoems} / ${totalPoems} 首诗歌`) : `${districtPoems} / ${totalPoems} Poems`;
  }

  populateModals(targetModalId = null) {
    if (!this.routeData || !this.manifest) return;

    const zh = this.isZh();
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    const totalParts = this.manifest.parts ? this.manifest.parts.length : 4;
    const totalPaintings = this.manifest.paintings ? this.manifest.paintings.length : 40;
    const totalScenes = this.manifest.paintings ? this.manifest.paintings.filter((p) => p.isScene).length : 4;

    const isModalActive = (id) => {
      if (targetModalId === id) return true;
      const el = document.getElementById(id);
      return Boolean(el && !el.classList.contains('hidden'));
    };

    // 0. Gatehouse Hub Modal
    const ghTitle = document.getElementById('gatehouse-modal-title');
    const ghSub = document.getElementById('gatehouse-modal-sub');
    const ghBody = document.getElementById('gatehouse-modal-body');
    const mTitle = zh && this.manifest.zh_title ? this.zh(this.manifest.zh_title) : this.manifest.title;
    const mSub = zh && this.manifest.zh_subtitle ? this.zh(this.manifest.zh_subtitle) : this.manifest.subtitle;
    if (ghTitle) ghTitle.textContent = `${mTitle} — ${mSub}`;
    if (ghSub) {
      ghSub.textContent = zh
        ? this.zh(`第 ${meta.num} 卷 · ${totalPaintings} 幅画作与诗歌 · ${totalParts} 个篇章 · ${totalScenes} 处可步入的 3D 画境`)
        : `District ${meta.num} · ${totalPaintings} Paintings · ${totalParts} Parts · ${totalParts} Hidden Lights · ${totalScenes} Step-Through Scenes`;
    }
    if (ghBody) {
      ghBody.textContent = zh && this.manifest.zh_beforeYouBegin ? this.zh(this.manifest.zh_beforeYouBegin) : this.manifest.beforeYouBegin;
    }
    this.refreshProgressCodeUI();

    // 1. Long Scroll Modal (rendered when opened so other districts' covers are not eagerly fetched on initial boot)
    const routeSlugMap = this.getRouteSlugMap();
    const scrollGrid = document.getElementById('scroll-districts-list');
    if (scrollGrid && isModalActive('scroll-modal')) {
      scrollGrid.innerHTML = '';
      this.routeData.forEach((d) => {
        const card = document.createElement('div');
        const playableSlug = routeSlugMap[d.slug] || d.slug;
        const isCurrent = this.mode !== 'GATEHOUSE' && playableSlug === this.currentDistrictSlug;
        const isDone = playableSlug && this.saveData.districtsCompleted.includes(playableSlug);
        const isUnlocked = playableSlug && this.isDistrictUnlocked(playableSlug);
        card.className = `scroll-card ${isCurrent ? 'active-district' : ''} ${isDone ? 'completed-district' : ''}`;
        if (playableSlug) {
          card.style.cursor = 'pointer';
          card.onclick = () => this.switchDistrict(playableSlug);
        }
        const coverSrc = this.coversData && this.coversData[d.slug] ? this.coversData[d.slug] : '';
        const dTitle = zh ? this.zh(d.zh_title || this.getZhBookTitle(playableSlug) || d.title) : d.title;
        const dSub = zh && d.zh_subtitle ? this.zh(d.zh_subtitle) : d.subtitle;
        const primaryRelic = this.tripoManager?.getDistrictPrimaryRelicInfo(playableSlug);
        const isRelicInspected =
          primaryRelic &&
          Array.isArray(this.saveData.relicsInspected) &&
          this.saveData.relicsInspected.includes(primaryRelic.id);
        const relicLineHtml = primaryRelic
          ? `<div class="scroll-relic-badge" style="font-size:0.74rem;margin-top:4px;color:${
              isRelicInspected ? '#f7d88b' : '#bda37c'
            };">🗿 #${primaryRelic.slot || ''} ${primaryRelic.title}${
              isRelicInspected ? (zh ? this.zh(' · ✦ 已瞻仰') : ' · ✦ Inspected') : ''
            }</div>`
          : '';
        card.innerHTML = `
          <div class="scroll-card-cover">
            ${coverSrc ? `<img src="${coverSrc}" alt="${dTitle}" loading="lazy"/>` : ''}
            <span class="scroll-num">#${d.n}</span>
          </div>
          <div class="scroll-card-info">
            <h4>${dTitle}</h4>
            <p>${dSub}</p>
            ${relicLineHtml}
            <span class="scroll-status">${
              isDone
                ? (zh ? this.zh('✦ 已走过（点击进入）') : '✦ Completed (Click to Walk)')
                : isCurrent
                ? (zh ? this.zh('● 当前所在书卷') : '● Walking Now')
                : isUnlocked
                ? (zh ? this.zh('✦ 已开放 — 点击步入街道') : '✦ Open Now — Click to Enter')
                : (zh ? this.zh('🔒 书卷同行模式待解锁') : '🔒 Veiled in Story Walk')
            }</span>
          </div>
        `;
        scrollGrid.appendChild(card);
      });
    }

    // 2. Gatehouse Cover Shelf Modal (Commerce rule §4: shop links live ONLY here at the Gatehouse Cover Shelf)
    const shelfContainer = document.getElementById('shelf-books-grid');
    if (shelfContainer && isModalActive('shelf-modal')) {
      shelfContainer.innerHTML = '';
      this.routeData.forEach((d) => {
        const playableSlug = routeSlugMap[d.slug] || d.slug;
        const mInfo = this.districtMeta[playableSlug] || {};
        const cover =
          this.coversData && this.coversData[d.slug]
            ? this.coversData[d.slug]
            : `assets/${playableSlug}/web/b-${String(d.n).padStart(3, '0')}-000.jpg`;
        const dTitle = zh ? this.zh(d.zh_title || this.getZhBookTitle(playableSlug) || d.title) : d.title;
        const dSub = zh && d.zh_subtitle ? this.zh(d.zh_subtitle) : d.subtitle;
        const item = document.createElement('div');
        item.className = 'shelf-book-card';
        item.innerHTML = `
          <img src="${cover}" alt="${dTitle}" loading="lazy" />
          <div class="shelf-book-meta">
            <h3>#${d.n} · ${dTitle}</h3>
            <p class="shelf-sub">${dSub} · ${zh ? this.zh('Timothy Holt 著') : 'by Timothy Holt'}</p>
            <p class="shelf-desc">${mInfo.amenQuote || this.zh('漫步于油画与诗歌的长街，随时步入发光的画框秘境。')}</p>
            <div class="shelf-links" style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="gold-btn" data-shelf-enter="${playableSlug}">
                ${zh ? this.zh(`✦ 步入第 #${d.n} 卷：《${dTitle}》`) : `✦ Walk District #${d.n}: ${d.title}`}
              </button>
              <a href="https://inspiringyourfaith.org" target="_blank" rel="noopener noreferrer" class="gold-btn">
                ${zh ? this.zh('访问 Timothy Holt 书房 (InspiringYourFaith.org) ↗') : 'Visit Timothy Holt’s Bookshop (InspiringYourFaith.org) ↗'}
              </a>
            </div>
          </div>
        `;
        shelfContainer.appendChild(item);
      });
      shelfContainer.querySelectorAll('[data-shelf-enter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetSlug = btn.getAttribute('data-shelf-enter');
          if (targetSlug) this.switchDistrict(targetSlug);
        });
      });
    }

    // 3. Amen Gate Ceremony Modal
    const amenEyebrow = document.getElementById('amen-modal-eyebrow');
    const amenTitle = document.getElementById('amen-modal-title');
    const amenQuote = document.getElementById('amen-modal-quote');
    const amenCover = document.getElementById('amen-modal-cover');
    const amenDesc = document.getElementById('amen-modal-desc');
    const amenNextBtn = document.getElementById('amen-next-district-btn');

    if (amenEyebrow) {
      amenEyebrow.textContent =
        this.currentDistrictSlug === 'all-things-new'
          ? 'AMEN GATE · DISTRICT XLIV COMPLETED · THE GREAT LANTERN'
          : `AMEN GATE · DISTRICT ${meta.num} COMPLETED`;
    }
    if (amenTitle) {
      amenTitle.textContent =
        this.currentDistrictSlug === 'all-things-new'
          ? `${this.manifest.title} — All 44 Books Completed`
          : `${this.manifest.title} — Completed`;
    }
    if (amenQuote) {
      amenQuote.textContent = meta.amenQuote;
    }
    if (amenCover) {
      amenCover.src = this.manifest.cover;
    }
    if (amenDesc) {
      amenDesc.innerHTML =
        this.currentDistrictSlug === 'all-things-new'
          ? `The Great Lantern shines at full radiance beneath the Tree of Life, and the Stone Bench by the River of Water of Life answers the Sabbath Bench where your walk began in Genesis. <em>${this.manifest.title}</em> now rests on the Gatehouse Cover Shelf. Return to <strong>${meta.nextLabel}</strong>.`
          : `Your lantern shines brighter, and <em>${this.manifest.title}</em> now rests on the Gatehouse Cover Shelf. Next on your pilgrimage: <strong>${meta.nextLabel}</strong>.`;
    }
    if (amenNextBtn) {
      amenNextBtn.textContent =
        this.currentDistrictSlug === 'all-things-new'
          ? `✦ Return to ${meta.nextLabel} →`
          : `✦ Continue to ${meta.nextLabel} →`;
    }

    // 4. The Relic Workshop Modal
    if (isModalActive('tripo-modal')) {
      this.renderTripoWorkshopModal();
    }
  }

  renderTripoWorkshopModal() {
    const container = document.getElementById('tripo-relics-list');
    if (!container || !this.tripoManager || !this.tripoManager.manifest) return;

    const allModels = this.tripoManager.manifest.models || [];
    const relicCount = allModels.length;
    const eyebrowEl = document.getElementById('workshop-modal-eyebrow');
    const titleEl = document.getElementById('workshop-modal-title');
    if (eyebrowEl) {
      eyebrowEl.textContent = `THE RELIC WORKSHOP · ${relicCount} SACRED HERO RELICS · RELIC MAKER PIPELINE`;
    }
    if (titleEl) {
      titleEl.textContent = `The Relic Workshop (${relicCount} Relics)`;
    }

    const activeFilter = this._workshopFilter || 'all';
    const searchQuery = (this._workshopSearch || '').trim().toLowerCase();
    const inspectedSet = new Set(Array.isArray(this.saveData.relicsInspected) ? this.saveData.relicsInspected : []);

    // Wire filter buttons & search input once
    const filterContainer = document.getElementById('tripo-filter-pills');
    if (filterContainer) {
      filterContainer.querySelectorAll('[data-relic-filter]').forEach((btn) => {
        const fKey = btn.getAttribute('data-relic-filter');
        if (fKey === 'inspected') {
          btn.textContent = `✦ Inspected (${inspectedSet.size}/${relicCount})`;
        }
        const isAct = fKey === activeFilter;
        btn.style.background = isAct
          ? 'linear-gradient(135deg, #d7ab61 0%, #b58338 100%)'
          : '';
        btn.style.color = isAct ? '#1c1309' : '';
        if (!btn.dataset.boundFilter) {
          btn.dataset.boundFilter = '1';
          btn.addEventListener('click', () => {
            this._workshopFilter = fKey;
            this.renderTripoWorkshopModal();
          });
        }
      });
    }

    const searchInput = document.getElementById('tripo-search-input');
    if (searchInput && !searchInput.dataset.boundSearch) {
      searchInput.dataset.boundSearch = '1';
      searchInput.addEventListener('input', () => {
        this._workshopSearch = searchInput.value || '';
        this.renderTripoWorkshopModal();
      });
    }

    const filteredModels = allModels.filter((m) => {
      const loc = this.tripoManager.getRelicLocationInfo(m.id);
      if (activeFilter === 'current' && loc && loc.slug !== this.currentDistrictSlug) {
        return false;
      }
      if (activeFilter === 'inspected' && !inspectedSet.has(m.id)) {
        return false;
      }
      if (activeFilter === 'concept' && (!loc || !loc.isConceptModeled)) {
        return false;
      }
      if (activeFilter === 'muse' && (!loc || !loc.isMuseLane)) {
        return false;
      }
      if (activeFilter === 'flagged' && (!loc || !loc.isSourceFlagged)) {
        return false;
      }
      if (searchQuery) {
        const hay = `${m.slot} #${m.slot} ${m.title} ${m.district} ${m.id} ${m.imageTo3DTip || ''}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });

    container.innerHTML = '';
    filteredModels.forEach((m) => {
      const status = this.tripoManager.statusMap.get(m.id) || 'procedural';
      const isLoaded = status === 'loaded';
      const loc = this.tripoManager.getRelicLocationInfo(m.id);
      const isInspected = inspectedSet.has(m.id);

      let extraBadges = '';
      if (isInspected) {
        extraBadges += `<span class="relic-inspected-badge" style="font-size:0.76rem;font-weight:bold;padding:3px 9px;border-radius:99px;background:#8c6822;color:#fff7e2;">✦ Inspected</span>`;
      }
      if (loc && loc.isConceptModeled) {
        extraBadges += `<span style="font-size:0.76rem;font-weight:bold;padding:3px 9px;border-radius:99px;background:#7a4b1e;color:#fff4dc;">† Concept-Modeled</span>`;
      }
      if (loc && loc.isMuseLane) {
        extraBadges += `<span style="font-size:0.76rem;font-weight:bold;padding:3px 9px;border-radius:99px;background:#2b4c6f;color:#eef6ff;">✦ Muse Lane</span>`;
      }
      if (loc && loc.isSourceFlagged) {
        extraBadges += `<span style="font-size:0.76rem;font-weight:bold;padding:3px 9px;border-radius:99px;background:#6e3b3b;color:#ffecec;">⚑ Source Painting Flagged</span>`;
      }

      const card = document.createElement('div');
      card.className = 'shelf-book-card';
      card.style.marginTop = '0';
      card.innerHTML = `
        <img src="${m.paintingRef}" alt="${m.title}" style="width:128px;height:128px;" loading="lazy" />
        <div class="shelf-book-meta" style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <h3 style="font-size:1.15rem;">#${m.slot} · ${m.title}</h3>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              ${extraBadges}
              <span style="font-size:0.8rem;font-weight:bold;padding:3px 10px;border-radius:99px;background:${
                isLoaded ? '#2e4d28' : '#524024'
              };color:#f7eedc;">
                ${isLoaded ? '✦ Relic .glb Active' : '● Painterly Procedural Active (Ready for .glb)'}
              </span>
            </div>
          </div>
          <p class="shelf-sub" style="margin:3px 0 6px;">${m.district} · Target file: <code>${m.file}</code></p>
          <p class="shelf-desc" style="font-size:0.88rem;margin-bottom:8px;"><strong>Relic Maker Note:</strong> ${m.imageTo3DTip}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="gold-btn" data-preview-relic="${m.id}" style="padding:6px 13px;font-size:0.84rem;">
              🔍 Spin 3D Relic
            </button>
            <button type="button" class="gold-btn" data-visit-relic="${m.id}" style="padding:6px 13px;font-size:0.84rem;">
              ✦ Stand Before Relic in 3D
            </button>
            <a href="${m.paintingRef}" download="${m.id}-reference.jpg" class="gold-btn" style="padding:6px 13px;font-size:0.84rem;">
              ⬇ Download Reference Painting
            </a>
            <button type="button" class="gold-btn" data-copy-prompt="${encodeURIComponent(m.textPrompt)}" style="padding:6px 13px;font-size:0.84rem;">
              📋 Copy Reference Prompt
            </button>
            <label class="gold-btn" style="padding:6px 13px;font-size:0.84rem;cursor:pointer;">
              ⚡ Test .glb File Live
              <input type="file" accept=".glb,.gltf" data-upload-glb="${m.id}" style="display:none;" />
            </label>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('[data-preview-relic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const relicId = btn.getAttribute('data-preview-relic');
        this.previewRelicOnTurntable(relicId);
      });
    });

    container.querySelectorAll('[data-visit-relic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const relicId = btn.getAttribute('data-visit-relic');
        this.standBeforeRelicIn3D(relicId);
      });
    });

    container.querySelectorAll('[data-copy-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = decodeURIComponent(btn.getAttribute('data-copy-prompt'));
        navigator.clipboard?.writeText(prompt);
        this.showToast('Copied Relic Maker reference prompt to clipboard!');
      });
    });

    container.querySelectorAll('[data-upload-glb]').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        const relicId = input.getAttribute('data-upload-glb');
        if (!file || !relicId) return;
        this.showToast(`Loading ${file.name} into slot "${relicId}" with Painterly Shader…`);
        const ok = await this.tripoManager.loadGlbFromFile(relicId, file);
        if (ok) {
          this.renderTripoWorkshopModal();
          this.showToast(`✦ Hot-swapped ${file.name} into the 3D world! Save as assets/models/${relicId}.glb to make permanent.`);
        } else {
          this.showToast(`Could not parse ${file.name} as GLB/GLTF.`);
        }
      });
    });
  }

  stopTurntableLoop() {
    if (this._turntableRafId) {
      cancelAnimationFrame(this._turntableRafId);
      this._turntableRafId = null;
    }
  }

  async previewRelicOnTurntable(relicId) {
    if (!relicId || !this.tripoManager) return;
    const item = this.tripoManager.relicById?.get(relicId);
    if (!item) return;

    this.markRelicInspected(relicId, true);
    this.renderTripoWorkshopModal();

    const stageEl = document.getElementById('tripo-turntable-stage');
    const canvasEl = document.getElementById('tripo-turntable-canvas');
    const titleEl = document.getElementById('tripo-turntable-title');
    const distEl = document.getElementById('tripo-turntable-district');
    const noteEl = document.getElementById('tripo-turntable-note');
    const visitBtn = document.getElementById('tripo-turntable-visit-btn');
    const closeBtn = document.getElementById('tripo-turntable-close-btn');

    if (!stageEl || !canvasEl) return;

    if (titleEl) titleEl.textContent = `#${item.slot} · ${item.title}`;
    if (distEl) distEl.textContent = `${item.district} · ${item.file}`;
    if (noteEl) noteEl.textContent = item.imageTo3DTip || '';
    if (visitBtn) {
      visitBtn.onclick = () => this.standBeforeRelicIn3D(relicId);
    }
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.stopTurntableLoop();
        stageEl.classList.add('hidden');
      };
    }

    stageEl.classList.remove('hidden');
    stageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (!this._turntable) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#19120b');
      const camera = new THREE.PerspectiveCamera(42, canvasEl.width / canvasEl.height, 0.1, 50);
      camera.position.set(0, 2.25, 5.4);
      camera.lookAt(0, 1.25, 0);

      const hemi = new THREE.HemisphereLight('#f8e4be', '#5e462d', 1.85);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight('#ffdf9e', 2.2);
      dir.position.set(3.5, 6.0, 4.5);
      scene.add(dir);
      const rim = new THREE.PointLight('#f3be68', 1.5, 12);
      rim.position.set(-3.2, 2.8, -2.8);
      scene.add(rim);

      const pedestal = new THREE.Group();
      const basePlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.52, 0.28, 28),
        this.painterly.createPainterlyMaterial({
          baseColor: '#7d674d',
          accentColor: '#c8a36a',
          roughness: 0.85
        })
      );
      basePlinth.position.y = 0.14;
      const goldRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.36, 0.04, 10, 32),
        this.painterly.createPainterlyMaterial({
          baseColor: '#d9af62',
          accentColor: '#fff0c4',
          roughness: 0.35
        })
      );
      goldRing.rotation.x = Math.PI / 2;
      goldRing.position.y = 0.28;
      pedestal.add(basePlinth, goldRing);
      scene.add(pedestal);

      const modelRoot = new THREE.Group();
      modelRoot.position.y = 0.28;
      scene.add(modelRoot);

      const ctx2d = canvasEl.getContext('2d');

      this._turntable = {
        scene,
        camera,
        pedestal,
        modelRoot,
        ctx2d,
        yaw: 0.35,
        zoom: 4.8,
        isDragging: false,
        lastX: 0
      };

      canvasEl.addEventListener('mousedown', (e) => {
        this._turntable.isDragging = true;
        this._turntable.lastX = e.clientX;
      });
      window.addEventListener('mouseup', () => {
        if (this._turntable) this._turntable.isDragging = false;
      });
      window.addEventListener('mousemove', (e) => {
        if (this._turntable && this._turntable.isDragging) {
          const dx = e.clientX - this._turntable.lastX;
          this._turntable.lastX = e.clientX;
          this._turntable.yaw += dx * 0.012;
        }
      });
      canvasEl.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          this._turntable.zoom = Math.max(2.8, Math.min(8.5, this._turntable.zoom + e.deltaY * 0.004));
        },
        { passive: false }
      );
    }

    const tt = this._turntable;
    while (tt.modelRoot.children.length > 0) {
      tt.modelRoot.remove(tt.modelRoot.children[0]);
    }
    const fallbackCrystal = new THREE.Group();
    const fallbackMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 1),
      this.painterly.createPainterlyMaterial({
        baseColor: '#d8b068',
        accentColor: '#fff1c4',
        roughness: 0.4
      })
    );
    fallbackMesh.position.y = 0.85;
    fallbackCrystal.add(fallbackMesh);
    tt.modelRoot.add(fallbackCrystal);

    this.tripoManager.mountRelic(tt.modelRoot, relicId, {
      scale: 0.88,
      yOffset: 0.0
    });
    await this.tripoManager.ensureRelicLoaded(relicId);

    this.stopTurntableLoop();
    const renderStep = () => {
      if (stageEl.classList.contains('hidden') || !this.isAnyModalOpen()) {
        this._turntableRafId = null;
        return;
      }
      this._turntableRafId = requestAnimationFrame(renderStep);
      if (!tt.isDragging) {
        tt.yaw += 0.012;
      }
      tt.modelRoot.rotation.y = tt.yaw;
      tt.pedestal.rotation.y = tt.yaw;
      tt.camera.position.set(0, 2.15, tt.zoom);
      tt.camera.lookAt(0, 1.25, 0);
      if (this.renderer && tt.ctx2d) {
        this.renderer.setRenderTarget(null);
        this.renderer.render(tt.scene, tt.camera);
        tt.ctx2d.clearRect(0, 0, canvasEl.width, canvasEl.height);
        tt.ctx2d.drawImage(this.canvas, 0, 0, canvasEl.width, canvasEl.height);
        if (this.postProcess) {
          this.postProcess.render(this.scene, this.camera, this.clock.getElapsedTime());
        }
      }
    };
    renderStep();
  }

  capturePilgrimPostcard() {
    if (!this.renderer || !this.scene || !this.camera) return null;
    const elapsed = this.clock ? this.clock.getElapsedTime() : 0;
    const bobOffset = this.reducedMotion ? 0 : Math.sin(this.player.bobPhase || 0) * 0.045;
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y + bobOffset,
      this.player.position.z
    );
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;
    if (this.skyDome) {
      this.skyDome.position.copy(this.player.position);
      if (this.skyDome.material?.uniforms?.uTime) {
        this.skyDome.material.uniforms.uTime.value = elapsed;
      }
    }
    if (this.postProcess) {
      this.postProcess.render(this.scene, this.camera, elapsed);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    const zh = this.isZh();
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    const bookHeading =
      this.mode === 'GATEHOUSE'
        ? (zh ? this.zh('天路同行 · 3D 城门庭院（全部 44 卷书门）') : 'The Pilgrim Walk · 3D Gatehouse Courtyard (All 44 Books)')
        : (zh ? `第 ${meta.num} 卷 · 《${this.getZhBookTitle(this.currentDistrictSlug)}》` : `District ${meta.num} · ${meta.fullLabel}`);

    let subHeading = '';
    if (this.mode === 'SCENE' && this.activeSceneObj && this.activeSceneObj.paintingData) {
      const p = this.activeSceneObj.paintingData;
      const pTitle = zh && p.zh_title ? this.zh(p.zh_title) : p.title;
      const pRef = zh && p.zh_ref ? this.zh(p.zh_ref) : p.ref;
      subHeading = `No. ${p.n} · “${pTitle}” (${pRef})`;
    } else if (this.district && this.district.paintingNodes && this.district.paintingNodes.length > 0) {
      let nearest = this.district.paintingNodes[0];
      let bestD = Infinity;
      for (const n of this.district.paintingNodes) {
        const d = Math.hypot(this.player.position.x - n.position.x, this.player.position.z - n.position.z);
        if (d < bestD) {
          bestD = d;
          nearest = n;
        }
      }
      if (nearest && nearest.data) {
        const p = nearest.data;
        const pTitle = zh && p.zh_title ? this.zh(p.zh_title) : p.title;
        const pRef = zh && p.zh_ref ? this.zh(p.zh_ref) : p.ref;
        subHeading = `No. ${p.n} · “${pTitle}” (${pRef})`;
      }
    }

    const quoteLine = meta.amenQuote || '“Your word is a lamp to my feet, and a light for my path.”';

    const outCanvas = document.createElement('canvas');
    outCanvas.width = 1600;
    outCanvas.height = 1040;
    const ctx = outCanvas.getContext('2d');

    // Warm archival parchment background & double-gold rules
    ctx.fillStyle = '#f4ead5';
    ctx.fillRect(0, 0, 1600, 1040);

    ctx.strokeStyle = '#b68942';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 1552, 992);
    ctx.strokeStyle = '#d6b47c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(34, 34, 1532, 972);

    // Draw the live 3D painterly viewport into the upper frame
    try {
      ctx.drawImage(this.canvas, 48, 48, 1504, 800);
    } catch (_) {}

    ctx.strokeStyle = '#9e7432';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 1504, 800);

    // Calligraphed keepsake inscriptions in the bottom parchment margin
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2d1e10';
    ctx.font = 'bold 30px Georgia, "Songti SC", serif';
    ctx.fillText(bookHeading, 800, 892);

    if (subHeading) {
      ctx.fillStyle = '#6e4d25';
      ctx.font = 'italic 23px Georgia, "Songti SC", serif';
      ctx.fillText(subHeading, 800, 928);
    }

    ctx.fillStyle = '#3d2b18';
    ctx.font = 'italic 19px Georgia, "Songti SC", serif';
    ctx.fillText(quoteLine.slice(0, 128), 800, 962);

    ctx.fillStyle = '#826138';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('THE PILGRIM WALK · POEMS & PICTURES BY TIMOTHY HOLT · INSPIRINGYOURFAITH.ORG', 800, 994);

    let dataUrl = '';
    try {
      dataUrl = outCanvas.toDataURL('image/png');
      this._lastPostcardDataUrl = dataUrl;
      const a = document.createElement('a');
      const slugPart = this.mode === 'GATEHOUSE' ? 'gatehouse-courtyard' : this.currentDistrictSlug;
      a.href = dataUrl;
      a.download = `pilgrim-walk-postcard-${slugPart}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Postcard export note:', err);
    }

    this.audio.playLightChime(0.75, false);
    this.showToast(
      zh
        ? this.zh(`📷 已保存天路留念明信片：${bookHeading}${subHeading ? ` · ${subHeading}` : ''}`)
        : `📷 Saved Pilgrim’s Postcard: ${bookHeading}${subHeading ? ` · ${subHeading}` : ''}`
    );
    return dataUrl;
  }

  showToast(msg) {
    const toast = document.getElementById('pilgrim-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 4200);
  }

  // ==========================================================================
  // ONE-TIME INTRO AUDIBLE NARRATOR & HOW-TO-PLAY GUIDE
  // ==========================================================================
  getIntroWelcomeText() {
    if (this.isZh()) {
      return this.zh(
        '欢迎你，天路客，来到《天路同行》——这是一座穿越圣经四十四卷书的彩绘灵修圣所，从创世记的黎明一直延伸到启示录的新耶路撒冷。以下是漫步与享受这个世界的方式：使用 W、A、S、D 键或方向键，在移动端也可使用触控摇杆，沿着灯火辉映的书卷长街缓步前行。在任意一幅画作前驻足，即可阅读经文与诗歌；按下 R 键，便可聆听完整的有声灵修默想。留意那些闪耀着金色光芒的画框：走近并按下 E 键，即可步入一百七十五处沉浸式三维步入画境。在剧情漫步模式中，寻访每一篇章隐藏的圣所之光，按下 F 键将其点亮，开启下一道拱门；若想自由探索，也可随时点击顶部导航栏切换为自由漫步模式。旅途之中，按 J 键可点亮每日同行烛光，在三维工坊中鉴赏五十三件圣经圣物雕塑，也可随时按 P 键珍藏天路明信片。请放慢脚步，静心呼吸，在光中同行。'
      );
    }
    return 'Welcome, pilgrim, to The Pilgrim Walk — a living painted sanctuary through forty-four books of Scripture, from the dawn of Genesis to the New Jerusalem of Revelation. Here is how to walk and enjoy this world: Move gently down each lantern-lit Book Street using W, A, S, D, or the Arrow keys — or with the touch joystick on mobile. Pause before any of the sixteen hundred and thirty-one paintings to read its scripture and poem, and press R to hear the full devotional reflection read aloud. Watch for paintings framed in living golden light: approach them and press E to step inside one hundred and seventy-five three-dimensional Step-Through Scenes. In Story Walk mode, seek out the hidden Sanctuary Light in each chapter part and press F to kindle it and unlock the next gate — or toggle Free Walk at the top of the screen whenever you wish to wander without barriers. Along the way, press J to light your Daily Walk candle, inspect the fifty-three sculpted Hero Relics in the 3D Workshop, and press P at any moment to save a keepsake Pilgrim Postcard. Take your time, breathe deeply, and walk in the light.';
  }

  initOneTimeIntroNarrator() {
    this._introSpeaking = false;
    this._introAudioEl = null;
    this.syncIntroNarratorUI();

    if (!this.saveData.introNarrated) {
      const banner = document.getElementById('intro-narrator-banner');
      if (banner) banner.classList.remove('hidden');
    }
  }

  syncIntroNarratorUI() {
    const zh = this.isZh();
    const statusLabel = document.getElementById('intro-narrator-status-label');
    const toggleBtn = document.getElementById('btn-intro-narrator-toggle');
    const dismissBtn = document.getElementById('btn-intro-narrator-dismiss');
    const textEl = document.getElementById('intro-narrator-text');
    const keysEl = document.getElementById('intro-narrator-keys');
    const ghBtn = document.getElementById('gatehouse-btn-listen-intro');
    const ghEyebrow = document.getElementById('gh-howto-eyebrow');
    const ghSub = document.getElementById('gh-howto-sub');

    if (statusLabel) {
      statusLabel.textContent = this._introSpeaking
        ? (zh ? this.zh('🔊 正在播放：天路同行 · 新手漫步有声导览 (Selene)') : '🔊 Playing Now · Welcome & How-to-Play Guide (Selene)')
        : (zh ? this.zh('🔊 天路同行 · 漫步与游玩有声导览 (Selene)') : '🔊 Welcome & How-to-Play Guide · Narrated by Selene');
    }
    if (toggleBtn) {
      toggleBtn.textContent = this._introSpeaking
        ? (zh ? this.zh('⏹ 停止导览语音') : '⏹ Stop Welcome Guide')
        : (zh ? this.zh('🔊 聆听漫步导览') : '🔊 Listen to Welcome Guide');
    }
    if (dismissBtn) {
      dismissBtn.textContent = zh ? this.zh('✕ 收起') : '✕ Dismiss';
    }
    if (textEl) {
      textEl.innerHTML = zh
        ? this.zh('欢迎来到<strong>《天路同行》</strong>——穿越圣经 44 卷书、1,631 幅画作与 175 处 3D 步入画境的彩绘灵修圣所。')
        : 'Welcome, pilgrim, to <em>The Pilgrim Walk</em> — a living painted sanctuary through 44 books of Scripture, 1,631 paintings, and 175 3D Step-Through Scenes.';
    }
    if (keysEl) {
      keysEl.innerHTML = zh
        ? this.zh('<strong>WASD / 方向键</strong>（或触控摇杆）：漫步 · <strong>[R]</strong>：品读诗歌与聆听朗读 · <strong>[E]</strong>：步入发光画框 · <strong>[F]</strong>：点亮圣所之光（或切换自由漫步） · <strong>[J]</strong>：每日同行烛光 · <strong>[P]</strong>：保存天路明信片')
        : '<strong>WASD / Arrows</strong> (or Touch Joystick): Walk · <strong>[R]</strong>: Read Poem &amp; Listen · <strong>[E]</strong>: Step Inside 175 Glowing Paintings · <strong>[F]</strong>: Kindle Sanctuary Lights (or toggle Free Walk) · <strong>[J]</strong>: Daily Walk Candle · <strong>[P]</strong>: Save Postcard';
    }
    if (ghBtn) {
      ghBtn.textContent = this._introSpeaking
        ? (zh ? this.zh('⏹ 停止漫步有声导览 (Selene)') : '⏹ Stop Welcome & How-to-Play Guide')
        : (zh ? this.zh('🔊 聆听天路漫步与游玩有声导览 (Selene)') : '🔊 Listen to Welcome & How-to-Play Guide');
    }
    if (ghEyebrow) {
      ghEyebrow.textContent = zh
        ? this.zh('✦ 有声迎宾导览 · 如何漫步与享受《天路同行》')
        : '✦ AUDIBLE WELCOME GUIDE · HOW TO WALK & ENJOY';
    }
    if (ghSub) {
      ghSub.textContent = zh
        ? this.zh('随时聆听 Selene 温柔讲解如何漫步 44 卷书街、步入 3D 画境、点亮圣所之光与鉴赏圣物。')
        : 'Hear Selene’s narrated introduction to walking the 44 Book Streets, stepping inside paintings, and kindling Sanctuary Lights.';
    }
  }

  toggleIntroWelcomeNarration() {
    if (this._introSpeaking) {
      this.stopIntroWelcomeNarration();
    } else {
      this.playIntroWelcomeNarration();
    }
  }

  dismissIntroWelcomeBanner() {
    this.stopIntroWelcomeNarration();
    if (!this.saveData.introNarrated) {
      this.saveData.introNarrated = true;
      this.persistSaveData();
    }
    const banner = document.getElementById('intro-narrator-banner');
    if (banner) banner.classList.add('hidden');
  }

  stopIntroWelcomeNarration() {
    this._introSpeaking = false;
    if (this._introAudioEl) {
      try {
        this._introAudioEl.pause();
        this._introAudioEl.currentTime = 0;
      } catch (_) {}
      this._introAudioEl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (this.audio && typeof this.audio.setVoiceDucking === 'function') {
      this.audio.setVoiceDucking(false);
    }
    this.syncIntroNarratorUI();
  }

  async playIntroWelcomeNarration() {
    if (this.dailyWalk && typeof this.dailyWalk.stopActiveVoice === 'function') {
      this.dailyWalk.stopActiveVoice();
    }
    this.stopIntroWelcomeNarration();

    if (!this.saveData.introNarrated) {
      this.saveData.introNarrated = true;
      this.persistSaveData();
    }

    const banner = document.getElementById('intro-narrator-banner');
    if (banner) banner.classList.remove('hidden');

    if (this.audio) {
      this.audio.init();
      if (typeof this.audio.setVoiceDucking === 'function') {
        this.audio.setVoiceDucking(true);
      }
    }

    this._introSpeaking = true;
    this.syncIntroNarratorUI();

    const zh = this.isZh();
    const audioUrl = zh
      ? 'assets/audio/selene-zh/intro-welcome.m4a'
      : 'assets/audio/selene/intro-welcome.m4a';

    try {
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.volume = this.audio ? this.audio.getEffectiveVoiceVolume() : 1.0;
      this._introAudioEl = audio;

      audio.onended = () => {
        this._introSpeaking = false;
        this._introAudioEl = null;
        if (this.audio && typeof this.audio.setVoiceDucking === 'function') {
          this.audio.setVoiceDucking(false);
        }
        this.syncIntroNarratorUI();
      };

      audio.onerror = () => {
        if (this._introSpeaking) {
          this._playIntroWelcomeSpeechFallback();
        }
      };

      await audio.play();
      return true;
    } catch (_) {
      return this._playIntroWelcomeSpeechFallback();
    }
  }

  _playIntroWelcomeSpeechFallback() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this._introSpeaking = false;
      if (this.audio && typeof this.audio.setVoiceDucking === 'function') {
        this.audio.setVoiceDucking(false);
      }
      this.syncIntroNarratorUI();
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(this.getIntroWelcomeText());
      const zh = this.isZh();
      utter.lang = zh ? (this.lang === 'zh-TW' ? 'zh-TW' : 'zh-CN') : 'en-US';
      utter.rate = zh ? 0.94 : 0.92;
      utter.pitch = 1.02;
      utter.volume = this.audio ? this.audio.getEffectiveVoiceVolume() : 1.0;
      utter.onend = () => {
        this._introSpeaking = false;
        if (this.audio && typeof this.audio.setVoiceDucking === 'function') {
          this.audio.setVoiceDucking(false);
        }
        this.syncIntroNarratorUI();
      };
      utter.onerror = () => {
        this._introSpeaking = false;
        if (this.audio && typeof this.audio.setVoiceDucking === 'function') {
          this.audio.setVoiceDucking(false);
        }
        this.syncIntroNarratorUI();
      };
      window.speechSynthesis.speak(utter);
      return true;
    } catch (_) {
      this._introSpeaking = false;
      this.syncIntroNarratorUI();
      return false;
    }
  }

  // ==========================================================================
  // MAIN GAME LOOP: Movement, Lantern Proximity Glow, Palette Color Grading
  // ==========================================================================
  startRenderLoop() {
    if (this._isLoopRunning || document.hidden) return;
    this._isLoopRunning = true;
    this.clock.getDelta();
    this._lastFrameTime = performance.now();
    this._rafId = requestAnimationFrame((now) => this.animate(now));
  }

  stopRenderLoop() {
    this._isLoopRunning = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  animate(now = performance.now()) {
    if (!this._isLoopRunning || document.hidden) {
      this._isLoopRunning = false;
      this._rafId = null;
      return;
    }

    this._rafId = requestAnimationFrame((nextNow) => this.animate(nextNow));

    // Suspend 3D world updates and postprocessing while a reading modal covers the world,
    // preserving the last rendered frame behind translucent backdrops and resuming cleanly without jumps
    const modalOpen = this.isAnyModalOpen();
    if (modalOpen) {
      this.clock.getDelta();
      if (!this._wasModalOpen || this._needsRender) {
        this._wasModalOpen = true;
        this._needsRender = false;
        this.postProcess.render(this.scene, this.camera, this.clock.getElapsedTime());
      }
      return;
    }
    if (this._wasModalOpen) {
      this._wasModalOpen = false;
      this.clock.getDelta(); // Flush delta so closing a modal never causes a movement jump
      this._lastFrameTime = now;
    }

    // Enforce frame-rate cap in Balanced (30 FPS) and Eco (30 FPS) while keeping High Quality uncapped
    const minInterval = this.getTargetFrameIntervalMs(this.graphicsQuality);
    if (minInterval > 0) {
      const elapsedSinceLast = now - this._lastFrameTime;
      if (elapsedSinceLast < minInterval - 0.5) return;
      this._lastFrameTime = now - (elapsedSinceLast % minInterval);
    }

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.skyDome.position.copy(this.player.position);
    this.skyDome.material.uniforms.uTime.value = elapsed;

    if (this.propBuilder) {
      this.propBuilder.updateWindShaders(elapsed);
    }

    this.updateMovement(dt, elapsed);
    this.updateWorldAndInteractions(dt, elapsed);

    this.postProcess.render(this.scene, this.camera, elapsed);
  }

  updateMovement(dt, elapsed) {
    if (this.isAnyModalOpen()) return;

    let forward = 0;
    let strafe = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;

    forward += this.touchMove.y;
    strafe += this.touchMove.x;

    const len = Math.hypot(forward, strafe);
    if (len > 1) {
      forward /= len;
      strafe /= len;
    }

    if (len > 0.02) {
      const sinY = Math.sin(this.player.yaw);
      const cosY = Math.cos(this.player.yaw);
      const moveX = (-sinY * forward + cosY * strafe) * this.player.speed * dt;
      const moveZ = (-cosY * forward - sinY * strafe) * this.player.speed * dt;

      const nextX = this.player.position.x + moveX;
      const nextZ = this.player.position.z + moveZ;

      if (this.mode === 'GATEHOUSE' && this.gatehouseHubWorld) {
        const clampedZ = Math.max(this.gatehouseHubWorld.minZ, Math.min(this.gatehouseHubWorld.maxZ, nextZ));
        const clampedX = Math.max(-13.5, Math.min(13.5, nextX));
        this.player.position.x = clampedX;
        this.player.position.z = clampedZ;
        this.player.position.y = 1.72;
      } else if (this.mode === 'STREET' && this.district) {
        // In Story Walk mode, each part's veil blocks passage until that part's Light is kindled
        const defaultMinZ = this.district.amenPlaza ? this.district.amenPlaza.position.z - 6 : -444;
        const blockingVeil = this.getFirstBlockingVeil();
        const minZ = blockingVeil ? Math.max(defaultMinZ, blockingVeil.veilZ + 1.15) : defaultMinZ;
        const clampedZ = Math.max(minZ, Math.min(20, nextZ));
        const pathPt = this.districtBuilder.getPathPoint(clampedZ);
        // Allow roaming up to 11.5m left/right of the road center to explore paintings, trees & sanctuary lights
        const maxLateral = 11.5;
        const clampedX = Math.max(pathPt.x - maxLateral, Math.min(pathPt.x + maxLateral, nextX));
        this.player.position.x = clampedX;
        this.player.position.z = clampedZ;
        this.player.position.y = pathPt.y + 1.72;
      } else if (this.mode === 'SCENE') {
        // Inside Step-Through Scene: allow walking freely within 22m radius
        const distFromCenter = Math.hypot(nextX, nextZ);
        if (distFromCenter < 21.5) {
          this.player.position.x = nextX;
          this.player.position.z = nextZ;
        }
      }

      if (!this.reducedMotion) {
        this.player.bobPhase += dt * 8.5 * len;
      }
    }

    const bobOffset = this.reducedMotion ? 0 : Math.sin(this.player.bobPhase) * 0.045;
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y + bobOffset,
      this.player.position.z
    );
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;

    // Position Pilgrim's Lantern slightly ahead and right of camera
    this.lanternLight.position.set(
      this.player.position.x - Math.sin(this.player.yaw - 0.35) * 0.8,
      this.player.position.y - 0.15,
      this.player.position.z - Math.cos(this.player.yaw - 0.35) * 0.8
    );
  }

  _setPromptUI(hidden, primaryText = '', secondaryHidden = true, secondaryText = '') {
    if (!this._domCache.promptContainer) {
      this._domCache.promptContainer = document.getElementById('interaction-bar');
      this._domCache.promptBtn = document.getElementById('interact-prompt-btn');
      this._domCache.secondaryBtn = document.getElementById('read-poem-secondary-btn');
    }
    const { promptContainer, promptBtn, secondaryBtn } = this._domCache;
    if (promptBtn && !hidden && this._uiState.promptText !== primaryText) {
      promptBtn.textContent = primaryText;
      this._uiState.promptText = primaryText;
    }
    if (promptContainer && this._uiState.promptHidden !== hidden) {
      promptContainer.classList.toggle('hidden', hidden);
      this._uiState.promptHidden = hidden;
    }
    if (secondaryBtn) {
      if (!secondaryHidden && this._uiState.secondaryText !== secondaryText) {
        secondaryBtn.textContent = secondaryText;
        this._uiState.secondaryText = secondaryText;
      }
      if (this._uiState.secondaryHidden !== secondaryHidden) {
        secondaryBtn.classList.toggle('hidden', secondaryHidden);
        this._uiState.secondaryHidden = secondaryHidden;
      }
    }
  }

  _setLanternUI(opacityStr, textStr) {
    if (!this._domCache.lanternIndicator) {
      this._domCache.lanternIndicator = document.getElementById('lantern-glow-indicator');
    }
    const el = this._domCache.lanternIndicator;
    if (!el) return;
    if (this._uiState.lanternOpacity !== opacityStr) {
      el.style.opacity = opacityStr;
      this._uiState.lanternOpacity = opacityStr;
    }
    if (this._uiState.lanternText !== textStr) {
      el.textContent = textStr;
      this._uiState.lanternText = textStr;
    }
  }

  updateWorldAndInteractions(dt = 0.016, elapsed = 0) {
    this.currentInteractTarget = null;

    // ========================================================================
    // 3D WALKABLE GATEHOUSE COURTYARD MODE (All 44 Book Gates)
    // ========================================================================
    if (this.mode === 'GATEHOUSE' && this.gatehouseHubWorld) {
      if (this.gatehouseHubWorld.riverMat) {
        this.gatehouseHubWorld.riverMat.uniforms.uTime.value = elapsed;
        this.gatehouseHubWorld.riverMat.uniforms.uCameraPos.value.copy(this.camera.position);
      }

      // Warm golden-hour courtyard sky palette (using pre-allocated Color instances)
      const lerpAlpha = Math.min(1, dt * 1.5);
      this.skyDome.material.uniforms.uTopColor.value.lerp(this._ghTopColor, lerpAlpha);
      this.skyDome.material.uniforms.uHorizonColor.value.lerp(this._ghHorizonColor, lerpAlpha);
      this.skyDome.material.uniforms.uGroundColor.value.lerp(this._ghGroundColor, lerpAlpha);
      this.skyDome.material.uniforms.uAccentColor.value.lerp(this._ghAccentColor, lerpAlpha);
      this.scene.fog.color.lerp(this._ghFogColor, lerpAlpha);

      let nearestGate = null;
      let nearestGateDist = Infinity;
      for (const g of this.gatehouseHubWorld.gateNodes) {
        const d = Math.hypot(
          this.player.position.x - g.position.x,
          this.player.position.z - g.position.z
        );
        if (d < 28 && g.relicId && !g._relicEnsureTriggered && this.tripoManager) {
          g._relicEnsureTriggered = true;
          this.tripoManager.ensureRelicLoaded(g.relicId);
        }
        if (d < nearestGateDist) {
          nearestGateDist = d;
          nearestGate = g;
        }
      }

      if (nearestGate && nearestGateDist < 4.5) {
        this.currentInteractTarget = { type: 'ENTER_BOOK_GATE', gate: nearestGate };
        const b = nearestGate.bookData;
        const isGateOpen = nearestGate.playableSlug && this.isDistrictUnlocked(nearestGate.playableSlug);
        const relicNote = nearestGate.relicTitle ? ` · 🗿 ${nearestGate.relicTitle}` : '';
        const label = isGateOpen
          ? `✦ Step Through Book Gate #${b.n} · “${b.title}” (${b.subtitle})${relicNote} [E]`
          : `🔒 Book Gate #${b.n} · “${b.title}”${relicNote} — Complete previous District or switch to Free Walk [E]`;
        this._setPromptUI(false, label, true);
      } else {
        this._setPromptUI(true);
      }
      return;
    }

    if (!this.district) return;

    if (this.mode === 'SCENE' && this.activeSceneObj) {
      const sc = this.activeSceneObj;
      if (sc.motes && sc.motes.userData.updateMotes) {
        sc.motes.userData.updateMotes(elapsed);
      }

      // Check distance to signature symbolic element
      const distToSig = Math.hypot(
        this.player.position.x - sc.signatureTarget.x,
        this.player.position.z - sc.signatureTarget.z
      );
      if (sc.updateScene) {
        sc.updateScene(dt, elapsed, distToSig, this.skyDome, this.camera.position);
      }

      // Check distance to Lit Exit Doorway (§5b generous trigger radius)
      const distToExit = Math.hypot(
        this.player.position.x - sc.exitPosition.x,
        this.player.position.z - sc.exitPosition.z
      );
      // Automatic walk-through if stepping right into the exit doorway arch (< 1.35m)
      if (distToExit < 1.35) {
        this.exitStepThroughSceneToStreet();
        return;
      }

      // Check distance to Anchor Painting inside scene
      const distToAnchor = Math.hypot(
        this.player.position.x - sc.anchorPosition.x,
        this.player.position.z - sc.anchorPosition.z
      );

      if (distToExit < 3.4) {
        this.currentInteractTarget = { type: 'EXIT_SCENE' };
        const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
        this._setPromptUI(false, `← Step Back to ${meta.shortName} Street [E]`, true);
      } else if (distToSig < sc.signatureRadius) {
        this.currentInteractTarget = {
          type: 'SIGNATURE_ELEMENT',
          text: sc.signatureActivatedText
        };
        this._setPromptUI(false, `✦ ${sc.signatureLabel} [E]`, true);
      } else if (distToAnchor < 3.5) {
        this.currentInteractTarget = {
          type: 'READ_POEM',
          node: { data: sc.paintingData }
        };
        this._setPromptUI(false, `Read Poem · “${sc.paintingData.title}” (${sc.paintingData.ref}) [E]`, true);
      } else {
        this._setPromptUI(true);
      }
      return;
    }

    // ========================================================================
    // STREET MODE: Dynamic Palette Sampling, Hidden Light Sensing, Painting Prompts
    // ========================================================================
    if (this.district.riverMat) {
      this.district.riverMat.uniforms.uTime.value = elapsed;
      this.district.riverMat.uniforms.uCameraPos.value.copy(this.camera.position);
    }
    if (this.district.riverLanterns) {
      for (const rl of this.district.riverLanterns) {
        rl.mesh.position.y = rl.baseY + Math.sin(elapsed * 1.7 + rl.phase) * 0.035;
      }
    }

    // Animate District III (Fire by Night) Guiding Pillar of Fire going ahead of the pilgrim!
    if (this.district.guidingPillar) {
      const targetZ = Math.max(-410, this.player.position.z - 15.0);
      const curZ = this.district.guidingPillar.position.z;
      const newZ = curZ + (targetZ - curZ) * Math.min(1, dt * 2.4);
      const pillarRoadPt = this.districtBuilder.getPathPoint(newZ);
      this.district.guidingPillar.position.set(pillarRoadPt.x, pillarRoadPt.y, newZ);
    }

    let nearestNode = null;
    let nearestDist = Infinity;

    for (const node of this.district.paintingNodes) {
      const d = Math.hypot(
        this.player.position.x - node.position.x,
        this.player.position.z - node.position.z
      );
      if (d < 36.0 && !node.textureLoaded && !node._loadPromise && this.districtBuilder) {
        this.districtBuilder.ensureNodeTextureLoaded(node);
      }
      if (d < nearestDist) {
        nearestDist = d;
        nearestNode = node;
      }
      if (node.meshGroup.userData.portalGlow) {
        node.meshGroup.userData.portalGlow.material.opacity = 0.35 + 0.15 * Math.sin(elapsed * 2.2 + node.data.n);
      }
    }

    // Smoothly color-grade Sky Dome & Fog from the nearest painting's sampled palette blended with the book's Street Biome
    if (nearestNode && nearestNode.data.palette) {
      const pal = nearestNode.data.palette;
      const bCfg = this.district.biomeCfg || this.districtBuilder.getDistrictBiomeConfig(this.currentDistrictSlug);
      const lerpAlpha = Math.min(1, dt * 1.5);
      if (this._lastPaletteNode !== nearestNode) {
        this._lastPaletteNode = nearestNode;
        this._colorTop.set(bCfg.skyTop || '#4a6b82').lerp(new THREE.Color(pal.top || '#b79d7e'), 0.35);
        this._colorHorizon.set(bCfg.skyHorizon || '#f2d399').lerp(new THREE.Color(pal.horizon || '#b69375'), 0.42);
        this._colorGround.set(bCfg.groundColor || '#686050').lerp(new THREE.Color(pal.ground || '#686050'), 0.45);
        this._colorAccent.set(bCfg.groundAccent || '#d9b08b').lerp(new THREE.Color(pal.accent || '#d9b08b'), 0.5);
        this._colorFog.set(bCfg.fogColor || '#948067').lerp(new THREE.Color(pal.horizon || '#948067'), 0.35);
      }
      this.skyDome.material.uniforms.uTopColor.value.lerp(this._colorTop, lerpAlpha);
      this.skyDome.material.uniforms.uHorizonColor.value.lerp(this._colorHorizon, lerpAlpha);
      this.skyDome.material.uniforms.uGroundColor.value.lerp(this._colorGround, lerpAlpha);
      this.skyDome.material.uniforms.uAccentColor.value.lerp(this._colorAccent, lerpAlpha);
      this.scene.fog.color.lerp(this._colorFog, lerpAlpha);
    }

    // Update Part Veils & sense nearest un-kindled Hidden Light (§4 Lantern warm glow + chime)
    let nearestUnkindledLight = null;
    let nearestLightDist = Infinity;
    let bestLightAlignment = 0;

    const lookDirX = -Math.sin(this.player.yaw);
    const lookDirZ = -Math.cos(this.player.yaw);

    for (const lObj of this.district.partGatesAndLights) {
      if (lObj.veilMat) {
        lObj.veilMat.uniforms.uTime.value = elapsed;
      }
      lObj.haloSprite.material.opacity = 0.65 + 0.25 * Math.sin(elapsed * 3.0 + lObj.part);

      const dx = lObj.position.x - this.player.position.x;
      const dz = lObj.position.z - this.player.position.z;
      const dist = Math.hypot(dx, dz);

      if (!lObj.kindled && dist < nearestLightDist) {
        nearestLightDist = dist;
        nearestUnkindledLight = lObj;
        const dot = (dx / (dist || 1)) * lookDirX + (dz / (dist || 1)) * lookDirZ;
        bestLightAlignment = Math.max(0, dot);
      }
    }

    // Lantern proximity & facing feedback (§4 — lantern brightens per district completed & light kindled)
    const completedCount = (this.saveData.districtsCompleted || []).length;
    const baseLantern = 1.4 + completedCount * 0.45 + this.saveData.lightsKindled.length * 0.18;
    this.lanternLight.distance = 14 + completedCount * 1.5;
    if (nearestUnkindledLight && nearestLightDist < 28.0) {
      const prox = 1.0 - nearestLightDist / 28.0;
      const resonance = prox * (0.45 + 0.55 * bestLightAlignment);
      this.lanternLight.intensity = baseLantern + resonance * 2.8;
      this._setLanternUI(
        (0.35 + resonance * 0.65).toFixed(2),
        resonance > 0.35 ? `✦ Lantern warms: a hidden Light shimmers nearby` : `✦ Lantern lit`
      );
      if (resonance > 0.58) {
        this.audio.playLightChime(resonance, false);
      }
    } else {
      this.lanternLight.intensity = baseLantern;
      this._setLanternUI('0.55', `✦ Lantern lit`);
    }

    // Determine active Street interaction prompt
    let nearestRelicNode = null;
    let nearestRelicDist = Infinity;
    if (this.district.heroRelicNodes) {
      for (const rNode of this.district.heroRelicNodes) {
        const rd = Math.hypot(
          this.player.position.x - rNode.position.x,
          this.player.position.z - rNode.position.z
        );
        if (rd < nearestRelicDist) {
          nearestRelicDist = rd;
          nearestRelicNode = rNode;
        }
      }
    }

    const distToAmen = Math.hypot(
      this.player.position.x - this.district.amenPlaza.position.x,
      this.player.position.z - this.district.amenPlaza.position.z
    );
    const blockingVeil = this.getFirstBlockingVeil();
    const distToBlockingVeil = blockingVeil ? Math.abs(this.player.position.z - blockingVeil.veilZ) : Infinity;

    const zh = this.isZh();
    if (nearestUnkindledLight && nearestLightDist < 3.8) {
      this.currentInteractTarget = { type: 'KINDLE_LIGHT', lightObj: nearestUnkindledLight };
      this._setPromptUI(
        false,
        zh
          ? this.zh(`✦ 点亮明灯：${nearestUnkindledLight.name} [E]`)
          : `✦ Kindle ${nearestUnkindledLight.name} [E]`,
        true
      );
    } else if (blockingVeil && distToBlockingVeil < 4.5) {
      this.currentInteractTarget = { type: 'VEIL_BLOCKED', lightObj: blockingVeil };
      const totalParts = this.district.partGatesAndLights ? this.district.partGatesAndLights.length : 4;
      const nextPartLabel =
        blockingVeil.part < totalParts ? `Part ${blockingVeil.part + 1}` : 'the Amen Gate';
      this._setPromptUI(
        false,
        zh
          ? this.zh(`✦ 前路尚在帷幕之中 — 请先点亮本篇的「${blockingVeil.name}」（提示：${blockingVeil.hint}）[E]`)
          : `✦ Way to ${nextPartLabel} is veiled — Kindle this part’s Light: ${blockingVeil.name} (${blockingVeil.hint}) [E]`,
        true
      );
    } else if (nearestRelicNode && nearestRelicDist < 4.2 && nearestRelicDist <= nearestDist + 0.4) {
      const relicMeta = this.tripoManager?.relicById?.get(nearestRelicNode.id) || null;
      const rTitle = relicMeta ? relicMeta.title : nearestRelicNode.id;
      const p = nearestRelicNode.paintingData || { n: nearestRelicNode.paintingNum, title: '' };
      const pTitle = zh && p.zh_title ? this.zh(p.zh_title) : p.title;
      this.currentInteractTarget = {
        type: 'INSPECT_HERO_RELIC',
        relicNode: nearestRelicNode,
        relicMeta
      };
      this._setPromptUI(
        false,
        zh
          ? this.zh(`🗿 瞻仰圣物 · #${relicMeta?.slot || ''}「${rTitle}」· 阅读第 ${p.n} 首《${pTitle}》[E]`)
          : `🗿 Inspect Hero Relic · #${relicMeta?.slot || ''} “${rTitle}” · Read Poem No. ${p.n} “${pTitle}” [E]`,
        true
      );
    } else if (nearestNode && nearestDist < 4.6) {
      const p = nearestNode.data;
      const pTitle = zh && p.zh_title ? this.zh(p.zh_title) : p.title;
      const pRef = zh && p.zh_ref ? this.zh(p.zh_ref) : p.ref;
      if (p.isScene) {
        this.currentInteractTarget = { type: 'STEP_THROUGH', node: nearestNode };
        this._setPromptUI(
          false,
          zh
            ? this.zh(`✦ 步入画框秘境：《${pTitle}》（${pRef}）[E]`)
            : `✦ Step Through Frame into “${pTitle}” (${pRef}) [E]`,
          false,
          zh ? this.zh(`阅读诗歌 [R]`) : `Read Poem [R]`
        );
      } else {
        this.currentInteractTarget = { type: 'READ_POEM', node: nearestNode };
        this._setPromptUI(
          false,
          zh
            ? this.zh(`阅读诗歌 · 第 ${p.n} 幅《${pTitle}》（${pRef}）[E]`)
            : `Read Poem · No. ${p.n} “${pTitle}” (${pRef}) [E]`,
          true
        );
      }
    } else if (distToAmen < 6.5 && !blockingVeil) {
      this.currentInteractTarget = { type: 'AMEN_GATE' };
      const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
      this._setPromptUI(
        false,
        zh
          ? this.zh(`✦ 步入阿们之门 · 完成《${this.getZhBookTitle(this.currentDistrictSlug)}》[E]`)
          : `✦ Enter the Amen Gate & Complete ${meta.fullLabel} [E]`,
        true
      );
    } else if (this.player.position.z > 9.5) {
      this.currentInteractTarget = { type: 'GATEHOUSE_HUB' };
      this._setPromptUI(
        false,
        zh
          ? this.zh(`打开城门导言与 3D 庭院 [E]`)
          : `Open Gatehouse Hub & Walk 3D Courtyard [E]`,
        true
      );
    } else {
      this._setPromptUI(true);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.pilgrimApp = new PilgrimWalkApp();
});
