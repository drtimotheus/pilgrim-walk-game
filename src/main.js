// ============================================================================
// THE PILGRIM WALK — Main Game Controller (Stage 1: Genesis + 3 Step-Through Scenes)
// Implements:
//   - First-person controls (WASD/Arrows + PointerLock / drag look + Mobile touch)
//   - Unmissable Scene Exits (§5: persistent "Back to the street" button on screen,
//     lit exit doorway inside every scene, exact street position & facing restoration,
//     page refresh safe landing at Gatehouse with progress preserved in localStorage)
//   - Dynamic palette color grading as the pilgrim walks along Genesis Street
//   - Hidden Lights proximity glow & soft harmonic chime (§4)
//   - Quick-travel scene jump bar so Timothy can test the 3 Step-Through Scenes
//     ("let there be", "the seventh day", "the bow in the cloud") immediately or walk the street
// ============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PainterlyEngine } from './painterly.js?v=44_5';
import { PainterlyPostProcess, createPainterlySkyDome } from './postprocess.js?v=44_5';
import { PainterlyPropBuilder } from './props.js?v=44_5';
import { StepThroughSceneManager } from './scenes.js?v=44_5';
import { GenesisDistrictBuilder } from './district.js?v=44_5';
import { PilgrimAudio } from './audio.js?v=44_5';
import { TripoRelicManager } from './tripo.js?v=44_5';
import { DailyWalkManager } from './daily-walk.js?v=44_5';

const SAVE_KEY = 'pilgrim_walk_save_v1';

class PilgrimWalkApp {
  constructor() {
    this.canvas = document.getElementById('world-canvas');
    this.mode = 'STREET'; // 'STREET' | 'SCENE'
    this.walkMode = 'STORY'; // 'STORY' | 'FREE'
    this.reducedMotion = false;
    this.largeText = false;

    // Saved progress in localStorage (§4 & §5d)
    this.saveData = this.loadSaveData();

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
      [13, 'XIII', 'psalms-1', 'Psalms 1–41', 'Planted by the Water (Psalms 1–41)', '“He will be like a tree planted by the streams of water.”'],
      [14, 'XIV', 'psalms-2', 'Psalms 42–72', 'As the Deer (Psalms 42–72)', '“Lead me to the rock that is higher than I.”'],
      [15, 'XV', 'psalms-3', 'Psalms 73–106', 'A Day in Your Courts (Psalms 73–106)', '“For a day in your courts is better than a thousand.”'],
      [16, 'XVI', 'psalms-4', 'Psalms 107–150', 'Everything That Has Breath (Psalms 107–150)', '“Your word is a lamp to my feet, and a light for my path.”'],
      [17, 'XVII', 'the-beginning-of-wisdom', 'Proverbs', 'The Beginning of Wisdom (Proverbs)', '“Trust in Yahweh with all your heart, and don’t lean on your own understanding.”'],
      [18, 'XVIII', 'eternity-in-their-hearts', 'Ecclesiastes', 'Eternity in Their Hearts (Ecclesiastes)', '“He has made everything beautiful in its time. He has also set eternity in their hearts.”'],
      [19, 'XIX', 'many-waters', 'Song of Songs', 'Many Waters (Song of Songs)', '“Many waters can’t quench love, neither can floods drown it.”'],
      [20, 'XX', 'arise-shine', 'Isaiah', 'Arise, Shine (Isaiah)', '“Arise, shine; for your light has come, and Yahweh’s glory has risen on you.”'],
      [21, 'XXI', 'a-future-and-a-hope', 'Jeremiah', 'A Future and a Hope (Jeremiah)', '“Thoughts of peace, and not of evil, to give you hope and a future.”'],
      [22, 'XXII', 'new-every-morning', 'Lamentations', 'New Every Morning (Lamentations)', '“They are new every morning. Great is your faithfulness.”'],
      [23, 'XXIII', 'can-these-bones-live', 'Ezekiel', 'Can These Bones Live? (Ezekiel)', '“Everything will live wherever the river comes.”'],
      [24, 'XXIV', 'greatly-beloved', 'Daniel', 'Greatly Beloved (Daniel)', '“Greatly beloved man, don’t be afraid. Peace be to you.”'],
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
      [44, 'XLIV', 'all-things-new', 'Revelation', 'All Things New (Revelation)', '“Behold, I am making all things new… Yes, come, Lord Jesus.”']
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
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.bindUIAndControls();
    this.bootstrap();
  }

  loadSaveData() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          currentDistrictSlug: parsed.currentDistrictSlug || 'genesis',
          lightsKindled: parsed.lightsKindled || [],
          paintingsSeen: parsed.paintingsSeen || [],
          scenesVisited: parsed.scenesVisited || [],
          districtsCompleted: parsed.districtsCompleted || [],
          walkMode: parsed.walkMode || 'STORY',
          reducedMotion: !!parsed.reducedMotion,
          largeText: !!parsed.largeText,
          dailyWalk: parsed.dailyWalk || {
            currentDay: 1,
            completedDays: [],
            journalNotes: {},
            lastWalkedDate: null
          }
        };
      }
    } catch (e) {
      console.warn('localStorage load fallback', e);
    }
    return {
      currentDistrictSlug: 'genesis',
      lightsKindled: [],
      paintingsSeen: [],
      scenesVisited: [],
      districtsCompleted: [],
      walkMode: 'STORY',
      reducedMotion: false,
      largeText: false,
      dailyWalk: {
        currentDay: 1,
        completedDays: [],
        journalNotes: {},
        lastWalkedDate: null
      }
    };
  }

  persistSaveData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
    } catch (e) {
      console.warn('localStorage write fallback', e);
    }
    this.updateHUDProgress();
  }

  initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      document.getElementById('webgl-fallback').classList.remove('hidden');
      throw err;
    }

    const pr = Math.min(window.devicePixelRatio || 1, 2);
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
    this.postProcess = new PainterlyPostProcess(THREE, this.renderer, this.painterly);
    this.dailyWalk = new DailyWalkManager(this);

    this.skyDome = createPainterlySkyDome(THREE, 280);
    this.scene.add(this.skyDome);

    // Warm Golden-Hour Hemisphere & Directional Sun Light + Pilgrim's Lantern Light
    this.hemiLight = new THREE.HemisphereLight('#dfcaa8', '#5e503f', 1.15);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#ffe4b5', 1.65);
    this.dirLight.position.set(18, 32, -25);
    this.scene.add(this.dirLight);

    // The Pilgrim's Lantern (carried by the player, brightens with progress & glows when facing a hidden Light)
    this.lanternLight = new THREE.PointLight('#ffcf78', 1.4, 14);
    this.scene.add(this.lanternLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.postProcess.setSize(window.innerWidth, window.innerHeight);
    });
  }

  async ensureManifestLoaded(slug) {
    if (this.manifests[slug]) return this.manifests[slug];
    try {
      const res = await fetch(`assets/data/${slug}-manifest.json?v=44_4`);
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
      const [genRes, routeRes, coversRes] = await Promise.all([
        fetch('assets/data/genesis-manifest.json?v=44_4'),
        fetch('assets/data/route.json?v=44_4'),
        fetch('assets/data/covers.json?v=44_4'),
        this.tripoManager.init()
      ]);

      this.manifests['genesis'] = await genRes.json();
      this.routeData = await routeRes.json();
      this.coversData = await coversRes.json();

      this.walkMode = this.saveData.walkMode || 'STORY';
      this.reducedMotion = !!this.saveData.reducedMotion;
      this.largeText = !!this.saveData.largeText;
      this.applyAccessibilitySettings();

      const initialSlug = this.districtMeta[this.currentDistrictSlug] ? this.currentDistrictSlug : 'genesis';
      await this.ensureManifestLoaded(initialSlug);
      await this.switchDistrict(initialSlug, true);
      await this.dailyWalk.init();

      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        if (loadingScreen) loadingScreen.classList.add('hidden');
      }, 650);

      this.animate();
    } catch (err) {
      console.error('Bootstrap error:', err);
      const status = document.getElementById('loading-status');
      if (status) {
        status.textContent = `Loading note: ${err.message || err}. Please hard-refresh (Cmd+Shift+R).`;
      }
    }
  }

  updateActivePillHighlight() {
    const isGH = this.mode === 'GATEHOUSE';
    const elGH = document.getElementById('btn-walk-gatehouse');
    if (elGH) elGH.classList.toggle('active-pill', isGH);

    const sel = document.getElementById('hud-district-select');
    if (sel) {
      sel.classList.toggle('active-pill', !isGH);
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
      ribbon.querySelectorAll('[data-district-pill]').forEach((btn) => {
        const active = !isGH && btn.dataset.districtPill === this.currentDistrictSlug;
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
      playableRouteSlugs
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
    await this.ensureManifestLoaded(slug);
    if (!this.manifests[slug]) return;
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
    const meta = this.districtMeta[slug] || this.districtMeta.genesis;

    if (loadSub) {
      loadSub.textContent = meta.loadingSub;
    }

    if (!this.districtCache[slug]) {
      this.districtCache[slug] = await this.districtBuilder.buildDistrict(this.manifest, (loaded, total) => {
        const pct = Math.round((loaded / total) * 100);
        if (loadBar) loadBar.style.width = `${pct}%`;
        if (loadStatus) {
          loadStatus.textContent = `Dressing ${meta.fullLabel} Street from Timothy Holt’s paintings (${loaded}/${total})…`;
        }
      });
    }

    this.district = this.districtCache[slug];
    this.district.streetGroup.visible = true;
    this.scene.add(this.district.streetGroup);

    // Restore kindled Lights from localStorage
    this.district.partGatesAndLights.forEach((lObj) => {
      if (this.saveData.lightsKindled.includes(lObj.id)) {
        this.markLightKindled(lObj, true);
      }
    });

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

    if (!isInitialBoot && loadScreen) {
      loadScreen.classList.add('fade-out');
      setTimeout(() => loadScreen.classList.add('hidden'), 500);
      this.showToast(`Entered District ${meta.num} · ${meta.fullLabel}`);
    }
  }

  renderQuickSceneStrip() {
    const strip = document.getElementById('prototype-scene-strip');
    if (!strip) return;

    if (this.mode === 'GATEHOUSE') {
      strip.innerHTML = `
        <span class="strip-label">3D Gatehouse Courtyard (44 Books):</span>
        <button class="scene-jump-btn" data-gh-jump="-2" data-gh-yaw="0.45">Torah &amp; History (#1–#11)</button>
        <button class="scene-jump-btn" data-gh-jump="-55" data-gh-yaw="0.45">Wisdom &amp; Major Prophets (#12–#22)</button>
        <button class="scene-jump-btn" data-gh-jump="-2" data-gh-yaw="-0.45">Minor Prophets &amp; Gospels (#23–#33)</button>
        <button class="scene-jump-btn" data-gh-jump="-58" data-gh-yaw="-0.45">Epistles &amp; Revelation (#34–#44)</button>
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
        { n: 11, label: '11 · “the bow in the cloud” (Stone Altar & Rainbow)' }
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
      ]
    };

    const dynamicScenes = (this.manifest.paintings || [])
      .filter((p) => p.isScene)
      .map((p) => ({
        n: p.n,
        label: `${p.n} · “${p.title}” (${p.ref})`
      }));

    const scenes = sceneMap[this.currentDistrictSlug] || dynamicScenes || sceneMap.genesis;
    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    const lastN = this.manifest.paintings.length;

    strip.innerHTML = `
      <span class="strip-label">${meta.shortName} Scenes:</span>
      ${scenes
        .map(
          (s) =>
            `<button class="scene-jump-btn" data-jump-scene="${s.n}" data-jump-mode="enter">${s.label}</button>`
        )
        .join('')}
      <button class="scene-jump-btn" data-jump-scene="1" data-jump-mode="street">Walk Street Start</button>
      <button class="scene-jump-btn" data-jump-scene="${lastN}" data-jump-mode="street">Finale Plaza</button>
    `;

    strip.querySelectorAll('[data-jump-scene]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.getAttribute('data-jump-scene'), 10);
        const mode = btn.getAttribute('data-jump-mode');
        this.jumpToPaintingOnStreet(num, mode === 'enter');
      });
    });
  }

  // ==========================================================================
  // STEP-THROUGH SCENE ENTRY & UNMISSABLE EXIT (§5 & §6)
  // ==========================================================================
  enterStepThroughScene(paintingNode) {
    if (!paintingNode || !paintingNode.data.isScene) return;
    this.closePoemModal();

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
      this.skyDome
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

    // Reset sky dome special uniforms
    this.skyDome.material.uniforms.uStarIntensity.value = 0.0;
    this.skyDome.material.uniforms.uRainbowIntensity.value = 0.0;

    // Hide the scene-only UI
    document.getElementById('back-to-street-btn').classList.add('hidden');
    document.getElementById('scene-active-banner').classList.add('hidden');
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

    if (enterSceneImmediately && targetNode.data.isScene) {
      this.enterStepThroughScene(targetNode);
    } else {
      this.showToast(`Moved to No. ${targetNode.data.n} · “${targetNode.data.title}”`);
    }
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
    } else if (t.type === 'KINDLE_LIGHT') {
      this.markLightKindled(t.lightObj, false);
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
    if (!silent) {
      this.audio.playLightChime(1.0, true);
      this.showToast(`✦ Kindled ${lightObj.name}! The way ahead opens.`);
    }
  }

  triggerAmenGateCeremony() {
    const slug = this.currentDistrictSlug;
    if (!this.saveData.districtsCompleted.includes(slug)) {
      this.saveData.districtsCompleted.push(slug);
      this.persistSaveData();
    }
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

    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    document.getElementById('poem-modal-num').textContent = `${meta.shortName.toUpperCase()} · NO. ${paintingData.n}`;
    document.getElementById('poem-modal-title').textContent = paintingData.title;
    document.getElementById('poem-modal-ref').textContent = paintingData.ref;
    document.getElementById('poem-modal-body').textContent = paintingData.poem;
    document.getElementById('poem-modal-img').src = paintingData.isScene ? paintingData.heroSrc : paintingData.webSrc;

    const reflBox = document.getElementById('poem-modal-reflection-box');
    const reflText = document.getElementById('poem-modal-reflection-text');
    if (reflBox && reflText) {
      if (paintingData.reflectionPrompt) {
        reflText.textContent = paintingData.reflectionPrompt;
        reflBox.classList.remove('hidden');
      } else {
        reflBox.classList.add('hidden');
      }
    }

    const stepBtn = document.getElementById('poem-modal-step-btn');
    if (stepThroughCallback && this.mode === 'STREET') {
      stepBtn.classList.remove('hidden');
      stepBtn.onclick = () => {
        this.closePoemModal();
        stepThroughCallback();
      };
    } else {
      stepBtn.classList.add('hidden');
    }

    const seleneBtn = document.getElementById('poem-modal-selene-btn');
    if (seleneBtn && this.dailyWalk) {
      seleneBtn.textContent = '🔊 Listen (Selene Voice)';
      seleneBtn.onclick = () => {
        this.dailyWalk.speakPaintingWithSelene(paintingData, seleneBtn, '🔊 Listen (Selene Voice)');
      };
    }

    const fishStudioBtn = document.getElementById('poem-modal-fish-studio-btn');
    if (fishStudioBtn && this.dailyWalk) {
      fishStudioBtn.onclick = () => {
        this.dailyWalk.openFishStudioForPainting(paintingData);
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
    this.populateModals();
    document.getElementById(id).classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeAllModals() {
    this.closePoemModal();
    if (this.dailyWalk) {
      this.dailyWalk.saveCurrentJournalNote();
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

    document.getElementById('btn-mode-toggle').addEventListener('click', () => {
      const modes = ['STORY', 'FREE', 'DAILY'];
      const nextIdx = (modes.indexOf(this.walkMode) + 1) % modes.length;
      this.walkMode = modes[nextIdx];
      this.saveData.walkMode = this.walkMode;
      this.applyAccessibilitySettings();
      this.persistSaveData();
      if (this.dailyWalk) {
        this.dailyWalk.updateHUDCandlePill();
        if (this.walkMode === 'DAILY') {
          this.dailyWalk.walkCurrentDayIn3D(false);
          return;
        }
      }
      this.showToast(
        this.walkMode === 'FREE'
          ? 'Free Walk active: all parts & gates open to wander freely.'
          : 'Story Walk active: find and kindle each Part’s hidden Light to open the next part.'
      );
    });

    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      this.audio.init();
      this.audio.setMuted(!this.audio.muted);
      document.getElementById('btn-audio-toggle').textContent = this.audio.muted ? 'Sound: Off' : 'Sound: On';
    });

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
  }

  applyAccessibilitySettings() {
    document.body.classList.toggle('large-text', this.largeText);
    const mBtn = document.getElementById('btn-a11y-motion');
    if (mBtn) mBtn.textContent = this.reducedMotion ? 'Motion: Calm' : 'Motion: Standard';
    const tBtn = document.getElementById('btn-a11y-text');
    if (tBtn) tBtn.textContent = this.largeText ? 'Text: Large' : 'Text: Standard';
    const wBtn = document.getElementById('btn-mode-toggle');
    if (wBtn) {
      wBtn.textContent =
        this.walkMode === 'STORY'
          ? 'Mode: Story Walk'
          : this.walkMode === 'FREE'
          ? 'Mode: Free Walk'
          : 'Mode: Daily Walk 🕯';
    }
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

    if (elLights) elLights.textContent = `${districtLights} / ${totalLights} Lights`;
    if (elSeen) elSeen.textContent = `${districtPoems} / ${totalPoems} Poems`;
  }

  populateModals() {
    if (!this.routeData || !this.manifest) return;

    const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
    const totalParts = this.manifest.parts ? this.manifest.parts.length : 4;
    const totalPaintings = this.manifest.paintings ? this.manifest.paintings.length : 40;
    const totalScenes = this.manifest.paintings ? this.manifest.paintings.filter((p) => p.isScene).length : 4;

    // 0. Gatehouse Hub Modal
    const ghTitle = document.getElementById('gatehouse-modal-title');
    const ghSub = document.getElementById('gatehouse-modal-sub');
    const ghBody = document.getElementById('gatehouse-modal-body');
    if (ghTitle) ghTitle.textContent = `${this.manifest.title} — ${this.manifest.subtitle}`;
    if (ghSub) {
      ghSub.textContent = `District ${meta.num} · ${totalPaintings} Paintings · ${totalParts} Parts · ${totalParts} Hidden Lights · ${totalScenes} Step-Through Scenes`;
    }
    if (ghBody) {
      ghBody.textContent = this.manifest.beforeYouBegin;
    }

    // 1. Long Scroll Modal (All 44 districts in storyline order — all 44 books are interactive!)
    const routeSlugMap = this.getRouteSlugMap();
    const scrollGrid = document.getElementById('scroll-districts-list');
    if (scrollGrid) {
      scrollGrid.innerHTML = '';
      this.routeData.forEach((d) => {
        const card = document.createElement('div');
        const playableSlug = routeSlugMap[d.slug] || d.slug;
        const isCurrent = this.mode !== 'GATEHOUSE' && playableSlug === this.currentDistrictSlug;
        const isDone = playableSlug && this.saveData.districtsCompleted.includes(playableSlug);
        card.className = `scroll-card ${isCurrent ? 'active-district' : ''} ${isDone ? 'completed-district' : ''}`;
        if (playableSlug) {
          card.style.cursor = 'pointer';
          card.onclick = () => this.switchDistrict(playableSlug);
        }
        const coverSrc = this.coversData && this.coversData[d.slug] ? this.coversData[d.slug] : '';
        card.innerHTML = `
          <div class="scroll-card-cover">
            ${coverSrc ? `<img src="${coverSrc}" alt="${d.title}" loading="lazy"/>` : ''}
            <span class="scroll-num">#${d.n}</span>
          </div>
          <div class="scroll-card-info">
            <h4>${d.title}</h4>
            <p>${d.subtitle}</p>
            <span class="scroll-status">${
              isDone
                ? '✦ Completed (Click to Walk)'
                : isCurrent
                ? '● Walking Now'
                : '✦ Open Now — Click to Enter'
            }</span>
          </div>
        `;
        scrollGrid.appendChild(card);
      });
    }

    // 2. Gatehouse Cover Shelf Modal (Commerce rule §4: shop links live ONLY here at the Gatehouse Cover Shelf)
    const shelfContainer = document.getElementById('shelf-books-grid');
    if (shelfContainer) {
      shelfContainer.innerHTML = '';
      this.routeData.forEach((d) => {
        const playableSlug = routeSlugMap[d.slug] || d.slug;
        const mInfo = this.districtMeta[playableSlug] || {};
        const cover =
          this.coversData && this.coversData[d.slug]
            ? this.coversData[d.slug]
            : `assets/${playableSlug}/web/b-${String(d.n).padStart(3, '0')}-000.jpg`;
        const item = document.createElement('div');
        item.className = 'shelf-book-card';
        item.innerHTML = `
          <img src="${cover}" alt="${d.title}" loading="lazy" />
          <div class="shelf-book-meta">
            <h3>#${d.n} · ${d.title}</h3>
            <p class="shelf-sub">${d.subtitle} · By Timothy Holt</p>
            <p class="shelf-desc">${mInfo.amenQuote || 'Walk the street of paintings and poems, kindle the hidden Lights, and step through the glowing frames.'}</p>
            <div class="shelf-links" style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="gold-btn" data-shelf-enter="${playableSlug}">
                ✦ Walk District #${d.n}: ${d.title}
              </button>
              <a href="https://inspiringyourfaith.org" target="_blank" rel="noopener noreferrer" class="gold-btn">
                Visit Timothy Holt’s Bookshop (InspiringYourFaith.org) ↗
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
      amenEyebrow.textContent = `AMEN GATE · DISTRICT ${meta.num} COMPLETED`;
    }
    if (amenTitle) {
      amenTitle.textContent = `${this.manifest.title} — Completed`;
    }
    if (amenQuote) {
      amenQuote.textContent = meta.amenQuote;
    }
    if (amenCover) {
      amenCover.src = this.manifest.cover;
    }
    if (amenDesc) {
      amenDesc.innerHTML = `Your lantern shines brighter, and <em>${this.manifest.title}</em> now rests on the Gatehouse Cover Shelf. Next on your pilgrimage: <strong>${meta.nextLabel}</strong>.`;
    }
    if (amenNextBtn) {
      amenNextBtn.textContent = `✦ Continue to ${meta.nextLabel} →`;
    }

    // 4. Tripo3D Studio 13-Relic Workshop Modal
    this.renderTripoWorkshopModal();
  }

  renderTripoWorkshopModal() {
    const container = document.getElementById('tripo-relics-list');
    if (!container || !this.tripoManager || !this.tripoManager.manifest) return;

    container.innerHTML = '';
    const models = this.tripoManager.manifest.models || [];
    models.forEach((m) => {
      const status = this.tripoManager.statusMap.get(m.id) || 'procedural';
      const isLoaded = status === 'loaded';
      const card = document.createElement('div');
      card.className = 'shelf-book-card';
      card.style.marginTop = '0';
      card.innerHTML = `
        <img src="${m.paintingRef}" alt="${m.title}" style="width:128px;height:128px;" />
        <div class="shelf-book-meta" style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <h3 style="font-size:1.15rem;">#${m.slot} · ${m.title}</h3>
            <span style="font-size:0.8rem;font-weight:bold;padding:3px 10px;border-radius:99px;background:${
              isLoaded ? '#2e4d28' : '#524024'
            };color:#f7eedc;">
              ${isLoaded ? '✦ Tripo3D .glb Active' : '● Painterly Procedural Active (Ready for .glb)'}
            </span>
          </div>
          <p class="shelf-sub" style="margin:3px 0 6px;">${m.district} · Target file: <code>${m.file}</code></p>
          <p class="shelf-desc" style="font-size:0.88rem;margin-bottom:8px;"><strong>Image-to-3D Tip:</strong> ${m.imageTo3DTip}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <a href="${m.paintingRef}" download="${m.id}-reference.jpg" class="gold-btn" style="padding:6px 13px;font-size:0.84rem;">
              ⬇ Download Reference Painting
            </a>
            <button class="gold-btn" data-copy-prompt="${encodeURIComponent(m.textPrompt)}" style="padding:6px 13px;font-size:0.84rem;">
              📋 Copy Text-to-3D Prompt
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

    container.querySelectorAll('[data-copy-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = decodeURIComponent(btn.getAttribute('data-copy-prompt'));
        navigator.clipboard?.writeText(prompt);
        this.showToast('Copied Tripo3D Text-to-3D prompt to clipboard!');
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
  // MAIN GAME LOOP: Movement, Lantern Proximity Glow, Palette Color Grading
  // ==========================================================================
  animate() {
    requestAnimationFrame(() => this.animate());

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
        // Check Story Walk Part Veil Locks (§4: One hidden Light per part gates the next part)
        let blockedByVeil = false;
        if (this.walkMode === 'STORY') {
          for (const lObj of this.district.partGatesAndLights) {
            if (!lObj.kindled && nextZ < lObj.veilZ && this.player.position.z >= lObj.veilZ) {
              blockedByVeil = true;
              this.showToast(`The road ahead is veiled. Seek and kindle ${lObj.name} (${lObj.hint})—or switch to Free Walk.`);
              break;
            }
          }
        }

        if (!blockedByVeil) {
          const minZ = this.district.amenPlaza ? this.district.amenPlaza.position.z - 6 : -444;
          const clampedZ = Math.max(minZ, Math.min(20, nextZ));
          const pathPt = this.districtBuilder.getPathPoint(clampedZ);
          // Allow roaming up to 11.5m left/right of the road center to explore trees & hidden Lights
          const maxLateral = 11.5;
          const clampedX = Math.max(pathPt.x - maxLateral, Math.min(pathPt.x + maxLateral, nextX));
          this.player.position.x = clampedX;
          this.player.position.z = clampedZ;
          this.player.position.y = pathPt.y + 1.72;
        }
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

  updateWorldAndInteractions(dt, elapsed) {
    const promptContainer = document.getElementById('interaction-bar');
    const promptBtn = document.getElementById('interact-prompt-btn');
    const secondaryBtn = document.getElementById('read-poem-secondary-btn');
    const lanternIndicator = document.getElementById('lantern-glow-indicator');

    this.currentInteractTarget = null;
    secondaryBtn.classList.add('hidden');

    // ========================================================================
    // 3D WALKABLE GATEHOUSE COURTYARD MODE (All 44 Book Gates)
    // ========================================================================
    if (this.mode === 'GATEHOUSE' && this.gatehouseHubWorld) {
      if (this.gatehouseHubWorld.riverMat) {
        this.gatehouseHubWorld.riverMat.uniforms.uTime.value = elapsed;
        this.gatehouseHubWorld.riverMat.uniforms.uCameraPos.value.copy(this.camera.position);
      }

      // Warm golden-hour courtyard sky palette
      this.skyDome.material.uniforms.uTopColor.value.lerp(new THREE.Color('#6a8298'), dt * 1.5);
      this.skyDome.material.uniforms.uHorizonColor.value.lerp(new THREE.Color('#d2ab7a'), dt * 1.5);
      this.skyDome.material.uniforms.uGroundColor.value.lerp(new THREE.Color('#695843'), dt * 1.5);
      this.skyDome.material.uniforms.uAccentColor.value.lerp(new THREE.Color('#f5d79c'), dt * 1.5);
      this.scene.fog.color.lerp(new THREE.Color('#b69772'), dt * 1.5);

      let nearestGate = null;
      let nearestGateDist = Infinity;
      for (const g of this.gatehouseHubWorld.gateNodes) {
        const d = Math.hypot(
          this.player.position.x - g.position.x,
          this.player.position.z - g.position.z
        );
        if (d < nearestGateDist) {
          nearestGateDist = d;
          nearestGate = g;
        }
      }

      if (nearestGate && nearestGateDist < 4.5) {
        this.currentInteractTarget = { type: 'ENTER_BOOK_GATE', gate: nearestGate };
        const b = nearestGate.bookData;
        if (nearestGate.playableSlug) {
          promptBtn.textContent = `✦ Step Through Book Gate #${b.n} · “${b.title}” (${b.subtitle}) [E]`;
        } else {
          promptBtn.textContent = `Inspect Book Gate #${b.n} · “${b.title}” (${b.subtitle}) [E]`;
        }
        promptContainer.classList.remove('hidden');
      } else {
        promptContainer.classList.add('hidden');
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
        promptBtn.textContent = `← Step Back to ${meta.shortName} Street [E]`;
        promptContainer.classList.remove('hidden');
      } else if (distToSig < sc.signatureRadius) {
        this.currentInteractTarget = {
          type: 'SIGNATURE_ELEMENT',
          text: sc.signatureActivatedText
        };
        promptBtn.textContent = `✦ ${sc.signatureLabel} [E]`;
        promptContainer.classList.remove('hidden');
      } else if (distToAnchor < 3.5) {
        this.currentInteractTarget = {
          type: 'READ_POEM',
          node: { data: sc.paintingData }
        };
        promptBtn.textContent = `Read Poem · “${sc.paintingData.title}” (${sc.paintingData.ref}) [E]`;
        promptContainer.classList.remove('hidden');
      } else {
        promptContainer.classList.add('hidden');
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
      if (d < nearestDist) {
        nearestDist = d;
        nearestNode = node;
      }
      if (node.meshGroup.userData.portalGlow) {
        node.meshGroup.userData.portalGlow.material.opacity = 0.35 + 0.15 * Math.sin(elapsed * 2.2 + node.data.n);
      }
    }

    // Smoothly color-grade Sky Dome & Fog from the nearest painting's sampled palette (§2.2)
    if (nearestNode && nearestNode.data.palette) {
      const pal = nearestNode.data.palette;
      this.skyDome.material.uniforms.uTopColor.value.lerp(new THREE.Color(pal.top || '#b79d7e'), dt * 1.5);
      this.skyDome.material.uniforms.uHorizonColor.value.lerp(new THREE.Color(pal.horizon || '#b69375'), dt * 1.5);
      this.skyDome.material.uniforms.uGroundColor.value.lerp(new THREE.Color(pal.ground || '#686050'), dt * 1.5);
      this.skyDome.material.uniforms.uAccentColor.value.lerp(new THREE.Color(pal.accent || '#d9b08b'), dt * 1.5);
      this.scene.fog.color.lerp(new THREE.Color(pal.horizon || '#948067'), dt * 1.5);
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

    // Lantern proximity & facing feedback (§4)
    const baseLantern = 1.4 + this.saveData.lightsKindled.length * 0.35;
    if (nearestUnkindledLight && nearestLightDist < 28.0) {
      const prox = 1.0 - nearestLightDist / 28.0;
      const resonance = prox * (0.45 + 0.55 * bestLightAlignment);
      this.lanternLight.intensity = baseLantern + resonance * 2.8;
      if (lanternIndicator) {
        lanternIndicator.style.opacity = (0.35 + resonance * 0.65).toFixed(2);
        lanternIndicator.textContent =
          resonance > 0.35 ? `✦ Lantern warms: a hidden Light shimmers nearby` : `✦ Lantern lit`;
      }
      if (resonance > 0.58) {
        this.audio.playLightChime(resonance, false);
      }
    } else {
      this.lanternLight.intensity = baseLantern;
      if (lanternIndicator) {
        lanternIndicator.style.opacity = '0.55';
        lanternIndicator.textContent = `✦ Lantern lit`;
      }
    }

    // Determine active Street interaction prompt
    const distToAmen = Math.hypot(
      this.player.position.x - this.district.amenPlaza.position.x,
      this.player.position.z - this.district.amenPlaza.position.z
    );

    if (nearestUnkindledLight && nearestLightDist < 3.8) {
      this.currentInteractTarget = { type: 'KINDLE_LIGHT', lightObj: nearestUnkindledLight };
      promptBtn.textContent = `✦ Kindle ${nearestUnkindledLight.name} [E]`;
      promptContainer.classList.remove('hidden');
    } else if (nearestNode && nearestDist < 4.6) {
      const p = nearestNode.data;
      if (p.isScene) {
        this.currentInteractTarget = { type: 'STEP_THROUGH', node: nearestNode };
        promptBtn.textContent = `✦ Step Through Frame into “${p.title}” (${p.ref}) [E]`;
        secondaryBtn.textContent = `Read Poem [R]`;
        secondaryBtn.classList.remove('hidden');
      } else {
        this.currentInteractTarget = { type: 'READ_POEM', node: nearestNode };
        promptBtn.textContent = `Read Poem · No. ${p.n} “${p.title}” (${p.ref}) [E]`;
      }
      promptContainer.classList.remove('hidden');
    } else if (distToAmen < 6.5) {
      this.currentInteractTarget = { type: 'AMEN_GATE' };
      const meta = this.districtMeta[this.currentDistrictSlug] || this.districtMeta.genesis;
      promptBtn.textContent = `✦ Enter the Amen Gate & Complete ${meta.fullLabel} [E]`;
      promptContainer.classList.remove('hidden');
    } else if (this.player.position.z > 9.5) {
      this.currentInteractTarget = { type: 'GATEHOUSE_HUB' };
      promptBtn.textContent = `Open Gatehouse Hub & Walk 3D Courtyard [E]`;
      promptContainer.classList.remove('hidden');
    } else {
      promptContainer.classList.add('hidden');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.pilgrimApp = new PilgrimWalkApp();
});
