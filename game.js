// Helicopter Survivors — Platanus Hack 26: CDMX Edition

const GW = 800, GH = 600;
const SK = 'heli-surv-v1';

const C = {
  sky: 0x0a1525, skyH: 0x152235,
  ground: 0x1e2e10, groundAlt: 0x253816,
  player: 0x00cc77, pDark: 0x005533, cockpit: 0x77bbff, rotor: 0x99ffcc,
  bCannon: 0xffee00, bMissile: 0xff7700, bBomb: 0xff4400,
  eInfantry: 0xff2200, eDrone: 0xbb00ee, eTank: 0x775522, eAA: 0x993300, eBoss: 0xff0044,
  eBullet: 0xff6600,
  xpOrb: 0x22aaff,
  exp: 0xff8800,
  hp: 0xff2200, xpC: 0x2244ff, acc: 0x00ff88,
  dark: 0x050810, white: 0xffffff,
};

// DO NOT remove or reorder existing keys — they match physical cabinet wiring
const CABINET_KEYS = {
  P1_U: ['w'],  P1_D: ['s'],  P1_L: ['a'],  P1_R: ['d'],
  P1_1: ['u'],  P1_2: ['i'],  P1_3: ['o'],
  P1_4: ['j'],  P1_5: ['k'],  P1_6: ['l'],
  P2_U: ['ArrowUp'],  P2_D: ['ArrowDown'],  P2_L: ['ArrowLeft'],  P2_R: ['ArrowRight'],
  P2_1: ['r'],  P2_2: ['t'],  P2_3: ['y'],
  P2_4: ['f'],  P2_5: ['g'],  P2_6: ['h'],
  START1: ['Enter'],  START2: ['2'],
};
const KM = {};
for (const [code, keys] of Object.entries(CABINET_KEYS))
  for (const k of keys) KM[k.toLowerCase()] = code;

// ─── WAVE DATA ───────────────────────────────────────────────────────────────
const WAVES = [
  { t:0,   types:['infantry'],                    rate:2200, cnt:2, hm:1.0, dm:1.0 },
  { t:20,  types:['infantry','drone'],             rate:1900, cnt:3, hm:1.2, dm:1.1 },
  { t:50,  types:['infantry','drone'],             rate:1700, cnt:4, hm:1.5, dm:1.3 },
  { t:90,  types:['infantry','drone','tank'],      rate:1400, cnt:5, hm:1.9, dm:1.6 },
  { t:130, types:['infantry','drone','tank','aa'], rate:1200, cnt:6, hm:2.4, dm:2.0 },
  { t:180, types:['drone','tank','aa'],            rate:1000, cnt:8, hm:3.2, dm:2.5 },
  { t:240, types:['drone','tank','aa'],            rate:800,  cnt:10,hm:4.5, dm:3.2 },
  { t:300, types:['drone','tank','aa','boss'],     rate:700,  cnt:12,hm:6.0, dm:4.0 },
];

// ─── WEAPON DATA ─────────────────────────────────────────────────────────────
const WD = {
  cannon:  { n:'FRONT CANNON', max:5, d:[12,16,22,30,40,55], c:[600,520,440,360,280,200], spd:580, rng:380 },
  missile: { n:'MISSILES',     max:5, d:[35,50,70,95,130,175], c:[2200,1900,1600,1300,1000,750], spd:210, rng:600 },
  bomb:    { n:'BOMB DROP',    max:5, d:[50,75,105,145,195,260], c:[3000,2600,2200,1800,1400,1100], r:[80,95,110,128,148,172] },
};

// ─── PASSIVE DATA ─────────────────────────────────────────────────────────────
const PD = {
  armor:  { n:'ARMOR PLATING', max:3, desc: lv => `-${[15,28,40][lv-1]}% incoming DMG` },
  speed:  { n:'AFTERBURNER',   max:3, desc: lv => `Move speed x${[1.2,1.4,1.65][lv-1]}` },
  cooler: { n:'COOLER SYSTEM', max:3, desc: lv => `Weapon CD x${[0.85,0.70,0.55][lv-1]}` },
  fuel:   { n:'FUEL TANKS',    max:2, desc: lv => `+${[50,100][lv-1]} max HP, +${[2,5][lv-1]} HP/s` },
};

// ─── ENEMY STATS ─────────────────────────────────────────────────────────────
const ES = {
  infantry:{ hp:30,  dmg:8,  spd:90,  xp:5,   sz:14, col:C.eInfantry, fr:0,   fcd:0,    gr:true  },
  drone:   { hp:22,  dmg:14, spd:155, xp:8,   sz:14, col:C.eDrone,    fr:0,   fcd:0,    gr:false },
  tank:    { hp:120, dmg:20, spd:35,  xp:25,  sz:28, col:C.eTank,     fr:300, fcd:3000, gr:true  },
  aa:      { hp:80,  dmg:18, spd:0,   xp:20,  sz:22, col:C.eAA,       fr:280, fcd:1800, gr:true  },
  boss:    { hp:800, dmg:30, spd:60,  xp:200, sz:44, col:C.eBoss,     fr:380, fcd:1200, gr:false },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function setupCtrl(scene) {
  scene._h = {}; scene._p = {};
  const dn = e => {
    const c = KM[e.key.toLowerCase()] || KM[e.key];
    if (c) { if (!scene._h[c]) scene._p[c] = true; scene._h[c] = true; }
  };
  const up = e => { const c = KM[e.key.toLowerCase()] || KM[e.key]; if (c) scene._h[c] = false; };
  window.addEventListener('keydown', dn);
  window.addEventListener('keyup', up);
  scene.events.once('shutdown', () => {
    window.removeEventListener('keydown', dn);
    window.removeEventListener('keyup', up);
  });
}
const held = (s, c) => !!s._h[c];
function consumed(s, ...cs) {
  for (const c of cs) if (s._p[c]) { s._p[c] = false; return true; }
  return false;
}
function getWave(t) {
  let w = WAVES[0];
  for (const wd of WAVES) { if (t >= wd.t) w = wd; else break; }
  return w;
}
function nearestEnemy(enemies, x, y) {
  let best = null, bestD = Infinity;
  for (const e of enemies.getChildren()) {
    if (!e.active) continue;
    const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}
function snd(scene, type) {
  try {
    const ctx = scene.sound?.context || new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    if (type === 'shoot') {
      o.type='square'; o.frequency.setValueAtTime(660,t); o.frequency.exponentialRampToValueAtTime(330,t+0.05);
      g.gain.setValueAtTime(0.07,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06); o.start(t); o.stop(t+0.06);
    } else if (type === 'missile') {
      o.type='sawtooth'; o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(110,t+0.12);
      g.gain.setValueAtTime(0.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.14); o.start(t); o.stop(t+0.14);
    } else if (type === 'boom') {
      o.type='sawtooth'; o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(30,t+0.3);
      g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.32); o.start(t); o.stop(t+0.32);
    } else if (type === 'hit') {
      o.type='square'; o.frequency.setValueAtTime(200,t); o.frequency.exponentialRampToValueAtTime(80,t+0.15);
      g.gain.setValueAtTime(0.14,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18); o.start(t); o.stop(t+0.18);
    } else if (type === 'xp') {
      o.type='sine'; o.frequency.setValueAtTime(880,t); o.frequency.exponentialRampToValueAtTime(1320,t+0.08);
      g.gain.setValueAtTime(0.05,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.09); o.start(t); o.stop(t+0.09);
    } else if (type === 'lvl') {
      o.type='triangle'; o.frequency.setValueAtTime(440,t); o.frequency.linearRampToValueAtTime(880,t+0.3);
      g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35); o.start(t); o.stop(t+0.35);
    } else if (type === 'select') {
      o.type='square'; o.frequency.setValueAtTime(660,t); o.frequency.exponentialRampToValueAtTime(880,t+0.08);
      g.gain.setValueAtTime(0.09,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1); o.start(t); o.stop(t+0.1);
    }
  } catch (_) {}
}
function startBgMusic(scene) {
  try {
    const ctx = scene.sound?.context || new AudioContext();
    const out = ctx.createGain(); out.gain.value = 0.14; out.connect(ctx.destination);
    const dly = ctx.createDelay(1.5), fb = ctx.createGain();
    dly.delayTime.value = 0.35; fb.gain.value = 0.22;
    dly.connect(fb); fb.connect(dly); fb.connect(out);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 900; filt.Q.value = 1.2;
    filt.connect(out); filt.connect(dly);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.06; lfoG.gain.value = 380;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start();
    [[110,'sawtooth',0],[110,'sawtooth',12],[130.81,'triangle',0],[164.81,'triangle',5],[196,'triangle',-4]].forEach(([f, type, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = d; g.gain.value = 0.025;
      o.connect(g); g.connect(filt); o.start();
    });
    const NOTES = [220, 261.63, 293.66, 329.63, 392], STEP = 0.4;
    const schedArp = t0 => {
      NOTES.forEach((freq, i) => {
        const t = t0 + i * STEP;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = freq; o.connect(g); g.connect(out); g.connect(dly);
        g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.6);
        o.start(t); o.stop(t + STEP * 0.7);
      });
      const len = NOTES.length * STEP;
      scene.time?.delayedCall((len - 0.05) * 1000, () => schedArp(t0 + len));
    };
    schedArp(ctx.currentTime + 0.3);
    const BEAT = 1.0;
    const schedBass = t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 55; o.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.start(t); o.stop(t + 0.55);
      scene.time?.delayedCall(BEAT * 1000, () => schedBass(t + BEAT));
    };
    schedBass(ctx.currentTime + 0.3);
  } catch (_) {}
}

// ─── MENU SCENE ──────────────────────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    setupCtrl(this);

    this.add.rectangle(GW / 2, GH / 2, GW, GH, C.sky);
    this.add.rectangle(GW / 2, GH * 0.75, GW, GH * 0.5, C.ground);
    this.add.rectangle(GW / 2, GH * 0.5, GW, 2, 0x2a4418, 0.5);

    // City silhouette
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1a);
    [[80,90,55],[170,130,45],[270,100,60],[360,115,50],[470,80,65],[575,105,75],[670,90,55],[740,120,40]].forEach(([bx, bh, bw]) => {
      bg.fillRect(bx - bw / 2, GH * 0.5 - bh, bw, bh);
      bg.fillStyle(0x1a2a3a);
      for (let wy = 6; wy < bh - 4; wy += 14)
        for (let wx = 6; wx < bw - 6; wx += 10)
          if (Math.random() > 0.45) bg.fillRect(bx - bw / 2 + wx, GH * 0.5 - bh + wy, 5, 7);
      bg.fillStyle(0x0a0f1a);
    });

    this.add.text(GW / 2, 55, 'PLATANUS HACK 26 · CDMX', { fontFamily: 'monospace', fontSize: '13px', color: '#336644' }).setOrigin(0.5);
    const title = this.add.text(GW / 2, 105, 'HELICOPTER\nSURVIVORS', {
      fontFamily: 'monospace', fontSize: '50px', color: '#00ff88', fontStyle: 'bold', align: 'center', lineSpacing: 2,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scaleX: 1.03, scaleY: 1.03, alpha: 0.9, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this._rAngle = 0;
    this._heliGfx = this.add.graphics().setPosition(GW / 2, GH * 0.64);
    this._heliFloat = 0;
    this._drawHeli(0);

    this.add.text(GW / 2, GH - 88, 'WASD / JOYSTICK TO MOVE  ·  WEAPONS FIRE AUTOMATICALLY', { fontFamily: 'monospace', fontSize: '11px', color: '#2a4422' }).setOrigin(0.5);
    this.add.text(GW / 2, GH - 70, 'SURVIVE AS LONG AS POSSIBLE  ·  LEVEL UP TO UPGRADE', { fontFamily: 'monospace', fontSize: '11px', color: '#2a4422' }).setOrigin(0.5);
    const prompt = this.add.text(GW / 2, GH - 42, 'PRESS START OR BUTTON 1', { fontFamily: 'monospace', fontSize: '18px', color: '#aaffcc', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.15, duration: 620, yoyo: true, repeat: -1 });

    startBgMusic(this);
  }

  _drawHeli(rot) {
    const g = this._heliGfx;
    g.clear();
    // Ground shadow
    g.fillStyle(0x000000, 0.18); g.fillEllipse(4, 5, 62, 22);
    // Tail boom (extends to the left / back)
    g.fillStyle(C.pDark); g.fillRect(-32, -3, 20, 6);
    // Main body — outlined ellipse then filled
    g.fillStyle(C.pDark); g.fillEllipse(0, 0, 52, 22);
    g.fillStyle(C.player); g.fillEllipse(0, 0, 48, 18);
    // Nose dome (front / right)
    g.fillStyle(C.player); g.fillEllipse(22, 0, 16, 16);
    g.fillStyle(C.cockpit, 0.8); g.fillEllipse(21, 0, 12, 12);
    // Engine exhaust ports (structural detail)
    g.fillStyle(0x113322); g.fillRect(-5, -10, 12, 3); g.fillRect(-5, 8, 12, 3);
    // Tail rotor disc + spinning blade
    g.fillStyle(C.rotor, 0.18); g.fillCircle(-30, 0, 7);
    g.lineStyle(2, C.rotor, 0.82);
    const ta = rot * 3.5;
    g.beginPath(); g.moveTo(-30 + Math.cos(ta)*6, Math.sin(ta)*6); g.lineTo(-30 + Math.cos(ta+Math.PI)*6, Math.sin(ta+Math.PI)*6); g.strokePath();
    g.fillStyle(C.pDark); g.fillCircle(-30, 0, 2);
    // Main rotor disc blur
    g.fillStyle(C.rotor, 0.08); g.fillCircle(0, 0, 38);
    // 3 rotor blades radiating from hub
    g.lineStyle(3, C.rotor, 0.9);
    for (let i = 0; i < 3; i++) {
      const ba = rot + i * 2.094;
      g.beginPath(); g.moveTo(Math.cos(ba)*4, Math.sin(ba)*4); g.lineTo(Math.cos(ba)*36, Math.sin(ba)*36); g.strokePath();
    }
    // Rotor hub
    g.fillStyle(C.pDark); g.fillCircle(0, 0, 5);
    g.fillStyle(0x22dd66, 0.75); g.fillCircle(0, 0, 2);
  }

  update(time, delta) {
    this._rAngle = (this._rAngle + delta * 0.0072) % (Math.PI * 2);
    this._heliFloat = (this._heliFloat + 0.025) % (Math.PI * 2);
    this._heliGfx.y = GH * 0.64 + Math.sin(this._heliFloat) * 7;
    this._drawHeli(this._rAngle);
    if (consumed(this, 'START1', 'START2', 'P1_1', 'P2_1')) this.scene.start('Game');
  }
}

// ─── GAME SCENE ──────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    setupCtrl(this);

    this.gs = {
      hp: 200, maxHp: 200,
      xp: 0, level: 1, xpNext: 20,
      score: 0, kills: 0,
      elapsed: 0,
      weapons: { cannon: { level: 1, timer: 0 } },
      passives: {},
      waveIdx: 0,
      invUntil: 0,
      speedMult: 1, cooldownMult: 1, dmgReduce: 0,
      regen: 0, regenAccum: 0,
      boss: null, bossMaxHp: 0,
      paused: false,
    };

    this._genTextures();
    this._mkWorld();
    this._mkPlayer();
    this._mkGroups();
    this._mkEnemyGfx();
    this._mkHud();

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(80, 60);

    this._waveTxt = this.add.text(GW / 2, 95, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff8800', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setAlpha(0);
    this._showWave('WAVE 1 — ENGAGE!');

    this._scheduleSpawn();
  }

  _genTextures() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(C.ground); g.fillRect(0, 0, 64, 64);
    g.fillStyle(C.groundAlt);
    [[5,5,8,20],[22,30,24,8],[40,10,12,16],[10,45,30,6],[48,38,10,18]].forEach(([x,y,w,h]) => g.fillRect(x,y,w,h));
    g.fillStyle(0x2a3a18, 0.35);
    [[0,32,64,2],[32,0,2,64]].forEach(([x,y,w,h]) => g.fillRect(x,y,w,h));
    g.generateTexture('ground', 64, 64);
    g.destroy();
  }

  _mkWorld() {
    this.add.rectangle(GW / 2, GH / 2, GW, GH, C.sky).setScrollFactor(0).setDepth(-10);
    this._groundTile = this.add.tileSprite(GW / 2, GH / 2, GW, GH, 'ground').setScrollFactor(0).setDepth(-9);
    // Decorative road lines
    this._roadGfx = this.add.graphics().setDepth(-8);
    this._roadGfx.lineStyle(2, 0x2a2a1a, 0.35);
    for (let i = -8; i <= 8; i++) {
      this._roadGfx.beginPath(); this._roadGfx.moveTo(i * 200, -3000); this._roadGfx.lineTo(i * 200, 3000); this._roadGfx.strokePath();
      this._roadGfx.beginPath(); this._roadGfx.moveTo(-3000, i * 200); this._roadGfx.lineTo(3000, i * 200); this._roadGfx.strokePath();
    }
  }

  _mkPlayer() {
    this.player = this.add.rectangle(0, 0, 52, 20, C.player).setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(46, 16).setAllowGravity(false).setCollideWorldBounds(false);
    this._heliGfx = this.add.graphics().setDepth(11);
    this._rAngle = 0;
    this._facingAngle = 0;
  }

  _mkGroups() {
    const o = { runChildUpdate: false };
    this.bullets = this.physics.add.group(o);
    this.eBullets = this.physics.add.group(o);
    this.enemies = this.physics.add.group(o);
    this.xpOrbs = this.physics.add.group(o);

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this._onBulletHit(b, e));
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this._onPlayerHitEnemy(e));
    this.physics.add.overlap(this.player, this.eBullets, (p, b) => this._onPlayerHitBullet(b));
    this.physics.add.overlap(this.player, this.xpOrbs, (p, o) => this._collectXP(o));
  }

  _mkEnemyGfx() {
    this._enemyGfx = this.add.graphics().setDepth(5);
  }

  _drawEnemies() {
    const g = this._enemyGfx;
    g.clear();
    const now = this.time.now;
    for (const e of this.enemies.getChildren()) {
      if (!e.active || !e._d) continue;
      const { x, y } = e, d = e._d;
      const fl = d._fl && now < d._fl;
      const col = fl ? C.white : (ES[d.type]?.col || C.eInfantry);

      if (d.type === 'infantry') {
        g.fillStyle(fl ? C.white : 0x880011); g.fillCircle(x, y - 10, 4); g.fillRect(x - 4, y - 13, 8, 4);
        g.fillStyle(col); g.fillRect(x - 5, y - 7, 10, 11);
        g.fillStyle(col); g.fillRect(x - 4, y + 4, 3, 7); g.fillRect(x + 1, y + 4, 3, 7);
        g.fillStyle(fl ? C.white : 0x222222); g.fillRect(x + 4, y - 3, 10, 2);
      } else if (d.type === 'drone') {
        g.lineStyle(2, fl ? C.white : 0x880099);
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx, sy]) => { g.beginPath(); g.moveTo(x + sx*4, y + sy*4); g.lineTo(x + sx*13, y + sy*13); g.strokePath(); });
        g.fillStyle(fl ? C.white : 0xcc44ff);
        [[-13,-13],[13,-13],[-13,13],[13,13]].forEach(([ox, oy]) => g.fillCircle(x + ox, y + oy, 4));
        g.fillStyle(col);
        g.beginPath(); g.moveTo(x, y-6); g.lineTo(x+6, y); g.lineTo(x, y+6); g.lineTo(x-6, y); g.closePath(); g.fillPath();
        g.fillStyle(fl ? C.white : 0xff2200); g.fillCircle(x, y, 2);
      } else if (d.type === 'tank') {
        g.fillStyle(fl ? C.white : 0x3a2808); g.fillRect(x-14, y-7, 28, 5); g.fillRect(x-14, y+2, 28, 5);
        g.fillStyle(col); g.fillRect(x-12, y-4, 24, 8);
        g.fillStyle(fl ? C.white : 0x664411); g.fillRect(x-6, y-11, 12, 9);
        g.fillStyle(fl ? C.white : 0x443309); g.fillRect(x+5, y-9, 15, 4);
      } else if (d.type === 'aa') {
        g.fillStyle(fl ? C.white : 0x4a2200); g.fillCircle(x-8, y+6, 4); g.fillCircle(x+8, y+6, 4);
        g.fillStyle(col); g.fillRect(x-11, y-4, 22, 10);
        g.fillStyle(fl ? C.white : 0x7a2800); g.fillRect(x-3, y-11, 6, 9);
        g.lineStyle(3, fl ? C.white : 0xcc4400);
        g.beginPath(); g.moveTo(x-3, y-9); g.lineTo(x+7, y-22); g.strokePath();
        g.beginPath(); g.moveTo(x+3, y-9); g.lineTo(x+13, y-22); g.strokePath();
      } else if (d.type === 'boss') {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x+4, y+22, 72, 14);
        g.fillStyle(fl ? C.white : 0xaa0033);
        g.fillTriangle(x-38, y-12, x-26, y, x-38, y+12);
        g.fillStyle(col); g.fillRect(x-30, y-11, 60, 22);
        g.fillStyle(fl ? C.white : 0xcc0033); g.fillTriangle(x+30, y-9, x+30, y+9, x+46, y);
        g.fillStyle(fl ? C.white : 0xff6699, 0.9); g.fillRect(x-12, y-9, 22, 18);
        const ra = d._ra || 0;
        g.lineStyle(3, fl ? C.white : 0xff4477);
        g.beginPath(); g.moveTo(x+Math.cos(ra)*44, y-14+Math.sin(ra)*4); g.lineTo(x+Math.cos(ra+Math.PI)*44, y-14+Math.sin(ra+Math.PI)*4); g.strokePath();
        g.fillStyle(fl ? C.white : 0x880022); g.fillRect(x-9, y+11, 5, 15); g.fillRect(x+4, y+11, 5, 15);
      }

      if (!d.isBoss) {
        const hp = d.hp / d.maxHp, bw = ES[d.type].sz * 1.4, by = y - ES[d.type].sz * 0.75;
        g.fillStyle(0x330000); g.fillRect(x - bw/2, by, bw, 2);
        g.fillStyle(hp > 0.5 ? 0x00cc44 : hp > 0.25 ? 0xffaa00 : 0xff2200);
        g.fillRect(x - bw/2, by, bw * hp, 2);
      }
    }
  }

  _mkHud() {
    const sf = 0, dp = 50;
    this.add.rectangle(10, 10, 202, 16, 0x440000).setOrigin(0).setScrollFactor(sf).setDepth(dp);
    this._hpBar = this.add.rectangle(11, 11, 200, 14, C.hp).setOrigin(0).setScrollFactor(sf).setDepth(dp+1);
    this.add.text(216, 9, 'HP', { fontFamily: 'monospace', fontSize: '13px', color: '#ff6666' }).setScrollFactor(sf).setDepth(dp+1);

    this.add.rectangle(10, 30, 202, 10, 0x000044).setOrigin(0).setScrollFactor(sf).setDepth(dp);
    this._xpBar = this.add.rectangle(11, 31, 1, 8, C.xpC).setOrigin(0).setScrollFactor(sf).setDepth(dp+1);
    this._lvlTxt = this.add.text(216, 27, 'LV 1', { fontFamily: 'monospace', fontSize: '13px', color: '#4488ff' }).setScrollFactor(sf).setDepth(dp+1);

    this._timerTxt = this.add.text(GW / 2, 8, '00:00', { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(dp+1);
    this._killsTxt = this.add.text(GW - 8, 8, 'KILLS: 0', { fontFamily: 'monospace', fontSize: '14px', color: '#ffcccc' }).setOrigin(1, 0).setScrollFactor(sf).setDepth(dp+1);
    this._weaponsTxt = this.add.text(8, GH - 90, '', { fontFamily: 'monospace', fontSize: '12px', color: '#aaffcc', lineSpacing: 3 }).setScrollFactor(sf).setDepth(dp+1);

    this._bossGroup = this.add.container(GW / 2, GH - 28).setScrollFactor(0).setDepth(dp+1).setVisible(false);
    const bossBg = this.add.rectangle(0, 0, 402, 18, 0x440022).setOrigin(0.5);
    this._bossBar = this.add.rectangle(-200, 0, 1, 16, 0xff0044).setOrigin(0, 0.5);
    const bossLbl = this.add.text(0, -18, 'ENEMY GUNSHIP', { fontFamily: 'monospace', fontSize: '11px', color: '#ff4488' }).setOrigin(0.5);
    this._bossGroup.add([bossBg, this._bossBar, bossLbl]);
  }

  _showWave(msg) {
    this._waveTxt.setText(msg).setAlpha(1).setY(95);
    this.tweens.killTweensOf(this._waveTxt);
    this.tweens.add({ targets: this._waveTxt, alpha: 0, y: 72, duration: 2200, delay: 900, ease: 'Quad.easeIn' });
  }

  _scheduleSpawn() {
    const wave = getWave(this.gs.elapsed);
    this.time.delayedCall(wave.rate, () => {
      if (this.gs.paused) { this._scheduleSpawn(); return; }
      this._doSpawnWave();
      this._scheduleSpawn();
    });
  }

  _doSpawnWave() {
    const wave = getWave(this.gs.elapsed);
    for (let i = 0; i < wave.cnt; i++) {
      const type = wave.types[Math.floor(Math.random() * wave.types.length)];
      if (type === 'boss' && this.gs.boss) continue;
      const pos = this._spawnPos();
      this._spawnEnemy(type, pos.x, pos.y);
    }
  }

  _spawnPos() {
    const px = this.player.x, py = this.player.y;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: px + Phaser.Math.Between(-700, 700), y: py - 520 };
    if (side === 1) return { x: px + Phaser.Math.Between(-700, 700), y: py + 520 };
    if (side === 2) return { x: px - 620, y: py + Phaser.Math.Between(-440, 440) };
    return { x: px + 620, y: py + Phaser.Math.Between(-440, 440) };
  }

  update(time, delta) {
    if (this.gs.paused) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.gs.elapsed += dt;

    this._updatePlayer(dt, time);
    this._fireWeapons(time);
    this._updateEnemies(dt, time);
    this._drawEnemies();
    this._updateBullets();
    this._updateXPOrbs();
    this._checkWave();
    this._doRegen(dt);
    this._groundTile.tilePositionX = this.cameras.main.scrollX * 0.9;
    this._groundTile.tilePositionY = this.cameras.main.scrollY * 0.9;
    this._updateHud();
  }

  _updatePlayer(dt, time) {
    const spd = 175 * this.gs.speedMult;
    let vx = 0, vy = 0;
    if (held(this, 'P1_L') || held(this, 'P2_L')) vx = -spd;
    if (held(this, 'P1_R') || held(this, 'P2_R')) vx = spd;
    if (held(this, 'P1_U') || held(this, 'P2_U')) vy = -spd;
    if (held(this, 'P1_D') || held(this, 'P2_D')) vy = spd;
    if (vx && vy) { vx *= 0.707; vy *= 0.707; }
    this.player.body.setVelocity(vx, vy);

    // Snap facing direction to movement vector
    if (vx !== 0 || vy !== 0) this._facingAngle = Math.atan2(vy, vx);

    this._rAngle = (this._rAngle + dt * 7.2) % (Math.PI * 2);
    const flicker = time < this.gs.invUntil && Math.floor(time / 80) % 2 === 0;
    const px = this.player.x, py = this.player.y;
    const g = this._heliGfx;
    g.setPosition(px, py);
    g.setRotation(this._facingAngle);
    g.clear();
    if (!flicker) {
      // Shadow
      g.fillStyle(0x000000, 0.18); g.fillEllipse(4, 5, 62, 22);
      // Tail boom (extends left / back)
      g.fillStyle(C.pDark); g.fillRect(-32, -3, 20, 6);
      // Main body — nose faces +x (right)
      g.fillStyle(C.pDark); g.fillEllipse(0, 0, 52, 22);
      g.fillStyle(C.player); g.fillEllipse(0, 0, 48, 18);
      // Nose dome
      g.fillStyle(C.player); g.fillEllipse(22, 0, 16, 16);
      g.fillStyle(C.cockpit, 0.8); g.fillEllipse(21, 0, 12, 12);
      // Engine exhaust ports
      g.fillStyle(0x113322); g.fillRect(-5, -10, 12, 3); g.fillRect(-5, 8, 12, 3);
      // Tail rotor disc + spinning blade
      g.fillStyle(C.rotor, 0.18); g.fillCircle(-30, 0, 7);
      g.lineStyle(2, C.rotor, 0.82);
      const ta = this._rAngle * 3.5;
      g.beginPath(); g.moveTo(-30 + Math.cos(ta)*6, Math.sin(ta)*6); g.lineTo(-30 + Math.cos(ta+Math.PI)*6, Math.sin(ta+Math.PI)*6); g.strokePath();
      g.fillStyle(C.pDark); g.fillCircle(-30, 0, 2);
      // Main rotor disc blur
      g.fillStyle(C.rotor, 0.08); g.fillCircle(0, 0, 38);
      // 3 rotor blades
      g.lineStyle(3, C.rotor, 0.9);
      for (let i = 0; i < 3; i++) {
        const ba = this._rAngle + i * 2.094;
        g.beginPath(); g.moveTo(Math.cos(ba)*4, Math.sin(ba)*4); g.lineTo(Math.cos(ba)*36, Math.sin(ba)*36); g.strokePath();
      }
      // Rotor hub
      g.fillStyle(C.pDark); g.fillCircle(0, 0, 5);
      g.fillStyle(0x22dd66, 0.75); g.fillCircle(0, 0, 2);
    } else {
      g.fillStyle(C.white, 0.45); g.fillEllipse(0, 0, 52, 22);
    }
  }

  _fireWeapons(time) {
    for (const [key, ws] of Object.entries(this.gs.weapons)) {
      const def = WD[key]; if (!def) continue;
      const lv = ws.level;
      const cd = def.c[lv] * this.gs.cooldownMult;
      if (time - ws.timer >= cd) {
        ws.timer = time;
        if (key === 'cannon') this._fireCannon(lv);
        else if (key === 'missile') this._fireMissile(lv);
        else if (key === 'bomb') this._dropBomb(lv);
      }
    }
  }

  _mkBullet(x, y, col, w, h) {
    let b = this.bullets.getFirstDead(false);
    if (!b) {
      b = this.add.rectangle(x, y, w, h, col);
      this.physics.add.existing(b);
      b.body.setAllowGravity(false);
      this.bullets.add(b, true);
    }
    b.setActive(true).setVisible(true).setPosition(x, y).setFillStyle(col).setDisplaySize(w, h);
    b.body.reset(x, y); b.body.setAllowGravity(false);
    return b;
  }

  _fireCannon(lv) {
    const fa = this._facingAngle;
    const ox = Math.cos(fa) * 5, oy = Math.sin(fa) * 5;
    const b = this._mkBullet(this.player.x + ox, this.player.y + oy, C.bCannon, 10, 5);
    b.body.setVelocity(Math.cos(fa) * WD.cannon.spd, Math.sin(fa) * WD.cannon.spd);
    b._d = { dmg: WD.cannon.d[lv], rng: WD.cannon.rng, sx: this.player.x, sy: this.player.y, type: 'cannon' };
    snd(this, 'shoot');
  }

  _fireMissile(lv) {
    const target = nearestEnemy(this.enemies, this.player.x, this.player.y);
    const angle = target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y) : -Math.PI / 2;
    const b = this._mkBullet(this.player.x, this.player.y - 10, C.bMissile, 12, 7);
    b.body.setVelocity(Math.cos(angle) * WD.missile.spd, Math.sin(angle) * WD.missile.spd);
    b._d = { dmg: WD.missile.d[lv], rng: WD.missile.rng, sx: this.player.x, sy: this.player.y, type: 'missile', target, spd: WD.missile.spd, age: 0 };
    snd(this, 'missile');
  }

  _dropBomb(lv) {
    const b = this._mkBullet(this.player.x, this.player.y + 15, C.bBomb, 14, 14);
    b.body.setVelocity(0, 100);
    b._d = { dmg: WD.bomb.d[lv], rng: 300, sx: this.player.x, sy: this.player.y, type: 'bomb', radius: WD.bomb.r[lv] };
    snd(this, 'shoot');
  }

  _updateBullets() {
    const px = this.player.x, py = this.player.y;
    for (const b of this.bullets.getChildren()) {
      if (!b.active || !b._d) continue;
      const d = b._d;
      if (d.type === 'missile' && d.target?.active) {
        d.age += 0.016;
        if (d.age > 0.25) {
          const ang = Phaser.Math.Angle.Between(b.x, b.y, d.target.x, d.target.y);
          b.body.setVelocity(
            Phaser.Math.Linear(b.body.velocity.x, Math.cos(ang) * d.spd, 0.07),
            Phaser.Math.Linear(b.body.velocity.y, Math.sin(ang) * d.spd, 0.07)
          );
        }
      }
      if (d.type === 'bomb') {
        if (b.y - d.sy > 180) { this._explode(b.x, b.y, d.dmg, d.radius); b.setActive(false).setVisible(false); continue; }
      } else {
        if (Phaser.Math.Distance.Between(b.x, b.y, d.sx, d.sy) > d.rng) { b.setActive(false).setVisible(false); continue; }
      }
      if (Math.abs(b.x - px) > 950 || Math.abs(b.y - py) > 750) b.setActive(false).setVisible(false);
    }
    for (const b of this.eBullets.getChildren()) {
      if (!b.active) continue;
      if (Math.abs(b.x - px) > 750 || Math.abs(b.y - py) > 650) b.setActive(false).setVisible(false);
    }
  }

  _explode(x, y, dmg, radius) {
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < radius) this._dmgEnemy(e, dmg * (1 - d / (radius * 1.5)));
    }
    const eg = this.add.graphics();
    eg.fillStyle(C.exp, 0.85); eg.fillCircle(x, y, radius);
    eg.fillStyle(0xffff00, 0.65); eg.fillCircle(x, y, radius * 0.4);
    this.tweens.add({ targets: eg, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 380, onComplete: () => eg.destroy() });
    snd(this, 'boom');
  }

  _spawnEnemy(type, x, y) {
    const stats = ES[type]; if (!stats) return;
    const wave = getWave(this.gs.elapsed);
    const hp = stats.hp * wave.hm;
    let e = this.enemies.getFirstDead(false);
    if (!e) {
      e = this.add.rectangle(x, y, stats.sz, stats.sz, stats.col);
      this.physics.add.existing(e);
      e.body.setAllowGravity(false);
      this.enemies.add(e, true);
    }
    e.setActive(true).setVisible(true).setPosition(x, y).setFillStyle(stats.col).setDisplaySize(stats.sz, stats.sz).setAlpha(0);
    e.body.reset(x, y); e.body.setAllowGravity(false);
    e._d = { type, hp, maxHp: hp, dmg: stats.dmg * wave.dm, spd: stats.spd, xp: stats.xp, fr: stats.fr, fcd: stats.fcd, ft: 0, gr: stats.gr, isBoss: type === 'boss', _ra: 0 };
    if (type === 'boss') { this.gs.boss = e; this.gs.bossMaxHp = hp; this._bossGroup.setVisible(true); }
    return e;
  }

  _updateEnemies(dt, time) {
    const px = this.player.x, py = this.player.y;
    for (const e of this.enemies.getChildren()) {
      if (!e.active || !e._d) continue;
      const d = e._d;
      if (d.spd > 0) {
        const dist = Phaser.Math.Distance.Between(e.x, e.y, px, py);
        const minDist = d.fcd > 0 ? d.fr : ES[d.type].sz + 10;
        if (dist > minDist) {
          const ang = Phaser.Math.Angle.Between(e.x, e.y, px, py);
          e.body.setVelocity(Math.cos(ang) * d.spd, Math.sin(ang) * d.spd);
        } else {
          e.body.setVelocity(0, 0);
        }
      } else {
        e.body.setVelocity(0, 0);
      }
      if (d.fcd > 0) {
        const dist = Phaser.Math.Distance.Between(e.x, e.y, px, py);
        if (dist < d.fr && time - d.ft >= d.fcd) { d.ft = time; this._fireEB(e, px, py, d.dmg, d.isBoss ? 2 : 1); }
      }
      if (d.isBoss) d._ra = (d._ra + 0.09) % (Math.PI * 2);
      if (Math.abs(e.x - px) > 1400 || Math.abs(e.y - py) > 1100) e.setActive(false).setVisible(false);
    }
  }

  _fireEB(enemy, tx, ty, dmg, count) {
    for (let i = 0; i < count; i++) {
      let b = this.eBullets.getFirstDead(false);
      if (!b) {
        b = this.add.circle(enemy.x, enemy.y, 5, C.eBullet);
        this.physics.add.existing(b);
        b.body.setAllowGravity(false);
        this.eBullets.add(b, true);
      }
      b.setActive(true).setVisible(true).setPosition(enemy.x, enemy.y);
      b.body.reset(enemy.x, enemy.y); b.body.setAllowGravity(false);
      const spread = (i - 0.5 * (count - 1)) * 0.18;
      const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, tx, ty) + spread;
      b.body.setVelocity(Math.cos(ang) * 210, Math.sin(ang) * 210);
      b._dmg = dmg;
    }
  }

  _onBulletHit(bullet, enemy) {
    if (!bullet.active || !enemy.active || !bullet._d) return;
    this._dmgEnemy(enemy, bullet._d.dmg);
    if (bullet._d.type !== 'bomb') bullet.setActive(false).setVisible(false);
    this._sparks(bullet.x, bullet.y, C.white, 3);
  }

  _dmgEnemy(e, dmg) {
    if (!e.active || !e._d) return;
    e._d.hp -= dmg;
    e._d._fl = this.time.now + 75;
    if (e._d.hp <= 0) this._killEnemy(e);
  }

  _killEnemy(e) {
    if (!e._d) return;
    const d = e._d;
    this.gs.kills++;
    this.gs.score += d.isBoss ? 500 : (d.xp * 2);
    const orbCount = d.isBoss ? 8 : Math.ceil(d.xp / 8);
    for (let i = 0; i < orbCount; i++) {
      const ox = e.x + Phaser.Math.Between(-22, 22), oy = e.y + Phaser.Math.Between(-22, 22);
      let orb = this.xpOrbs.getFirstDead(false);
      if (!orb) {
        orb = this.add.circle(ox, oy, 6, C.xpOrb);
        this.physics.add.existing(orb);
        orb.body.setAllowGravity(false);
        this.xpOrbs.add(orb, true);
      }
      orb.setActive(true).setVisible(true).setPosition(ox, oy);
      orb.body.reset(ox, oy); orb.body.setAllowGravity(false);
      orb._xp = d.isBoss ? 20 : d.xp;
    }
    this._sparks(e.x, e.y, d.isBoss ? C.eBoss : (ES[d.type]?.col || C.eInfantry), d.isBoss ? 12 : 6);
    snd(this, 'boom');
    if (d.isBoss) { this.gs.boss = null; this._bossGroup.setVisible(false); }
    e.setActive(false).setVisible(false);
  }

  _sparks(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const s = this.add.rectangle(x, y, 4, 4, col);
      const ang = Math.random() * Math.PI * 2, dist = Phaser.Math.Between(10, 36);
      this.tweens.add({ targets: s, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist, alpha: 0, angle: Phaser.Math.Between(-90, 90), duration: Phaser.Math.Between(180, 320), onComplete: () => s.destroy() });
    }
  }

  _onPlayerHitEnemy(e) {
    if (!e.active || !e._d) return;
    const now = this.time.now;
    if (now < this.gs.invUntil) return;
    this.gs.invUntil = now + 800;
    this._hit(Math.max(1, e._d.dmg * (1 - this.gs.dmgReduce)));
  }

  _onPlayerHitBullet(b) {
    if (!b.active) return;
    const now = this.time.now;
    if (now < this.gs.invUntil) return;
    this.gs.invUntil = now + 400;
    b.setActive(false).setVisible(false);
    this._hit(Math.max(1, (b._dmg || 8) * (1 - this.gs.dmgReduce)));
  }

  _hit(dmg) {
    this.gs.hp -= dmg;
    snd(this, 'hit');
    this.cameras.main.shake(110, 0.008);
    if (this.gs.hp <= 0) { this.gs.hp = 0; this._gameOver(); }
  }

  _collectXP(orb) {
    if (!orb.active) return;
    orb.setActive(false).setVisible(false);
    this.gs.xp += orb._xp || 5;
    snd(this, 'xp');
    if (this.gs.xp >= this.gs.xpNext) this._levelUp();
  }

  _updateXPOrbs() {
    const px = this.player.x, py = this.player.y, pull = 130;
    for (const o of this.xpOrbs.getChildren()) {
      if (!o.active) continue;
      const d = Phaser.Math.Distance.Between(o.x, o.y, px, py);
      if (d < pull) {
        const ang = Phaser.Math.Angle.Between(o.x, o.y, px, py);
        const spd = Math.max(180, (pull - d) * 4.5);
        o.body.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
      } else {
        o.body.setVelocity(o.body.velocity.x * 0.95, o.body.velocity.y * 0.95);
      }
    }
  }

  _levelUp() {
    this.gs.xp -= this.gs.xpNext;
    this.gs.level++;
    this.gs.xpNext = Math.floor(20 * Math.pow(1.38, this.gs.level - 1));
    snd(this, 'lvl');
    this.gs.paused = true;
    this.scene.launch('LevelUp', { gs: this });
  }

  _checkWave() {
    const wave = getWave(this.gs.elapsed);
    const idx = WAVES.indexOf(wave);
    if (idx > this.gs.waveIdx) { this.gs.waveIdx = idx; this._showWave(`WAVE ${idx + 1} — ESCALATING!`); }
  }

  _doRegen(dt) {
    if (this.gs.regen <= 0) return;
    this.gs.regenAccum += dt;
    if (this.gs.regenAccum >= 1) { this.gs.regenAccum -= 1; this.gs.hp = Math.min(this.gs.maxHp, this.gs.hp + this.gs.regen); }
  }

  _updateHud() {
    const gs = this.gs;
    this._hpBar.setDisplaySize(Math.max(0, 200 * (gs.hp / gs.maxHp)), 14);
    this._xpBar.setDisplaySize(Math.max(1, 200 * (gs.xp / gs.xpNext)), 8);
    this._lvlTxt.setText(`LV ${gs.level}`);
    const m = Math.floor(gs.elapsed / 60), s = Math.floor(gs.elapsed % 60);
    this._timerTxt.setText(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    this._killsTxt.setText(`KILLS: ${gs.kills}`);
    const wLines = [];
    for (const [k, w] of Object.entries(gs.weapons)) { const def = WD[k]; if (def) wLines.push(`${def.n} Lv${w.level}`); }
    for (const [k, lv] of Object.entries(gs.passives)) { const def = PD[k]; if (def) wLines.push(`${def.n} Lv${lv}`); }
    this._weaponsTxt.setText(wLines.join('\n'));
    if (gs.boss?.active && gs.boss._d) {
      const pct = Phaser.Math.Clamp(gs.boss._d.hp / gs.bossMaxHp, 0, 1);
      this._bossBar.setDisplaySize(Math.max(1, 400 * pct), 16);
    }
  }

  _gameOver() {
    this.gs.paused = true;
    this.time.delayedCall(500, () => {
      this.scene.start('GameOver', { time: this.gs.elapsed, kills: this.gs.kills, score: this.gs.score, level: this.gs.level, weapons: this.gs.weapons });
    });
  }

  applyUpgrade(key, isPassive) {
    this.gs.paused = false;
    this._p = {};
    if (isPassive) {
      const def = PD[key]; if (!def) return;
      const lv = (this.gs.passives[key] || 0) + 1;
      this.gs.passives[key] = lv;
      if (key === 'armor') this.gs.dmgReduce = [0.15, 0.28, 0.40][lv - 1];
      else if (key === 'speed') this.gs.speedMult = [1.2, 1.4, 1.65][lv - 1];
      else if (key === 'cooler') this.gs.cooldownMult = [0.85, 0.70, 0.55][lv - 1];
      else if (key === 'fuel') { const hp = [50, 100][lv - 1]; this.gs.maxHp += hp; this.gs.hp = Math.min(this.gs.maxHp, this.gs.hp + hp); this.gs.regen += [2, 5][lv - 1]; }
    } else {
      const def = WD[key]; if (!def) return;
      if (this.gs.weapons[key]) this.gs.weapons[key].level = Math.min(def.max, this.gs.weapons[key].level + 1);
      else this.gs.weapons[key] = { level: 1, timer: 0 };
    }
  }
}

// ─── LEVEL UP SCENE ──────────────────────────────────────────────────────────
class LevelUpScene extends Phaser.Scene {
  constructor() { super('LevelUp'); }

  init(data) { this._gs = data.gs; }

  create() {
    setupCtrl(this);
    this._sel = 0;
    this._opts = this._buildOpts();
    this._moveCd = 0;

    this.add.rectangle(GW / 2, GH / 2, GW, GH, 0x000000, 0.72);

    this.add.text(GW / 2, 38, `LEVEL UP!  →  ${this._gs.gs.level}`, {
      fontFamily: 'monospace', fontSize: '30px', color: '#00ff88', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GW / 2, 74, 'CHOOSE AN UPGRADE', { fontFamily: 'monospace', fontSize: '14px', color: '#aaffcc' }).setOrigin(0.5);

    this._cards = [];
    const n = this._opts.length;
    const cw = 210, gap = 18;
    const startX = (GW - (n * cw + (n - 1) * gap)) / 2;

    for (let i = 0; i < n; i++) {
      const opt = this._opts[i];
      const cx = startX + i * (cw + gap) + cw / 2, cy = GH / 2 + 15;
      const bg = this.add.rectangle(cx, cy, cw, 210, 0x0a1a0a).setStrokeStyle(2, 0x224422);
      const tag = opt.isPassive ? 'PASSIVE' : 'WEAPON';
      const tagCol = opt.isPassive ? '#6644aa' : '#226644';
      this.add.text(cx, cy - 88, tag, { fontFamily: 'monospace', fontSize: '11px', color: tagCol }).setOrigin(0.5);
      const nameTxt = this.add.text(cx, cy - 68, opt.name, { fontFamily: 'monospace', fontSize: '14px', color: '#00ff88', fontStyle: 'bold', align: 'center', wordWrap: { width: cw - 16 } }).setOrigin(0.5);
      this.add.text(cx, cy, opt.desc, { fontFamily: 'monospace', fontSize: '12px', color: '#aaccaa', align: 'center', wordWrap: { width: cw - 20 }, lineSpacing: 4 }).setOrigin(0.5);
      this.add.text(cx, cy + 76, opt.lvlTxt, { fontFamily: 'monospace', fontSize: '12px', color: '#4488ff' }).setOrigin(0.5);
      this._cards.push({ bg, nameTxt, cx, cy });
    }

    this.add.text(GW / 2, GH - 28, 'MOVE ← →  ·  BUTTON 1 / START TO CONFIRM', { fontFamily: 'monospace', fontSize: '11px', color: '#335533' }).setOrigin(0.5);
    this._highlight();
  }

  _buildOpts() {
    const gs = this._gs.gs;
    const pool = [];
    for (const [key, def] of Object.entries(WD)) {
      const cur = gs.weapons[key]?.level || 0;
      if (cur === 0) pool.push({ key, isPassive: false, name: def.n, desc: 'Unlock this weapon', lvlTxt: 'NEW', pri: 2 });
      else if (cur < def.max) pool.push({ key, isPassive: false, name: def.n, desc: `Lv${cur} → Lv${cur + 1}\nDMG: ${def.d[cur + 1]}  CD: ${def.c[cur + 1]}ms`, lvlTxt: `Lv${cur} → Lv${cur + 1}`, pri: 1 });
    }
    for (const [key, def] of Object.entries(PD)) {
      const cur = gs.passives[key] || 0;
      if (cur < def.max) pool.push({ key, isPassive: true, name: def.n, desc: def.desc(cur + 1), lvlTxt: cur === 0 ? 'NEW' : `Lv${cur} → Lv${cur + 1}`, pri: 0 });
    }
    pool.sort((a, b) => b.pri - a.pri || Math.random() - 0.5);
    const seen = new Set();
    const result = [];
    for (const o of pool) {
      if (!seen.has(o.key) && result.length < 3) { seen.add(o.key); result.push(o); }
    }
    while (result.length < 2) result.push(result[0] || pool[0]);
    return result;
  }

  _highlight() {
    for (let i = 0; i < this._cards.length; i++) {
      const act = i === this._sel;
      this._cards[i].bg.setFillStyle(act ? 0x0a3a0a : 0x0a1a0a);
      this._cards[i].bg.setStrokeStyle(act ? 3 : 2, act ? 0x00ff88 : 0x224422);
    }
  }

  update(time) {
    const ax = (held(this, 'P1_R') || held(this, 'P2_R')) ? 1 : (held(this, 'P1_L') || held(this, 'P2_L')) ? -1 : 0;
    if (ax !== 0 && time > this._moveCd) {
      this._sel = Phaser.Math.Wrap(this._sel + ax, 0, this._cards.length);
      this._moveCd = time + 160;
      this._highlight();
      snd(this, 'select');
    }
    if (consumed(this, 'P1_1', 'P2_1', 'START1', 'START2')) {
      const opt = this._opts[this._sel];
      this._gs.applyUpgrade(opt.key, opt.isPassive);
      this.scene.stop('LevelUp');
    }
  }
}

// ─── GAME OVER SCENE ─────────────────────────────────────────────────────────
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this._d = data; }

  create() {
    setupCtrl(this);
    this.add.rectangle(GW / 2, GH / 2, GW, GH, C.dark);

    const d = this._d;
    const m = Math.floor(d.time / 60), s = Math.floor(d.time % 60);
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const title = this.add.text(GW / 2, 55, 'GAME OVER', { fontFamily: 'monospace', fontSize: '46px', color: '#ff2200', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: title, scaleX: 1.04, scaleY: 1.04, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const wList = Object.entries(d.weapons || {}).map(([k, w]) => `  ${WD[k]?.n || k} Lv${w.level}`).join('\n');
    const lines = [
      `TIME SURVIVED    ${timeStr}`,
      `ENEMIES KILLED   ${d.kills}`,
      `SCORE            ${d.score}`,
      `LEVEL REACHED    ${d.level}`,
      '',
      'WEAPONS COLLECTED:',
      wList || '  none',
    ].join('\n');

    this.add.text(GW / 2, 145, lines, { fontFamily: 'monospace', fontSize: '16px', color: '#ccddcc', align: 'left', lineSpacing: 6 }).setOrigin(0.5, 0);

    const btn = this.add.text(GW / 2, GH - 55, 'PRESS START TO PLAY AGAIN', { fontFamily: 'monospace', fontSize: '18px', color: '#00ff88', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: btn, alpha: 0.18, duration: 650, yoyo: true, repeat: -1 });

    this._saveScore(d);
  }

  update() {
    if (consumed(this, 'START1', 'START2', 'P1_1', 'P2_1')) this.scene.start('Menu');
  }

  async _saveScore(d) {
    try {
      const storage = window.platanusArcadeStorage || {
        async get(k) { try { const v = localStorage.getItem(k); return v ? { found: true, value: JSON.parse(v) } : { found: false, value: null }; } catch { return { found: false, value: null }; } },
        async set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
      };
      const res = await storage.get(SK);
      const scores = res.found && Array.isArray(res.value) ? res.value : [];
      scores.push({ score: d.score, kills: d.kills, time: d.time, level: d.level, date: new Date().toISOString().slice(0, 10) });
      scores.sort((a, b) => b.score - a.score);
      await storage.set(SK, scores.slice(0, 10));
    } catch (_) { }
  }
}

// ─── LAUNCH ──────────────────────────────────────────────────────────────────
new Phaser.Game({
  type: Phaser.AUTO,
  width: GW, height: GH,
  parent: 'game-root',
  backgroundColor: '#050810',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GW, height: GH },
  scene: [MenuScene, GameScene, LevelUpScene, GameOverScene],
});
