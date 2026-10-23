// ============================================================================
// THE PILGRIM WALK — Phase 4: Daily Walk (Devotional Mode + Reflection Prompts)
// Implements:
//   - 1,633 Daily Walks across all 44 Books in Bible storyline order (~4.5 years)
//   - One painting a day with its Scripture, verbatim poem, and one-line reflection prompt
//   - "The Daily Walk flame is a candle, not a guilt trip: it never goes out, it just waits" (§7)
//   - 7-Day Week progression bar so a full week of daily walks runs end-to-end (§10)
//   - 3D Devotional Candle Pedestal & Golden Sunbeam placed at today's painting monument
//   - Optional personal reflection journal persisted in localStorage + Read Aloud + Share
// ============================================================================

import { formatZh } from './zh-convert.js?v=44_11';

const FISH_SELENE_MODEL_ID = 'b347db033a6549378b48d00acb0d06cd';
const FISH_KEY_STORAGE = 'pilgrim_fish_audio_selene_key';
const SELENE_DB_NAME = 'pilgrim_selene_voice_cache_v1';

export class DailyWalkManager {
  constructor(app) {
    this.app = app;
    this.THREE = app.districtBuilder.THREE;
    this.indexData = null;
    this.currentDay = 1;
    this.activeEntry = null;
    this.candleMarkerGroup = null;
    this.isSpeaking = false;
    this.activeAudioEl = null;
    this.fishApiKey = localStorage.getItem(FISH_KEY_STORAGE) || '';
  }

  async init() {
    try {
      const res = await fetch('assets/data/daily-walk-index.json');
      if (res.ok) {
        this.indexData = await res.json();
      }
    } catch (e) {
      console.warn('DailyWalkManager index load fallback', e);
    }

    // Restore saved Daily Walk state from app.saveData
    if (!this.app.saveData.dailyWalk) {
      this.app.saveData.dailyWalk = {
        currentDay: 1,
        completedDays: [],
        journalNotes: {},
        lastWalkedDate: null
      };
    }
    this.currentDay = Math.max(
      1,
      Math.min(this.getTotalDays(), this.app.saveData.dailyWalk.currentDay || 1)
    );

    this.bindUI();
    await this.loadDayEntry(this.currentDay);
    this.updateHUDCandlePill();
  }

  getTotalDays() {
    return this.indexData ? this.indexData.totalDays : 1633;
  }

  getTotalWeeks() {
    return this.indexData ? this.indexData.totalWeeks : 234;
  }

  getBookForDay(dayNum) {
    if (!this.indexData || !this.indexData.books) return null;
    const d = Math.max(1, Math.min(this.getTotalDays(), dayNum));
    return (
      this.indexData.books.find((b) => d >= b.startDay && d <= b.endDay) ||
      this.indexData.books[0]
    );
  }

  async loadDayEntry(dayNum) {
    const d = Math.max(1, Math.min(this.getTotalDays(), dayNum));
    this.currentDay = d;
    this.app.saveData.dailyWalk.currentDay = d;
    this.app.persistSaveData();

    const bookInfo = this.getBookForDay(d);
    if (!bookInfo) return null;

    const manifest = await this.app.ensureManifestLoaded(bookInfo.slug);
    if (!manifest || !manifest.paintings) return null;

    const paintingIndex = d - bookInfo.startDay;
    const painting =
      manifest.paintings[paintingIndex] || manifest.paintings[0];
    const partObj =
      (manifest.parts || []).find(
        (pt) => (pt.part || pt.index) === painting.part
      ) || (manifest.parts ? manifest.parts[0] : null);

    this.activeEntry = {
      day: d,
      week: Math.floor((d - 1) / 7) + 1,
      dayOfWeek: ((d - 1) % 7) + 1,
      bookInfo,
      manifest,
      painting,
      partObj
    };

    this.updateHUDCandlePill();
    return this.activeEntry;
  }

  isDayCompleted(dayNum) {
    const list = this.app.saveData.dailyWalk?.completedDays || [];
    return list.includes(dayNum);
  }

  getCompletedCount() {
    return (this.app.saveData.dailyWalk?.completedDays || []).length;
  }

  markCurrentDayCompleted() {
    const dw = this.app.saveData.dailyWalk;
    if (!dw.completedDays.includes(this.currentDay)) {
      dw.completedDays.push(this.currentDay);
    }
    dw.lastWalkedDate = new Date().toISOString().slice(0, 10);

    // Save any journal note currently typed
    const noteEl = document.getElementById('daily-journal-input');
    if (noteEl) {
      const val = noteEl.value.trim();
      if (val) {
        dw.journalNotes[this.currentDay] = val;
      } else {
        delete dw.journalNotes[this.currentDay];
      }
    }

    // Also record the painting as seen in the main journey
    if (this.activeEntry) {
      const seenKey = `${this.activeEntry.bookInfo.slug}-${this.activeEntry.painting.n}`;
      if (!this.app.saveData.paintingsSeen.includes(seenKey)) {
        this.app.saveData.paintingsSeen.push(seenKey);
      }
    }

    this.app.persistSaveData();
    this.app.audio.init();
    this.app.audio.playLightChime(true);
    this.updateHUDCandlePill();
  }

  saveCurrentJournalNote() {
    const noteEl = document.getElementById('daily-journal-input');
    if (!noteEl) return;
    const dw = this.app.saveData.dailyWalk;
    const val = noteEl.value.trim();
    if (val) {
      dw.journalNotes[this.currentDay] = val;
    } else {
      delete dw.journalNotes[this.currentDay];
    }
    this.app.persistSaveData();
  }

  isZh() {
    return this.app.lang === 'zh' || this.app.lang === 'zh-TW';
  }

  zh(text) {
    return formatZh(text, this.app.lang);
  }

  getListenBtnLabel() {
    return this.isZh() ? this.zh('🔊 聆听朗读 (Selene)') : '🔊 Listen (Selene)';
  }

  updateHUDCandlePill() {
    const btn = document.getElementById('btn-daily-walk');
    if (!btn) return;
    const count = this.getCompletedCount();
    const isDailyMode = this.app.walkMode === 'DAILY';
    const zh = this.isZh();
    const isCompactMobile = window.innerWidth <= 820 && this.app.hudMinimized;
    btn.classList.toggle('active-pill', isDailyMode);
    if (isCompactMobile) {
      btn.textContent = zh
        ? this.zh(`🕯 第 ${this.currentDay} 天`)
        : `🕯 Day ${this.currentDay}`;
    } else {
      btn.textContent = zh
        ? this.zh(`🕯 每日同行 · 第 ${this.currentDay} 天 (已点亮 ${count})`)
        : `🕯 Daily Walk · Day ${this.currentDay} (${count} Lit)`;
    }

    // Update floating Daily Walk banner when walking in 3D Daily Walk mode
    const banner = document.getElementById('daily-walk-hud-banner');
    if (banner) {
      if (isDailyMode && this.activeEntry && this.app.mode === 'STREET') {
        const e = this.activeEntry;
        const pTitle = zh && e.painting.zh_title ? this.zh(e.painting.zh_title) : e.painting.title;
        const pRef = zh && e.painting.zh_ref ? this.zh(e.painting.zh_ref) : e.painting.ref;
        const pPrompt = zh && e.painting.zh_reflectionPrompt ? this.zh(e.painting.zh_reflectionPrompt) : e.painting.reflectionPrompt;
        const bTitle = zh && e.bookInfo.zh_title ? this.zh(e.bookInfo.zh_title) : e.bookInfo.title;
        const doneBadge = this.isDayCompleted(e.day)
          ? (zh ? this.zh('✦ 今日烛光已点亮') : '✦ Candle Kindled')
          : (zh ? this.zh('🕯 烛光静候') : '🕯 Candle Waiting');
        banner.innerHTML = `
          <div class="dw-banner-top">
            <span class="dw-banner-eyebrow">${
              zh
                ? this.zh(`🕯 每日灵修同行 · 第 ${e.day} / ${this.getTotalDays()} 天（第 ${e.week} 周 · 第 ${e.dayOfWeek}/7 天）· ${doneBadge}`)
                : `🕯 DAILY WALK · DAY ${e.day} OF ${this.getTotalDays()} (WEEK ${e.week}, DAY ${e.dayOfWeek} OF 7) · ${doneBadge}`
            }</span>
            <span class="dw-banner-book">${
              zh
                ? this.zh(`第 #${e.bookInfo.bookNum} 卷：《${bTitle}》· 第 ${e.painting.n} 幅《${pTitle}》（${pRef}）`)
                : `Book #${e.bookInfo.bookNum}: ${bTitle} · No. ${e.painting.n} “${pTitle}” (${pRef})`
            }</span>
          </div>
          <div class="dw-banner-prompt">
            <strong>${zh ? this.zh('今日默想：') : 'Reflection Prompt:'}</strong> ${pPrompt}
          </div>
          <div class="dw-banner-actions">
            <button id="dw-banner-open-card" class="scene-jump-btn">${zh ? this.zh('📖 阅读诗歌与默想 [J]') : '📖 Read Poem &amp; Reflect [J]'}</button>
            <button id="dw-banner-focus-art" class="scene-jump-btn">${zh ? this.zh('✦ 驻足画前') : '✦ Stand Before Painting'}</button>
            <button id="dw-banner-prev-day" class="scene-jump-btn">◀ ${zh ? this.zh(`第 ${Math.max(1, e.day - 1)} 天`) : `Day ${Math.max(1, e.day - 1)}`}</button>
            <button id="dw-banner-complete-next" class="scene-jump-btn dw-gold-pill">${
              zh
                ? this.zh(`✦ 点亮第 ${e.day} 天烛光并前往第 ${Math.min(this.getTotalDays(), e.day + 1)} 天 →`)
                : `✦ Complete Day ${e.day} &amp; Walk Day ${Math.min(this.getTotalDays(), e.day + 1)} →`
            }</button>
          </div>
        `;
        banner.classList.remove('hidden');

        document.getElementById('dw-banner-open-card')?.addEventListener('click', () => {
          this.openDailyWalkModal(this.currentDay);
        });
        document.getElementById('dw-banner-focus-art')?.addEventListener('click', () => {
          this.walkCurrentDayIn3D(false);
        });
        document.getElementById('dw-banner-prev-day')?.addEventListener('click', async () => {
          if (this.currentDay > 1) {
            await this.loadDayEntry(this.currentDay - 1);
            await this.walkCurrentDayIn3D(false);
          }
        });
        document.getElementById('dw-banner-complete-next')?.addEventListener('click', async () => {
          this.markCurrentDayCompleted();
          const nextD = Math.min(this.getTotalDays(), this.currentDay + 1);
          await this.loadDayEntry(nextD);
          await this.walkCurrentDayIn3D(false);
          const nextP = this.activeEntry.painting;
          this.app.showToast(
            this.isZh()
              ? this.zh(`🕯 第 ${nextD - 1} 天烛光已点亮！正在前往第 ${nextD} 天：《${nextP.zh_title || nextP.title}》（${nextP.zh_ref || nextP.ref}）。`)
              : `🕯 Day ${nextD - 1} candle kindled! Now walking Day ${nextD}: “${nextP.title}” (${nextP.ref}).`
          );
        });
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  // Places a warm 3D Devotional Sanctuary Candle Ring & Sunbeam beside today's painting on the street
  mount3DCandleShrineAtPainting(paintingNode) {
    const THREE = this.THREE;
    if (this.candleMarkerGroup && this.candleMarkerGroup.parent) {
      this.candleMarkerGroup.parent.remove(this.candleMarkerGroup);
    }
    if (!paintingNode || !this.app.district || !this.app.district.streetGroup) return;

    const group = new THREE.Group();
    const stoneMat = this.app.painterly.createPainterlyMaterial({
      baseColor: '#7a6852',
      accentColor: '#f0cf92',
      roughness: 0.86
    });
    const waxMat = this.app.painterly.createPainterlyMaterial({
      baseColor: '#f7eed7',
      accentColor: '#ffe3a3',
      roughness: 0.65
    });

    // Sculpted stone devotionalkneeling bench & candle pedestal beside the painting
    const pedestal = new THREE.Mesh(
      this.app.propBuilder.displaceGeometry(new THREE.CylinderGeometry(0.42, 0.54, 0.92, 16), 0.025, 3.5),
      stoneMat
    );
    pedestal.position.y = 0.46;
    group.add(pedestal);

    // Three devotional pillar candles on the pedestal
    const candleOffsets = [
      { x: 0, z: 0, h: 0.36, r: 0.075 },
      { x: -0.16, z: 0.12, h: 0.26, r: 0.058 },
      { x: 0.16, z: 0.10, h: 0.22, r: 0.055 }
    ];
    const glowTex = this.app.painterly.createGlowSpriteTexture('#ffe299');
    candleOffsets.forEach((c) => {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * 1.05, c.h, 12), waxMat);
      candle.position.set(c.x, 0.92 + c.h * 0.5, c.z);
      group.add(candle);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(c.r * 0.55, c.r * 1.8, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
      );
      flame.position.set(c.x, 0.92 + c.h + c.r * 0.8, c.z);
      group.add(flame);

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffd982,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending
        })
      );
      sprite.scale.set(0.95, 0.95, 1);
      sprite.position.copy(flame.position);
      group.add(sprite);
    });

    const candleLight = new THREE.PointLight('#ffd885', 2.4, 14);
    candleLight.position.set(0, 1.55, 0);
    group.add(candleLight);

    // Golden ground sanctuary ring around the painting & candle stand
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.65, 1.82, 36),
      new THREE.MeshBasicMaterial({
        color: 0xf5d79c,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);

    // Position the candle shrine slightly to the road-side of today's painting monument
    const roadPt = paintingNode.roadPosition;
    const artPt = paintingNode.position;
    const shrineX = artPt.x * 0.68 + roadPt.x * 0.32;
    const shrineZ = artPt.z + 1.55;
    group.position.set(shrineX, roadPt.y, shrineZ);

    this.app.district.streetGroup.add(group);
    this.candleMarkerGroup = group;
  }

  async walkCurrentDayIn3D(openCardAfter = false) {
    if (!this.activeEntry) {
      await this.loadDayEntry(this.currentDay);
    }
    const entry = this.activeEntry;
    if (!entry) return;

    this.app.walkMode = 'DAILY';
    this.app.saveData.walkMode = 'DAILY';
    this.app.applyAccessibilitySettings();

    if (this.app.currentDistrictSlug !== entry.bookInfo.slug || this.app.mode === 'GATEHOUSE') {
      await this.app.switchDistrict(entry.bookInfo.slug);
    } else if (this.app.mode === 'SCENE') {
      this.app.exitStepThroughSceneToStreet();
    }

    this.app.closeAllModals();
    this.app.jumpToPaintingOnStreet(entry.painting.n, false);

    const node = this.app.district?.paintingNodes?.find(
      (n) => n.data.n === entry.painting.n
    );
    if (node) {
      this.mount3DCandleShrineAtPainting(node);
    }

    this.updateHUDCandlePill();
    if (openCardAfter) {
      this.openDailyWalkModal(this.currentDay);
    } else {
      this.app.showToast(
        `🕯 Daily Walk · Day ${entry.day}: “${entry.painting.title}” (${entry.painting.ref})`
      );
    }
  }

  async openDailyWalkModal(dayNum = this.currentDay) {
    await this.loadDayEntry(dayNum);
    this.renderDailyWalkModal();
    this.app.openModal('daily-walk-modal');
  }

  renderDailyWalkModal() {
    const entry = this.activeEntry;
    if (!entry) return;

    const zh = this.isZh();
    const totalDays = this.getTotalDays();
    const completedCount = this.getCompletedCount();
    const isCompleted = this.isDayCompleted(entry.day);

    // 1. Header & Candle Status
    const eyebrowEl = document.getElementById('dw-modal-eyebrow');
    const candleStatusEl = document.getElementById('dw-candle-status');
    const modalTitleEl = document.querySelector('#daily-walk-modal .poem-title');
    const modalSubEl = document.querySelector('#daily-walk-modal > .modal-card > .poem-ref');
    if (eyebrowEl) {
      eyebrowEl.textContent = zh
        ? this.zh(`每日灵修同行 · 第 ${entry.day} / ${totalDays} 天 · 第 ${entry.week} 周（第 ${entry.dayOfWeek} / 7 天）`)
        : `THE DAILY WALK · DAY ${entry.day} OF ${totalDays} · WEEK ${entry.week} (DAY ${entry.dayOfWeek} OF 7)`;
    }
    if (modalTitleEl) {
      modalTitleEl.textContent = zh ? this.zh('每日同行 · 圣经诗画灵修与默想') : 'Daily Walk Devotional & Reflection';
    }
    if (modalSubEl) {
      modalSubEl.textContent = zh
        ? this.zh('按圣经叙事顺序走过全部 44 卷书，每日一幅画作、一首诗歌、一段经文与一句心灵默想。')
        : 'One painting, poem, Scripture, and reflection prompt a day across all 44 books in storyline order.';
    }
    if (candleStatusEl) {
      candleStatusEl.innerHTML = zh
        ? this.zh(`
        <span class="dw-flame-icon">🕯</span>
        <span>
          <strong>已点亮 ${completedCount} 天</strong> ·
          ${isCompleted ? '✦ 今日烛光已点亮' : '这盏烛火永不熄灭——它总是安静地等候你归来'}
        </span>
      `)
        : `
        <span class="dw-flame-icon">🕯</span>
        <span>
          <strong>${completedCount} ${completedCount === 1 ? 'Day' : 'Days'} Kindled</strong> ·
          ${isCompleted ? '✦ Today’s candle is lit' : 'The candle never goes out—it quietly waits for you'}
        </span>
      `;
    }

    // 2. Book & Day Selector Dropdowns
    const bookSelect = document.getElementById('dw-book-select');
    if (bookSelect && this.indexData?.books) {
      bookSelect.innerHTML = '';
      this.indexData.books.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.startDay;
        const bName = (zh && b.zh_title) || b.title;
        opt.textContent = zh
          ? this.zh(`#${b.bookNum} · 《${bName}》（第 ${b.startDay}–${b.endDay} 天）`)
          : `#${b.bookNum} · ${b.title} (Days ${b.startDay}–${b.endDay})`;
        bookSelect.appendChild(opt);
      });
      bookSelect.value = entry.bookInfo.startDay;
    }

    const dayInput = document.getElementById('dw-day-input');
    if (dayInput) {
      dayInput.value = entry.day;
      dayInput.max = totalDays;
    }

    // 3. 7-Day Week Strip (so a full week of daily walks can be walked end-to-end)
    const weekStrip = document.getElementById('dw-week-strip');
    if (weekStrip) {
      const weekStartDay = (entry.week - 1) * 7 + 1;
      const weekEndDay = Math.min(totalDays, weekStartDay + 6);
      let html = `
        <button class="scene-jump-btn" id="dw-prev-week-btn" ${weekStartDay <= 1 ? 'disabled' : ''}>◀ ${
          zh ? this.zh(`第 ${entry.week - 1} 周`) : `Week ${entry.week - 1}`
        }</button>
      `;
      for (let d = weekStartDay; d <= weekEndDay; d++) {
        const dayIdxInWeek = d - weekStartDay + 1;
        const done = this.isDayCompleted(d);
        const active = d === entry.day;
        html += `
          <button class="dw-week-day-btn ${active ? 'active-day' : ''} ${done ? 'completed-day' : ''}" data-dw-day="${d}">
            <span class="dw-wd-top">${zh ? this.zh(`第 ${dayIdxInWeek} 天`) : `Day ${dayIdxInWeek}`}</span>
            <span class="dw-wd-sub">${done ? (zh ? this.zh('✦ 已亮') : '✦ Lit') : '○'} #${d}</span>
          </button>
        `;
      }
      html += `
        <button class="scene-jump-btn" id="dw-next-week-btn" ${weekEndDay >= totalDays ? 'disabled' : ''}>${
          zh ? this.zh(`第 ${entry.week + 1} 周`) : `Week ${entry.week + 1}`
        } ▶</button>
      `;
      weekStrip.innerHTML = html;

      weekStrip.querySelectorAll('[data-dw-day]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          this.saveCurrentJournalNote();
          const targetDay = parseInt(btn.getAttribute('data-dw-day'), 10);
          await this.loadDayEntry(targetDay);
          this.renderDailyWalkModal();
        });
      });

      document.getElementById('dw-prev-week-btn')?.addEventListener('click', async () => {
        if (weekStartDay > 1) {
          this.saveCurrentJournalNote();
          await this.loadDayEntry(Math.max(1, entry.day - 7));
          this.renderDailyWalkModal();
        }
      });
      document.getElementById('dw-next-week-btn')?.addEventListener('click', async () => {
        if (weekEndDay < totalDays) {
          this.saveCurrentJournalNote();
          await this.loadDayEntry(Math.min(totalDays, entry.day + 7));
          this.renderDailyWalkModal();
        }
      });
    }

    // 4. Painting, Title, Scripture, Epigraph & Full Verbatim Poem
    const imgEl = document.getElementById('dw-painting-img');
    const bookBadgeEl = document.getElementById('dw-painting-book-badge');
    const titleEl = document.getElementById('dw-painting-title');
    const refEl = document.getElementById('dw-painting-ref');
    const epigraphEl = document.getElementById('dw-painting-epigraph');
    const poemEl = document.getElementById('dw-painting-poem');
    const promptEl = document.getElementById('dw-reflection-prompt-text');
    const promptLabelEl = document.querySelector('#daily-walk-modal .reflection-callout-label');
    const journalLabelEl = document.querySelector('#daily-walk-modal .dw-journal-box label');

    const pTitle = zh && entry.painting.zh_title ? this.zh(entry.painting.zh_title) : entry.painting.title;
    const pRef = zh && entry.painting.zh_ref ? this.zh(entry.painting.zh_ref) : entry.painting.ref;
    const pPoem = zh && entry.painting.zh_poem ? this.zh(entry.painting.zh_poem) : entry.painting.poem;
    const pPrompt = zh && entry.painting.zh_reflectionPrompt ? this.zh(entry.painting.zh_reflectionPrompt) : entry.painting.reflectionPrompt;
    const pEpigraph = zh && entry.painting.zh_epigraph ? this.zh(entry.painting.zh_epigraph) : entry.painting.epigraph;
    const bTitle = zh && entry.bookInfo.zh_title ? this.zh(entry.bookInfo.zh_title) : entry.bookInfo.title;
    const partTitle = entry.partObj ? (zh && entry.partObj.zh_title ? this.zh(entry.partObj.zh_title) : entry.partObj.title) : '';

    if (imgEl) {
      imgEl.src = entry.painting.webSrc;
      imgEl.alt = `${pTitle} — ${pRef}`;
    }
    if (bookBadgeEl) {
      const partLabel = partTitle ? ` · ${partTitle}` : '';
      bookBadgeEl.textContent = zh
        ? this.zh(`第 #${entry.bookInfo.bookNum} 卷：《${bTitle}》· 第 ${entry.painting.n} / ${entry.bookInfo.count} 首${partLabel}`)
        : `BOOK #${entry.bookInfo.bookNum}: ${bTitle.toUpperCase()} · POEM NO. ${entry.painting.n} OF ${entry.bookInfo.count}${partLabel.toUpperCase()}`;
    }
    if (titleEl) titleEl.textContent = pTitle;
    if (refEl) refEl.textContent = pRef;
    if (epigraphEl) {
      if (pEpigraph) {
        epigraphEl.textContent = pEpigraph;
        epigraphEl.classList.remove('hidden');
      } else {
        epigraphEl.classList.add('hidden');
      }
    }
    if (poemEl) poemEl.textContent = pPoem;
    if (promptLabelEl) {
      promptLabelEl.textContent = zh ? this.zh('✦ 今日心灵默想') : '✦ Today’s Reflection Prompt';
    }
    if (promptEl) {
      promptEl.textContent =
        pPrompt ||
        (zh
          ? this.zh(`在今天的旅途中，你在何处看见《${pTitle}》（${pRef}）中的这一幕？`)
          : `Where do you recognize this moment from “${pTitle}” (${pRef}) on your own walk today?`);
    }

    // 5. Personal Reflection Journal Input
    const noteEl = document.getElementById('daily-journal-input');
    if (journalLabelEl) {
      journalLabelEl.textContent = zh
        ? this.zh('个人灵修 / 祷告笔记（保存在您的浏览器中）：')
        : 'Personal Reflection / Prayer Note (Saved in Your Browser):';
    }
    if (noteEl) {
      noteEl.placeholder = zh
        ? this.zh('写下今日同行的一行安静默想或祷告……')
        : 'Write a quiet line of reflection or prayer for today’s walk…';
      noteEl.value = this.app.saveData.dailyWalk?.journalNotes?.[entry.day] || '';
    }

    // 6. Action Buttons (Step Through / Walk in 3D / Complete & Next Day)
    const prevBtn = document.getElementById('dw-btn-prev-day');
    const nextBtn = document.getElementById('dw-btn-next-day');
    const readAloudBtn = document.getElementById('dw-btn-read-aloud');
    const shareBtn = document.getElementById('dw-btn-share');
    if (prevBtn) prevBtn.textContent = zh ? this.zh('◀ 上一天') : '◀ Prev Day';
    if (nextBtn) nextBtn.textContent = zh ? this.zh('下一天 ▶') : 'Next Day ▶';
    if (readAloudBtn && !this.isSpeaking) {
      readAloudBtn.textContent = this.getListenBtnLabel();
    }
    if (shareBtn) shareBtn.textContent = zh ? this.zh('📋 复制灵修内容') : '📋 Copy Devotional';

    const walk3DBtn = document.getElementById('dw-btn-walk-3d');
    if (walk3DBtn) {
      walk3DBtn.textContent = entry.painting.isScene
        ? (zh ? this.zh(`✦ 步入 3D 画境：《${pTitle}》`) : `✦ Walk & Step Inside “${pTitle}” in 3D`)
        : (zh ? this.zh(`✦ 在 3D 街道驻足《${pTitle}》画前`) : `✦ Stand Before “${pTitle}” on the 3D Street`);
    }

    const completeBtn = document.getElementById('dw-btn-complete-day');
    if (completeBtn) {
      const nextDay = Math.min(totalDays, entry.day + 1);
      completeBtn.textContent = isCompleted
        ? (zh ? this.zh(`✦ 第 ${entry.day} 天已点亮 · 继续前往第 ${nextDay} 天 →`) : `✦ Day ${entry.day} Lit · Continue to Day ${nextDay} →`)
        : (zh ? this.zh(`🕯 点亮第 ${entry.day} 天烛光并前往第 ${nextDay} 天 →`) : `🕯 Light Day ${entry.day}’s Candle & Continue to Day ${nextDay} →`);
    }
  }

  // ==========================================================================
  // FISH AUDIO "SELENE" (modelId: b347db033a6549378b48d00acb0d06cd) VOICE ENGINE
  // Supports both English (assets/audio/selene/day-N.mp3) and Mandarin Chinese (assets/audio/selene-zh/day-N.mp3)
  // ==========================================================================
  formatNarrationText(painting) {
    if (!painting) return '';
    if (this.isZh()) {
      const t = painting.zh_title || painting.title;
      const r = painting.zh_ref || painting.ref;
      const ep = painting.zh_epigraph || painting.epigraph;
      const pm = painting.zh_poem || painting.poem;
      const pr = painting.zh_reflectionPrompt || painting.reflectionPrompt;
      return [
        `${t}。`,
        `${r}。`,
        ep ? `${ep.replace(/[“”"]/g, '')}。` : '',
        pm,
        pr ? `今日默想：${pr}` : ''
      ]
        .filter(Boolean)
        .join('\n\n');
    }
    const parts = [
      `${painting.title}.`,
      `${painting.ref}.`,
      painting.epigraph ? `${painting.epigraph.replace(/[“”"]/g, '')}.` : '',
      painting.poem,
      painting.reflectionPrompt
        ? `Reflection for your walk: ${painting.reflectionPrompt}`
        : ''
    ].filter(Boolean);
    return parts.join('\n\n');
  }

  getFishStudioSeleneUrl(painting) {
    const text = this.formatNarrationText(painting);
    const params = new URLSearchParams({
      modelId: FISH_SELENE_MODEL_ID,
      text,
      from: 'discovery',
      sec: 'default_voices'
    });
    return `https://fish.audio/app/text-to-speech/?${params.toString()}`;
  }

  openFishStudioForPainting(painting) {
    if (!painting) return;
    const url = this.getFishStudioSeleneUrl(painting);
    window.open(url, '_blank', 'noopener,noreferrer');
    this.app.showToast('🎙 Opened Fish Audio Studio with Selene pre-filled with this poem & reflection!');
  }

  openSeleneCacheDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SELENE_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('clips')) {
          db.createObjectStore('clips');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getCachedSeleneBlob(cacheKey) {
    try {
      const db = await this.openSeleneCacheDB();
      return await new Promise((resolve) => {
        const tx = db.transaction('clips', 'readonly');
        const req = tx.objectStore('clips').get(cacheKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  }

  async setCachedSeleneBlob(cacheKey, blob) {
    try {
      const db = await this.openSeleneCacheDB();
      await new Promise((resolve) => {
        const tx = db.transaction('clips', 'readwrite');
        tx.objectStore('clips').put(blob, cacheKey);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (_) {
      // Ignore storage quota errors
    }
  }

  stopActiveVoice(btnEl = null, defaultLabel = null) {
    const lbl = defaultLabel || this.getListenBtnLabel();
    if (this.activeAudioEl) {
      this.activeAudioEl.pause();
      this.activeAudioEl.currentTime = 0;
      this.activeAudioEl = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    if (this.app.audio && this.app.audio.setVoiceDucking) {
      this.app.audio.setVoiceDucking(false);
    }
    const b1 = document.getElementById('dw-btn-read-aloud');
    const b2 = document.getElementById('poem-modal-selene-btn');
    if (b1) b1.textContent = this.getListenBtnLabel();
    if (b2) b2.textContent = this.getListenBtnLabel();
    if (btnEl) btnEl.textContent = lbl;
  }

  async playAudioBlob(blobOrUrl, btnEl, defaultLabel) {
    const lbl = defaultLabel || this.getListenBtnLabel();
    this.stopActiveVoice(btnEl, lbl);
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const audio = new Audio(url);
    this.activeAudioEl = audio;
    this.isSpeaking = true;
    if (this.app.audio && this.app.audio.setVoiceDucking) {
      this.app.audio.setVoiceDucking(true);
    }
    if (btnEl) btnEl.textContent = this.isZh() ? this.zh('⏹ 停止朗读') : '⏹ Stop Selene';
    audio.onended = () => {
      this.stopActiveVoice(btnEl, lbl);
    };
    audio.onerror = () => {
      this.stopActiveVoice(btnEl, lbl);
    };
    await audio.play();
  }

  async speakPaintingWithSelene(painting, btnEl = null, defaultLabel = null) {
    const lbl = defaultLabel || this.getListenBtnLabel();
    if (!painting) return;
    if (this.isSpeaking) {
      this.stopActiveVoice(btnEl, lbl);
      return;
    }

    const dayNum = painting.dailyWalkDay || this.currentDay;
    const zh = this.isZh();
    const folder = zh ? 'selene-zh' : 'selene';
    const staticUrl = `assets/audio/${folder}/day-${dayNum}.mp3`;
    try {
      await this.playAudioBlob(staticUrl, btnEl, lbl);
      return;
    } catch (err) {
      console.warn('Selene MP3 playback fallback:', err);
    }

    // 2. Gentle serene voice fallback in the active language (zh-CN or en)
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const text = this.formatNarrationText(painting);
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = zh ? 'zh-CN' : 'en-US';
      const voices = synth.getVoices();
      const targetVoice = zh
        ? voices.find((v) => /zh|cmn|ting-ting|meijia|sin-ji|xiaoxiao/i.test(v.lang + ' ' + v.name))
        : voices.find((v) => /samantha|ava|allison|serena|victoria|karen|moira|natural/i.test(v.name) && /en/i.test(v.lang)) ||
          voices.find((v) => /en/i.test(v.lang));
      if (targetVoice) utter.voice = targetVoice;
      utter.rate = zh ? 0.92 : 0.86;
      utter.pitch = 0.96;
      utter.onend = () => {
        this.stopActiveVoice(btnEl, lbl);
      };
      this.isSpeaking = true;
      if (this.app.audio && this.app.audio.setVoiceDucking) {
        this.app.audio.setVoiceDucking(true);
      }
      if (btnEl) btnEl.textContent = zh ? this.zh('⏹ 停止朗读') : '⏹ Stop Reading';
      synth.speak(utter);
    }
  }

  speakCurrentDevotional() {
    if (!this.activeEntry) return;
    const btn = document.getElementById('dw-btn-read-aloud');
    this.speakPaintingWithSelene(this.activeEntry.painting, btn, this.getListenBtnLabel());
  }

  async copyCurrentDevotionalShareText() {
    if (!this.activeEntry) return;
    this.saveCurrentJournalNote();
    const e = this.activeEntry;
    const zh = this.isZh();
    const note = this.app.saveData.dailyWalk?.journalNotes?.[e.day];
    const shareText = zh
      ? this.zh(
          [
            `🕯 天路同行 — 每日灵修（第 ${e.day} / ${this.getTotalDays()} 天）`,
            `第 #${e.bookInfo.bookNum} 卷：《${e.bookInfo.zh_title || e.bookInfo.title}》（${e.bookInfo.zh_subtitle || e.bookInfo.subtitle}）`,
            `第 ${e.painting.n} 首：《${e.painting.zh_title || e.painting.title}》 — ${e.painting.zh_ref || e.painting.ref}`,
            e.painting.zh_epigraph || e.painting.epigraph || null,
            '',
            e.painting.zh_poem || e.painting.poem,
            '',
            `✦ 今日心灵默想：${e.painting.zh_reflectionPrompt || e.painting.reflectionPrompt}`,
            note ? `\n我的默想笔记：\n${note}` : null,
            '',
            'Poems & Pictures by Timothy Holt · InspiringYourFaith.org'
          ]
            .filter((line) => line !== null)
            .join('\n')
        )
      : [
          `🕯 The Pilgrim Walk — Daily Walk (Day ${e.day} of ${this.getTotalDays()})`,
          `Book #${e.bookInfo.bookNum}: ${e.bookInfo.title} (${e.bookInfo.subtitle})`,
          `Poem No. ${e.painting.n}: “${e.painting.title}” — ${e.painting.ref}`,
          e.painting.epigraph ? `${e.painting.epigraph}` : null,
          '',
          e.painting.poem,
          '',
          `✦ Reflection Prompt: ${e.painting.reflectionPrompt}`,
          note ? `\nMy Reflection:\n${note}` : null,
          '',
          'Poems & Pictures by Timothy Holt · InspiringYourFaith.org'
        ]
          .filter((line) => line !== null)
          .join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      this.app.showToast(
        zh
          ? this.zh('📋 已复制今日诗歌、经文与默想到剪贴板！')
          : '📋 Copied today’s poem, Scripture & reflection to your clipboard!'
      );
    } catch (_) {
      this.app.showToast(zh ? this.zh('已准备今日灵修内容。') : 'Prepared today’s devotional reflection.');
    }
  }

  bindUI() {
    const hudBtn = document.getElementById('btn-daily-walk');
    if (hudBtn) {
      hudBtn.addEventListener('click', () => {
        this.openDailyWalkModal(this.currentDay);
      });
    }

    const bookSelect = document.getElementById('dw-book-select');
    if (bookSelect) {
      bookSelect.addEventListener('change', async (e) => {
        this.saveCurrentJournalNote();
        const startDay = parseInt(e.target.value, 10) || 1;
        await this.loadDayEntry(startDay);
        this.renderDailyWalkModal();
      });
    }

    const dayInput = document.getElementById('dw-day-input');
    const dayGoBtn = document.getElementById('dw-day-go-btn');
    const jumpToInputDay = async () => {
      if (!dayInput) return;
      this.saveCurrentJournalNote();
      const d = parseInt(dayInput.value, 10);
      if (!isNaN(d)) {
        await this.loadDayEntry(d);
        this.renderDailyWalkModal();
      }
    };
    if (dayGoBtn) dayGoBtn.addEventListener('click', jumpToInputDay);
    if (dayInput) {
      dayInput.addEventListener('change', jumpToInputDay);
    }

    const prevDayBtn = document.getElementById('dw-btn-prev-day');
    if (prevDayBtn) {
      prevDayBtn.addEventListener('click', async () => {
        this.saveCurrentJournalNote();
        if (this.currentDay > 1) {
          await this.loadDayEntry(this.currentDay - 1);
          this.renderDailyWalkModal();
        }
      });
    }

    const nextDayBtn = document.getElementById('dw-btn-next-day');
    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', async () => {
        this.saveCurrentJournalNote();
        if (this.currentDay < this.getTotalDays()) {
          await this.loadDayEntry(this.currentDay + 1);
          this.renderDailyWalkModal();
        }
      });
    }

    const completeBtn = document.getElementById('dw-btn-complete-day');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        this.markCurrentDayCompleted();
        const finishedDay = this.currentDay;
        const nextDay = Math.min(this.getTotalDays(), finishedDay + 1);
        await this.loadDayEntry(nextDay);
        this.renderDailyWalkModal();
        this.app.showToast(
          `🕯 Day ${finishedDay} candle kindled! Advanced to Day ${nextDay} (${this.activeEntry.bookInfo.title} · “${this.activeEntry.painting.title}”).`
        );
      });
    }

    const walk3DBtn = document.getElementById('dw-btn-walk-3d');
    if (walk3DBtn) {
      walk3DBtn.addEventListener('click', async () => {
        this.saveCurrentJournalNote();
        const isScene = this.activeEntry?.painting?.isScene;
        const paintingNum = this.activeEntry?.painting?.n;
        await this.walkCurrentDayIn3D(false);
        if (isScene && paintingNum) {
          this.app.jumpToPaintingOnStreet(paintingNum, true);
        }
      });
    }

    const readAloudBtn = document.getElementById('dw-btn-read-aloud');
    if (readAloudBtn) {
      readAloudBtn.addEventListener('click', () => this.speakCurrentDevotional());
    }

    const fishStudioBtn = document.getElementById('dw-btn-fish-studio');
    if (fishStudioBtn) {
      fishStudioBtn.addEventListener('click', () => {
        if (this.activeEntry?.painting) {
          this.openFishStudioForPainting(this.activeEntry.painting);
        }
      });
    }

    const uploadMp3Input = document.getElementById('dw-upload-selene-mp3');
    if (uploadMp3Input) {
      uploadMp3Input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file || !this.activeEntry) return;
        const dayNum = this.activeEntry.day;
        await this.setCachedSeleneBlob(`selene-day-${dayNum}`, file);
        this.app.showToast(
          `✦ Saved Selene voice recording "${file.name}" for Day ${dayNum}! Playing now…`
        );
        const btn = document.getElementById('dw-btn-read-aloud');
        await this.playAudioBlob(file, btn, '🔊 Listen (Selene)');
      });
    }

    const keyToggleBtn = document.getElementById('dw-btn-selene-key');
    const keyBar = document.getElementById('dw-selene-key-bar');
    const keyInput = document.getElementById('dw-fish-api-key-input');
    const keySaveBtn = document.getElementById('dw-fish-api-key-save');
    if (keyInput && this.fishApiKey) {
      keyInput.value = this.fishApiKey;
    }
    if (keyToggleBtn && keyBar) {
      keyToggleBtn.addEventListener('click', () => {
        keyBar.classList.toggle('hidden');
      });
    }
    if (keySaveBtn && keyInput) {
      keySaveBtn.addEventListener('click', () => {
        this.fishApiKey = keyInput.value.trim();
        if (this.fishApiKey) {
          localStorage.setItem(FISH_KEY_STORAGE, this.fishApiKey);
          this.app.showToast(
            '✦ Saved Fish Audio API key! Clicking "🔊 Listen (Selene)" will now synthesize with Selene (b347db033a6549378b48d00acb0d06cd).'
          );
        } else {
          localStorage.removeItem(FISH_KEY_STORAGE);
          this.app.showToast('Cleared Fish Audio API key.');
        }
        if (keyBar) keyBar.classList.add('hidden');
      });
    }

    const shareBtn = document.getElementById('dw-btn-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.copyCurrentDevotionalShareText());
    }

    const noteEl = document.getElementById('daily-journal-input');
    if (noteEl) {
      noteEl.addEventListener('blur', () => this.saveCurrentJournalNote());
    }

    // Keyboard shortcut [J] opens Daily Walk Devotional Card when no text input is focused
    window.addEventListener('keydown', (e) => {
      if (
        e.target &&
        (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'KeyJ') {
        e.preventDefault();
        const modal = document.getElementById('daily-walk-modal');
        if (modal && !modal.classList.contains('hidden')) {
          this.saveCurrentJournalNote();
          this.app.closeAllModals();
        } else {
          this.openDailyWalkModal(this.currentDay);
        }
      }
    });
  }
}
