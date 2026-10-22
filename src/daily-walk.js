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

export class DailyWalkManager {
  constructor(app) {
    this.app = app;
    this.THREE = app.districtBuilder.THREE;
    this.indexData = null;
    this.currentDay = 1;
    this.activeEntry = null;
    this.candleMarkerGroup = null;
    this.isSpeaking = false;
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

  updateHUDCandlePill() {
    const btn = document.getElementById('btn-daily-walk');
    if (!btn) return;
    const count = this.getCompletedCount();
    const isDailyMode = this.app.walkMode === 'DAILY';
    btn.classList.toggle('active-pill', isDailyMode);
    btn.textContent = `🕯 Daily Walk · Day ${this.currentDay} (${count} Lit)`;

    // Update floating Daily Walk banner when walking in 3D Daily Walk mode
    const banner = document.getElementById('daily-walk-hud-banner');
    if (banner) {
      if (isDailyMode && this.activeEntry && this.app.mode === 'STREET') {
        const e = this.activeEntry;
        const doneBadge = this.isDayCompleted(e.day) ? '✦ Candle Kindled' : '🕯 Candle Waiting';
        banner.innerHTML = `
          <div class="dw-banner-top">
            <span class="dw-banner-eyebrow">🕯 DAILY WALK · DAY ${e.day} OF ${this.getTotalDays()} (WEEK ${e.week}, DAY ${e.dayOfWeek} OF 7) · ${doneBadge}</span>
            <span class="dw-banner-book">Book #${e.bookInfo.bookNum}: ${e.bookInfo.title} · No. ${e.painting.n} “${e.painting.title}” (${e.painting.ref})</span>
          </div>
          <div class="dw-banner-prompt">
            <strong>Reflection Prompt:</strong> ${e.painting.reflectionPrompt}
          </div>
          <div class="dw-banner-actions">
            <button id="dw-banner-open-card" class="scene-jump-btn">📖 Read Poem &amp; Reflect [J]</button>
            <button id="dw-banner-focus-art" class="scene-jump-btn">✦ Stand Before Painting</button>
            <button id="dw-banner-prev-day" class="scene-jump-btn">◀ Day ${Math.max(1, e.day - 1)}</button>
            <button id="dw-banner-complete-next" class="scene-jump-btn dw-gold-pill">✦ Complete Day ${e.day} &amp; Walk Day ${Math.min(this.getTotalDays(), e.day + 1)} →</button>
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
          this.app.showToast(`🕯 Day ${nextD - 1} candle kindled! Now walking Day ${nextD}: “${this.activeEntry.painting.title}” (${this.activeEntry.painting.ref}).`);
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

    const totalDays = this.getTotalDays();
    const completedCount = this.getCompletedCount();
    const isCompleted = this.isDayCompleted(entry.day);

    // 1. Header & Candle Status
    const eyebrowEl = document.getElementById('dw-modal-eyebrow');
    const candleStatusEl = document.getElementById('dw-candle-status');
    if (eyebrowEl) {
      eyebrowEl.textContent = `THE DAILY WALK · DAY ${entry.day} OF ${totalDays} · WEEK ${entry.week} (DAY ${entry.dayOfWeek} OF 7)`;
    }
    if (candleStatusEl) {
      candleStatusEl.innerHTML = `
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
      if (bookSelect.options.length === 0) {
        this.indexData.books.forEach((b) => {
          const opt = document.createElement('option');
          opt.value = b.startDay;
          opt.textContent = `#${b.bookNum} · ${b.title} (Days ${b.startDay}–${b.endDay})`;
          bookSelect.appendChild(opt);
        });
      }
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
        <button class="scene-jump-btn" id="dw-prev-week-btn" ${weekStartDay <= 1 ? 'disabled' : ''}>◀ Week ${entry.week - 1}</button>
      `;
      for (let d = weekStartDay; d <= weekEndDay; d++) {
        const dayIdxInWeek = d - weekStartDay + 1;
        const done = this.isDayCompleted(d);
        const active = d === entry.day;
        html += `
          <button class="dw-week-day-btn ${active ? 'active-day' : ''} ${done ? 'completed-day' : ''}" data-dw-day="${d}">
            <span class="dw-wd-top">Day ${dayIdxInWeek}</span>
            <span class="dw-wd-sub">${done ? '✦ Lit' : '○'} #${d}</span>
          </button>
        `;
      }
      html += `
        <button class="scene-jump-btn" id="dw-next-week-btn" ${weekEndDay >= totalDays ? 'disabled' : ''}>Week ${entry.week + 1} ▶</button>
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

    if (imgEl) {
      imgEl.src = entry.painting.webSrc;
      imgEl.alt = `${entry.painting.title} — ${entry.painting.ref}`;
    }
    if (bookBadgeEl) {
      const partLabel = entry.partObj ? ` · ${entry.partObj.title}` : '';
      bookBadgeEl.textContent = `BOOK #${entry.bookInfo.bookNum}: ${entry.bookInfo.title.toUpperCase()} · POEM NO. ${entry.painting.n} OF ${entry.bookInfo.count}${partLabel.toUpperCase()}`;
    }
    if (titleEl) titleEl.textContent = entry.painting.title;
    if (refEl) refEl.textContent = entry.painting.ref;
    if (epigraphEl) {
      if (entry.painting.epigraph) {
        epigraphEl.textContent = entry.painting.epigraph;
        epigraphEl.classList.remove('hidden');
      } else {
        epigraphEl.classList.add('hidden');
      }
    }
    if (poemEl) poemEl.textContent = entry.painting.poem;
    if (promptEl) {
      promptEl.textContent =
        entry.painting.reflectionPrompt ||
        `Where do you recognize this moment from “${entry.painting.title}” (${entry.painting.ref}) on your own walk today?`;
    }

    // 5. Personal Reflection Journal Input
    const noteEl = document.getElementById('daily-journal-input');
    if (noteEl) {
      noteEl.value = this.app.saveData.dailyWalk?.journalNotes?.[entry.day] || '';
    }

    // 6. Action Buttons (Step Through / Walk in 3D / Complete & Next Day)
    const walk3DBtn = document.getElementById('dw-btn-walk-3d');
    if (walk3DBtn) {
      walk3DBtn.textContent = entry.painting.isScene
        ? `✦ Walk & Step Inside “${entry.painting.title}” in 3D`
        : `✦ Stand Before “${entry.painting.title}” on the 3D Street`;
    }

    const completeBtn = document.getElementById('dw-btn-complete-day');
    if (completeBtn) {
      const nextDay = Math.min(totalDays, entry.day + 1);
      completeBtn.textContent = isCompleted
        ? `✦ Day ${entry.day} Lit · Continue to Day ${nextDay} →`
        : `🕯 Light Day ${entry.day}’s Candle & Continue to Day ${nextDay} →`;
    }
  }

  speakCurrentDevotional() {
    if (!('speechSynthesis' in window) || !this.activeEntry) {
      this.app.showToast('Read-aloud speech synthesis is not available on this browser.');
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      this.isSpeaking = false;
      const btn = document.getElementById('dw-btn-read-aloud');
      if (btn) btn.textContent = '🔊 Read Aloud';
      return;
    }

    const e = this.activeEntry;
    const text = `${e.painting.title}. ${e.painting.ref}. ${e.painting.epigraph || ''}.\n\n${e.painting.poem}.\n\nReflection for today's walk: ${e.painting.reflectionPrompt}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.88;
    utter.pitch = 0.98;
    utter.onend = () => {
      this.isSpeaking = false;
      const btn = document.getElementById('dw-btn-read-aloud');
      if (btn) btn.textContent = '🔊 Read Aloud';
    };
    this.isSpeaking = true;
    const btn = document.getElementById('dw-btn-read-aloud');
    if (btn) btn.textContent = '⏹ Stop Reading';
    synth.speak(utter);
  }

  async copyCurrentDevotionalShareText() {
    if (!this.activeEntry) return;
    this.saveCurrentJournalNote();
    const e = this.activeEntry;
    const note = this.app.saveData.dailyWalk?.journalNotes?.[e.day];
    const shareText = [
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
      this.app.showToast('📋 Copied today’s poem, Scripture & reflection to your clipboard!');
    } catch (_) {
      this.app.showToast('Prepared today’s devotional reflection.');
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
