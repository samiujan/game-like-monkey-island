// The world: three scenes of the Lahore Fort, staged as simple horizontal
// courts — the prince walks along a straight path at the bottom of each
// scene, landmarks and characters along the top. Everything is "hand-painted"
// with canvas paths in a warm watercolor style, rendered at 640x480.
const GardenerSprites = {
  img: null,
  loaded: false,
  load() {
    const im = new Image();
    im.onload = () => { this.loaded = true; };
    im.src = 'assets/gardener/g-pose-0.png';
    this.img = im;
  }
};

const Scenes = (() => {
  // deterministic RNG so the paint doesn't shimmer
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // the shared horizontal walking band
  const WALK = { x: 12, y: 396, w: 616, h: 66 };

  function makeScene(id, name) {
    return {
      id, name,
      walk: WALK,
      blocked: [],
      clamp(x, y) {
        return {
          x: Math.max(WALK.x, Math.min(WALK.x + WALK.w, x)),
          y: Math.max(WALK.y, Math.min(WALK.y + WALK.h, y))
        };
      },
      depth(y) {
        return 0.9 + 0.3 * Math.max(0, Math.min(1, (y - WALK.y) / WALK.h));
      }
    };
  }

  // ---------------------------------------------------------------- helpers
  function blob(ctx, rnd, x, y, rx, ry, wob) {
    const n = 11, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 - wob / 2 + rnd() * wob;
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    }
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }

  function canopy(ctx, rnd, cx, cy, r, sway) {
    const tones = ['#3a6b45', '#4e8f4a', '#6fae5a'];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = tones[i % 3];
      ctx.globalAlpha = 0.85;
      blob(ctx, rnd,
        cx + (rnd() - 0.5) * r * 1.4 + sway,
        cy + (rnd() - 0.5) * r * 0.9,
        r * (0.35 + rnd() * 0.4), r * (0.28 + rnd() * 0.32), 0.5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8cc97a';
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * r * 0.95;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d + sway, cy + Math.sin(a) * d * 0.75, 1.4 + rnd() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function cypress(ctx, x, baseY, h, col) {
    ctx.fillStyle = col || '#3a6b45';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.bezierCurveTo(x - 11, baseY - h * 0.4, x - 8, baseY - h * 0.8, x, baseY - h);
    ctx.bezierCurveTo(x + 8, baseY - h * 0.8, x + 11, baseY - h * 0.4, x, baseY);
    ctx.fill();
    ctx.fillStyle = '#2f5738';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.bezierCurveTo(x - 5, baseY - h * 0.4, x - 4, baseY - h * 0.75, x, baseY - h * 0.95);
    ctx.bezierCurveTo(x + 2, baseY - h * 0.7, x + 4, baseY - h * 0.35, x, baseY);
    ctx.fill();
  }

  function grassTuft(ctx, rnd, x, y, h) {
    ctx.strokeStyle = '#5d9a4e';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 1.4, y);
      ctx.quadraticCurveTo(x + i * 2.4, y - h * 0.6, x + i * 3.2, y - h);
      ctx.stroke();
    }
  }

  function flowerDots(ctx, rnd, x, y, w, h, n, cols) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
      const fx = x + rnd() * w, fy = y + rnd() * h;
      ctx.beginPath(); ctx.arc(fx, fy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7e9b0';
      ctx.beginPath(); ctx.arc(fx, fy, 0.9, 0, Math.PI * 2); ctx.fill();
    }
  }

  function cloud(ctx, rnd, x, y, s) {
    ctx.fillStyle = 'rgba(255,250,238,0.92)';
    blob(ctx, rnd, x, y, 34 * s, 12 * s, 0.5); ctx.fill();
    blob(ctx, rnd, x - 20 * s, y + 4 * s, 20 * s, 9 * s, 0.5); ctx.fill();
    blob(ctx, rnd, x + 22 * s, y + 3 * s, 22 * s, 10 * s, 0.5); ctx.fill();
    ctx.fillStyle = 'rgba(245,215,165,0.55)';
    blob(ctx, rnd, x, y + 9 * s, 30 * s, 6 * s, 0.6); ctx.fill();
  }

  function kangura(ctx, x, y, w, col) {
    ctx.fillStyle = col;
    const n = Math.floor(w / 13);
    const step = w / n;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    for (let i = 0; i < n; i++) {
      const bx = x + i * step;
      ctx.moveTo(bx, y + 10);
      ctx.quadraticCurveTo(bx + step * 0.15, y, bx + step * 0.5, y);
      ctx.quadraticCurveTo(bx + step * 0.85, y, bx + step, y + 10);
    }
    ctx.fill();
  }

  function chhatri(ctx, x, y, s) {
    ctx.strokeStyle = '#8a5a33';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.moveTo(x - 7 * s, y); ctx.lineTo(x - 7 * s, y - 10 * s);
    ctx.moveTo(x + 7 * s, y); ctx.lineTo(x + 7 * s, y - 10 * s); ctx.stroke();
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y - 10 * s);
    ctx.quadraticCurveTo(x, y - 22 * s, x + 10 * s, y - 10 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9b891';
    ctx.beginPath();
    ctx.moveTo(x, y - 22 * s);
    ctx.quadraticCurveTo(x + 3 * s, y - 19 * s, x + 5 * s, y - 13 * s);
    ctx.lineTo(x, y - 13 * s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath(); ctx.moveTo(x, y - 22 * s); ctx.lineTo(x, y - 26 * s); ctx.stroke();
  }

  function pointedArch(ctx, cx, baseY, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, baseY);
    ctx.lineTo(cx - w / 2, baseY - h * 0.52);
    ctx.bezierCurveTo(cx - w / 2, baseY - h * 0.82, cx - w * 0.28, baseY - h * 0.94, cx, baseY - h);
    ctx.bezierCurveTo(cx + w * 0.28, baseY - h * 0.94, cx + w / 2, baseY - h * 0.82, cx + w / 2, baseY - h * 0.52);
    ctx.lineTo(cx + w / 2, baseY);
    ctx.closePath();
  }

  function cuspedArch(ctx, cx, baseY, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, baseY);
    ctx.lineTo(cx - w / 2, baseY - h * 0.5);
    const n = 5, rw = w / (n + 1);
    let px = cx - w / 2, py = baseY - h * 0.5;
    for (let i = 0; i < n; i++) {
      const nx = cx - w / 2 + rw * (i + 1);
      const ny = baseY - h * (0.5 + 0.5 * Math.sin((i + 0.5) / n * Math.PI));
      ctx.arc((px + nx) / 2, (py + ny) / 2 - 2, rw * 0.62, Math.PI * 0.9, Math.PI * 0.1, true);
      px = nx; py = ny;
    }
    ctx.lineTo(cx + w / 2, baseY);
    ctx.closePath();
  }

  function sunDisc(ctx, x, y, r, c1, c2) {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,225,0.95)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function stoneWall(ctx, rnd, x, y, w, h, base, dark) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#dbaa74'); g.addColorStop(0.55, base); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(150,92,48,0.20)' : 'rgba(240,190,130,0.22)';
      blob(ctx, rnd, x + rnd() * w, y + rnd() * h, 14 + rnd() * 34, 8 + rnd() * 18, 0.7);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120,70,30,0.18)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const dx = x + rnd() * w, dy = y + rnd() * h * 0.4, len = 20 + rnd() * 50;
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + rnd() * 4 - 2, dy + len); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(96,54,22,0.30)';
    ctx.lineWidth = 1;
    const row = 21;
    for (let ry = y + row; ry < y + h; ry += row) {
      ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke();
      const off = ((ry - y) / row) % 2 === 0 ? 0 : 26;
      for (let sx = x + off; sx < x + w; sx += 52) {
        ctx.beginPath(); ctx.moveTo(sx, ry - row); ctx.lineTo(sx, ry); ctx.stroke();
      }
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = 'rgba(150,92,48,0.35)';
      const bx = x + Math.floor(rnd() * w / 52) * 52 + 2;
      const by = y + row + Math.floor(rnd() * (h - row - 6) / row) * row + 2;
      ctx.fillRect(bx, by, 48, row - 5);
    }
  }

  function butterfly(ctx, t, cx, cy, col, ph) {
    const x = cx + Math.sin(t * 0.31 + ph) * 46;
    const y = cy + Math.sin(t * 0.53 + ph * 2.1) * 22;
    const flap = Math.abs(Math.sin(t * 9 + ph));
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = col;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-flap * 0.9);
      ctx.beginPath(); ctx.ellipse(2.6, 0, 2.8, 1.7, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(1.8, 2.2, 1.8, 1.1, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#4a2c14';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 3); ctx.stroke();
    ctx.restore();
  }

  function bird(ctx, x, y, s) {
    ctx.strokeStyle = 'rgba(90,60,50,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x - 3 * s, y, 3 * s, Math.PI * 1.15, Math.PI * 1.95);
    ctx.arc(x + 3 * s, y, 3 * s, Math.PI * 1.05, Math.PI * 1.85);
    ctx.stroke();
  }

  function potPlant(ctx, rnd, x, baseY, s, t) {
    ctx.fillStyle = '#a3542f';
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, baseY - 16 * s); ctx.lineTo(x + 9 * s, baseY - 16 * s);
    ctx.lineTo(x + 6.5 * s, baseY); ctx.lineTo(x - 6.5 * s, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9713f';
    ctx.fillRect(x - 9.6 * s, baseY - 18.5 * s, 19.2 * s, 3.4 * s);
    const sway = Math.sin(t * 1.1 + x) * 1.6;
    canopy(ctx, rnd, x + sway * 0.4, baseY - 30 * s, 15 * s, sway);
  }

  function lantern(ctx, x, y, s, t, glow) {
    const fl = 0.85 + Math.sin(t * 7.3 + x) * 0.08 + Math.sin(t * 3.1) * 0.07;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34 * s);
    g.addColorStop(0, glow.replace('A', (0.5 * fl).toFixed(2)));
    g.addColorStop(1, glow.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 34 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath(); ctx.moveTo(x, y + 30 * s); ctx.lineTo(x, y + 8 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6 * s, y + 30 * s); ctx.lineTo(x + 6 * s, y + 30 * s); ctx.stroke();
    ctx.fillStyle = '#f7c87a';
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 6 * s); ctx.lineTo(x + 5 * s, y - 6 * s);
    ctx.lineTo(x + 6.5 * s, y + 2 * s); ctx.lineTo(x - 6.5 * s, y + 2 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a33';
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 6 * s); ctx.lineTo(x + 4 * s, y - 6 * s); ctx.lineTo(x, y - 11 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath(); ctx.ellipse(x, y - 1.5 * s, 1.8 * s * fl, 3 * s * fl, 0, 0, Math.PI * 2); ctx.fill();
  }

  function fgFoliage(ctx, rnd, cx, cy, r) {
    const tones = ['#254430', '#2f5738', '#356440'];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = tones[i % 3];
      blob(ctx, rnd, cx + (rnd() - 0.5) * r * 1.5, cy + (rnd() - 0.5) * r, r * (0.3 + rnd() * 0.35), r * (0.24 + rnd() * 0.3), 0.5);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(96,150,96,0.5)';
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * r;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, 1.6 + rnd() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function fgVine(ctx, rnd, x, len) {
    ctx.strokeStyle = '#356440';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, -4);
    ctx.quadraticCurveTo(x + 6, len * 0.5, x + 2 + Math.sin(len) * 3, len);
    ctx.stroke();
    ctx.fillStyle = '#2f5738';
    for (let i = 1; i <= 5; i++) {
      const ly = len * i / 5;
      const lx = x + 4 + Math.sin(ly * 0.08) * 3;
      ctx.beginPath();
      ctx.ellipse(lx + 4, ly, 5, 2.2, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ------------------------------------------------- paper texture / vignette
  const paper = (() => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
    const x = c.getContext('2d');
    for (let i = 0; i < 15000; i++) {
      x.fillStyle = Math.random() < 0.5
        ? `rgba(96,64,32,${(Math.random() * 0.5).toFixed(2)})`
        : `rgba(255,244,220,${(Math.random() * 0.5).toFixed(2)})`;
      x.fillRect(Math.random() * 320 | 0, Math.random() * 240 | 0, 1, 1);
    }
    for (let i = 0; i < 130; i++) {
      x.strokeStyle = `rgba(120,84,40,${(Math.random() * 0.3).toFixed(2)})`;
      const fx = Math.random() * 320, fy = Math.random() * 240;
      x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + 3 + Math.random() * 7, fy + Math.random() * 2 - 1); x.stroke();
    }
    return c;
  })();

  let vig = null, ovl = null;
  function overlay(ctx) {
    if (!ovl) {
      ovl = document.createElement('canvas');
      ovl.width = 640; ovl.height = 480;
      const x = ovl.getContext('2d');
      x.globalAlpha = 0.14;
      x.drawImage(paper, 0, 0, 640, 480);
      x.globalAlpha = 1;
    }
    ctx.drawImage(ovl, 0, 0);
    if (!vig) {
      vig = ctx.createRadialGradient(320, 230, 200, 320, 240, 430);
      vig.addColorStop(0, 'rgba(40,20,10,0)');
      vig.addColorStop(1, 'rgba(40,20,10,0.30)');
    }
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 640, 480);
  }

  function exitGlow(ctx, x, y, t) {
    const a = 0.3 + Math.sin(t * 2.4) * 0.15;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 40);
    g.addColorStop(0, `rgba(244,220,160,${(a * 0.7).toFixed(2)})`);
    g.addColorStop(1, 'rgba(244,220,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(244,220,160,${a.toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 10 + Math.sin(t * 2.4) * 2, 0, Math.PI * 2); ctx.stroke();
  }

  // Chacha Bagh: sprite only — nothing draws until his sheet has arrived
  function drawGardenerChar(ctx, t) {
    if (!GardenerSprites.loaded) return;
    const TARGET_H = 100;
    const img = GardenerSprites.img;
    const k = TARGET_H / img.height;
    const w = img.width * k, h = img.height * k;
    ctx.save();
    ctx.translate(206, 384);
    const breathe = 1 + Math.sin(t * 1.4) * 0.006;
    ctx.scale(1, breathe);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }

  // ================================================================== SCENES
  // ------------------------------------------------------------------ GATE
  const gate = (() => {
    const rnd = mulberry32(11);
    const scene = makeScene('gate', 'The Alamgiri Gate');
    scene.exits = [
      { x: 545, y: 396, w: 95, h: 84, side: 'right', target: 'garden', spawn: { x: 75, y: 445 }, label: 'the Hazuri Bagh gardens' }
    ];
    scene.hotspots = [
      { x: 492, y: 282, w: 116, h: 130, label: 'the great wooden doors', lines: [
        'The doors are open, but the gatekeeper insists everyone must still knock. Tradition.'] },
      { x: 60, y: 170, w: 300, h: 120, label: 'the sandstone wall', lines: [
        'Warm, golden sandstone. As a prince, you may NOT carve your name into it.',
        'Your grandfather is still upset about the last time.'] },
      { x: 0, y: 392, w: 72, h: 88, label: 'the outer gates', lines: [
        'Closed since breakfast. The world outside can wait — the fort is quite enough for today.'] },
      { x: 470, y: 132, w: 150, h: 140, label: 'the marble pavilion', lines: [
        'The royal pavilion watches over the gate. Best view of the courtyard, worst chairs.'] },
      { x: 528, y: 60, w: 80, h: 60, label: 'the pennant', lines: [
        'The royal standard, fluttering its approval of this fine morning.'] }
    ];
    scene.props = [
      { y: 302, draw: (c, t) => potPlant(c, mulberry32(21), 500, 302, 0.9, t) },
      { y: 302, draw: (c, t) => potPlant(c, mulberry32(45), 632, 302, 0.9, t) }
    ];
    scene.drawBg = function (ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, '#f7d9a0'); g.addColorStop(0.6, '#f2b57c'); g.addColorStop(1, '#f9cd9a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 320);
      sunDisc(ctx, 84, 74, 20, 'rgba(255,240,205,0.85)', 'rgba(255,236,190,0)');
      for (const b of [{ x: 200, y: 60, s: 0.8, v: 6, ph: 1 }, { x: 400, y: 96, s: 0.7, v: 8, ph: 3 }, { x: 300, y: 50, s: 0.9, v: 5, ph: 5 }]) {
        const bx = (b.x + t * b.v) % 700 - 30;
        bird(ctx, bx, b.y + Math.sin(t + b.ph) * 3, b.s);
      }
      // ground, then the straight court
      const gg = ctx.createLinearGradient(0, 240, 0, 480);
      gg.addColorStop(0, '#b97f4e'); gg.addColorStop(1, '#d9b98a');
      ctx.fillStyle = gg; ctx.fillRect(0, 240, 640, 240);
      const cg = ctx.createLinearGradient(0, 396, 0, 480);
      cg.addColorStop(0, '#e8cda0'); cg.addColorStop(1, '#c9a878');
      ctx.fillStyle = cg; ctx.fillRect(0, 396, 640, 84);
      ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 397); ctx.lineTo(640, 397); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(122,74,40,0.4)';
      for (let i = 0; i < 12; i++) {
        const sx = 16 + i * 52;
        ctx.beginPath(); ctx.moveTo(sx, 402); ctx.lineTo(sx + 22, 478); ctx.stroke();
      }
      // sandstone wall across the top, gate tower at the right end
      stoneWall(ctx, mulberry32(31), 0, 150, 500, 152, '#c98d5a', '#a96b3c');
      kangura(ctx, 0, 142, 500, '#b97f4e');
      chhatri(ctx, 150, 152, 0.9);
      chhatri(ctx, 330, 152, 0.9);
      // gate tower
      stoneWall(ctx, mulberry32(51), 470, 140, 170, 162, '#c98d5a', '#a96b3c');
      kangura(ctx, 470, 132, 170, '#b97f4e');
      ctx.fillStyle = '#f2ead8';
      ctx.fillRect(506, 60, 100, 78);
      ctx.fillStyle = '#e0d4ba';
      ctx.fillRect(506, 60, 100, 7);
      for (const mx of [530, 556, 582]) {
        ctx.fillStyle = '#c9b891';
        pointedArch(ctx, mx, 134, 12, 30); ctx.fill();
      }
      ctx.fillStyle = '#f7f1e2';
      ctx.beginPath();
      ctx.moveTo(498, 60); ctx.quadraticCurveTo(556, 24, 614, 60); ctx.closePath(); ctx.fill();
      const fl = Math.sin(t * 3.1);
      ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(556, 26); ctx.lineTo(556, 4); ctx.stroke();
      ctx.fillStyle = '#c6552e';
      ctx.beginPath();
      ctx.moveTo(556, 4);
      ctx.quadraticCurveTo(584, 8 + fl * 3, 608, 14 + fl * 4);
      ctx.quadraticCurveTo(584, 18 + fl * 2, 556, 20);
      ctx.closePath(); ctx.fill();
      // tall arch opening in the tower, at the wall base
      ctx.fillStyle = '#8a5a33';
      pointedArch(ctx, 566, 302, 118, 176); ctx.fill();
      ctx.fillStyle = '#5c3a1e';
      pointedArch(ctx, 566, 302, 102, 166); ctx.fill();
      const ag = ctx.createLinearGradient(0, 136, 0, 302);
      ag.addColorStop(0, '#2c1810'); ag.addColorStop(1, '#4a2c18');
      ctx.fillStyle = ag;
      pointedArch(ctx, 566, 302, 86, 156); ctx.fill();
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(534, 204, 32, 98);
      ctx.fillStyle = '#7a4e28';
      ctx.fillRect(566, 194, 32, 108);
      ctx.fillStyle = 'rgba(40,24,10,0.5)';
      for (const [dx2, dw] of [[534, 32], [566, 32]]) {
        for (let sy = 210; sy < 296; sy += 14) ctx.fillRect(dx2 + 2, sy, dw - 4, 2);
      }
      ctx.fillStyle = '#d4a017';
      for (const [dx2, dy2] of [[539, 212], [539, 232], [539, 252], [592, 202], [592, 222], [592, 242], [592, 262]]) {
        ctx.beginPath(); ctx.arc(dx2, dy2, 1.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(96,54,22,0.35)';
      ctx.fillRect(0, 302, 640, 6);
      const r2 = mulberry32(77);
      for (let i = 0; i < 8; i++) grassTuft(ctx, r2, 30 + r2() * 580, 308 + r2() * 6, 5 + r2() * 5);
      exitGlow(ctx, 592, 438, t);
    };
    scene.drawFg = function (ctx, t) {
      fgFoliage(ctx, mulberry32(911), 14, -8, 62);
    };
    return scene;
  })();

  // ---------------------------------------------------------------- GARDEN
  const garden = (() => {
    const rnd = mulberry32(101);
    const fcols = ['#e86a8a', '#f2c14e', '#f0f0f7', '#e8845a'];
    const scene = makeScene('garden', 'Hazuri Bagh');
    scene.exits = [
      { x: 0, y: 380, w: 42, h: 100, side: 'left', target: 'gate', spawn: { x: 500, y: 436 }, label: 'the Alamgiri Gate' },
      { x: 598, y: 380, w: 42, h: 100, side: 'right', target: 'terrace', spawn: { x: 75, y: 440 }, label: 'the marble terrace' }
    ];
    scene.hotspots = [
      { x: 168, y: 312, w: 78, h: 78, label: 'the old gardener', talk: true, npc: 'gardener' },
      { x: 248, y: 286, w: 150, h: 60, label: 'the fountain', lines: [
        'The fountain insists on dancing, even when nobody is watching. Respect.'] },
      { x: 440, y: 262, w: 130, h: 110, label: 'the mango tree', lines: [
        'Not ripe yet. The fort monkeys follow a very strict schedule.'] },
      { x: 30, y: 140, w: 190, h: 90, label: 'the marble pavilion', lines: [
        'The white pavilion. Perfect for afternoon daydreams, of which you have many.'] },
      { x: 66, y: 328, w: 140, h: 46, label: 'the flowerbeds', lines: [
        'Marigolds, roses, and one extremely proud sunflower.'] },
      { x: 290, y: 118, w: 120, h: 60, label: 'a butterfly', lines: [
        'Even the butterflies are on holiday today.'] }
    ];
    scene.props = [
      { y: 384, draw: (c, t) => drawGardenerChar(c, t) },
      { y: 396, draw: (c, t) => {
        // mango tree at the right side
        const sway = Math.sin(t * 0.9) * 2;
        c.strokeStyle = '#6b4423'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(505, 392); c.quadraticCurveTo(495, 350, 503, 316); c.stroke();
        c.lineWidth = 3.5;
        c.beginPath(); c.moveTo(503, 330); c.quadraticCurveTo(482, 322, 472, 314); c.stroke();
        canopy(c, mulberry32(303), 496 + sway, 292, 40, sway);
        c.fillStyle = '#f2a03d';
        for (const [mx, my] of [[474, 318], [492, 322], [514, 314], [524, 304], [488, 300]]) {
          c.beginPath(); c.ellipse(mx, my, 2.6, 3.5, 0.4, 0, Math.PI * 2); c.fill();
        }
      } },
      { y: 392, draw: (c, t) => {
        cypress(c, 96, 392, 110);
        cypress(c, 146, 390, 78, '#4e8f4a');
      } }
    ];
    scene.drawBg = function (ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 240);
      g.addColorStop(0, '#aee0e8'); g.addColorStop(0.7, '#d8ecd9'); g.addColorStop(1, '#f7e9c9');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 240);
      sunDisc(ctx, 552, 56, 15, 'rgba(255,244,210,0.8)', 'rgba(255,240,195,0)');
      for (const c of [{ x: 120, y: 46, s: 0.9, v: 3 }, { x: 380, y: 80, s: 0.8, v: 2.4 }, { x: 560, y: 40, s: 0.7, v: 3.6 }]) {
        cloud(ctx, mulberry32(c.x | 0), ((c.x + t * c.v) % 720) - 40, c.y, c.s);
      }
      // distant white pavilion, hazy, top-left
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#f4efe2';
      ctx.fillRect(40, 158, 170, 58);
      ctx.fillStyle = '#e2d9c4';
      ctx.fillRect(40, 158, 170, 6);
      for (const mx of [66, 92, 118, 148, 178]) {
        ctx.fillStyle = '#cbbfa2';
        pointedArch(ctx, mx, 212, 14, 38); ctx.fill();
      }
      ctx.fillStyle = '#f7f3e8';
      for (const dx of [64, 125, 186]) {
        ctx.beginPath();
        ctx.moveTo(dx - 18, 158); ctx.quadraticCurveTo(dx, 130, dx + 18, 158); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // lawn
      const gg = ctx.createLinearGradient(0, 200, 0, 480);
      gg.addColorStop(0, '#8cc97a'); gg.addColorStop(0.5, '#6fae5a'); gg.addColorStop(1, '#7cb868');
      ctx.fillStyle = gg; ctx.fillRect(0, 200, 640, 280);
      ctx.fillStyle = 'rgba(255,250,220,0.10)';
      for (let i = 0; i < 6; i++) ctx.fillRect(0, 214 + i * 40, 640, 13);
      // hedges along the far side
      ctx.fillStyle = '#4e8f4a';
      blob(ctx, mulberry32(51), 120, 226, 140, 15, 0.4); ctx.fill();
      blob(ctx, mulberry32(52), 480, 214, 150, 14, 0.4); ctx.fill();
      // central marble fountain tank
      ctx.fillStyle = '#e8e0cc';
      rr(ctx, 256, 300, 148, 44, 8); ctx.fill();
      ctx.fillStyle = '#f4efe0';
      rr(ctx, 250, 294, 160, 13, 6); ctx.fill();
      const wg = ctx.createLinearGradient(0, 310, 0, 338);
      wg.addColorStop(0, '#7ecfd4'); wg.addColorStop(1, '#4aa8b0');
      ctx.fillStyle = wg;
      rr(ctx, 262, 306, 136, 32, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 3; i++) {
        const rp = ((t * 0.5 + i / 3) % 1);
        ctx.globalAlpha = 0.55 * (1 - rp);
        ctx.beginPath();
        ctx.ellipse(330, 322, 6 + rp * 46, 2.4 + rp * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#efe8d8';
      ctx.fillRect(326, 300, 8, 12);
      ctx.beginPath(); ctx.ellipse(330, 300, 6.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI / 2 + (k - 2) * 0.32;
        const jx = 330 + Math.cos(ang) * 22, jy = 304 + Math.sin(ang) * 17;
        ctx.beginPath();
        ctx.moveTo(330, 300);
        ctx.quadraticCurveTo(330 + (jx - 330) * 0.5, 295, jx, jy);
        ctx.stroke();
      }
      // flowerbeds
      ctx.fillStyle = '#3a6b45';
      blob(ctx, mulberry32(61), 136, 386, 76, 14, 0.4); ctx.fill();
      blob(ctx, mulberry32(62), 430, 260, 74, 14, 0.4); ctx.fill();
      ctx.fillStyle = '#5d9a4e';
      blob(ctx, mulberry32(63), 136, 383, 66, 10, 0.4); ctx.fill();
      blob(ctx, mulberry32(64), 430, 257, 64, 10, 0.4); ctx.fill();
      flowerDots(ctx, mulberry32(65), 76, 374, 120, 20, 18, fcols);
      flowerDots(ctx, mulberry32(66), 386, 248, 108, 18, 16, fcols);
      // sandy walking path along the bottom
      const pg = ctx.createLinearGradient(0, 396, 0, 480);
      pg.addColorStop(0, '#dcc79c'); pg.addColorStop(1, '#c9b184');
      ctx.fillStyle = pg; ctx.fillRect(0, 396, 640, 84);
      ctx.strokeStyle = '#7a5e28'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(0, 397); ctx.lineTo(640, 397); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(122,94,40,0.35)';
      for (let i = 0; i < 12; i++) {
        const sx = 16 + i * 52;
        ctx.beginPath(); ctx.moveTo(sx, 402); ctx.lineTo(sx + 22, 478); ctx.stroke();
      }
      const r3 = mulberry32(88);
      for (let i = 0; i < 10; i++) grassTuft(ctx, r3, r3() * 640, 400 + r3() * 8, 6 + r3() * 6);
      butterfly(ctx, t, 330, 150, '#f2a03d', 0);
      butterfly(ctx, t, 390, 180, '#7ea8e8', 2.6);
      exitGlow(ctx, 20, 438, t);
      exitGlow(ctx, 619, 438, t);
    };
    scene.drawFg = function (ctx, t) {
      fgFoliage(ctx, mulberry32(921), 24, -10, 62);
      fgVine(ctx, mulberry32(923), 100, 56);
    };
    return scene;
  })();

  // --------------------------------------------------------------- TERRACE
  const terrace = (() => {
    const stars = [];
    {
      const rnd = mulberry32(202);
      for (let i = 0; i < 42; i++) stars.push([rnd() * 640, 8 + rnd() * 150, rnd() * 6, 0.7 + rnd() * 1.1]);
    }
    const scene = makeScene('terrace', 'The Marble Terrace');
    scene.exits = [
      { x: 0, y: 380, w: 42, h: 100, side: 'left', target: 'garden', spawn: { x: 560, y: 445 }, label: 'the Hazuri Bagh gardens' }
    ];
    scene.hotspots = [
      { x: 452, y: 288, w: 84, h: 86, label: 'the palace peacock', lines: [
        'The palace peacock. He judges everyone, silently — but kindly.'] },
      { x: 156, y: 360, w: 40, h: 30, label: 'the teapot', pickup: true, item: 'teapot', flag: 'teapotTaken',
        pickupLines: ['The second cup is always for whoever wanders by.', 'Today, that will be Chacha Bagh, the gardener.'] },
      { x: 128, y: 356, w: 104, h: 62, label: 'the tea table', lines: [
        'Two cups. The second is always for whoever happens to wander by.'] },
      { x: 80, y: 150, w: 460, h: 120, label: 'the hall of mirrors', lines: [
        'Five hundred candles inside, and every one of them on its best behavior.'] },
      { x: 42, y: 34, w: 74, h: 60, label: 'the early moon', lines: [
        'Even the moon arrives early, to get the best seat for the sunset.'] },
      { x: 356, y: 262, w: 60, h: 78, label: 'a standing lantern', lines: [
        'It has been lit every evening for two hundred years. Never once late.'] }
    ];
    scene.props = [
      { y: 382, draw: (c, t) => lantern(c, 470, 362, 0.95, t, 'rgba(255,196,110,A)') },
      { y: 330, draw: (c, t) => {
        // peacock beside the path
        const sway = Math.sin(t * 1.4) * 1.5;
        c.fillStyle = '#2a7a9e';
        c.beginPath(); c.ellipse(486, 306, 11, 15, 0.1, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#2a7a9e'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(486, 316); c.lineTo(486, 334); c.stroke();
        c.strokeStyle = '#8a6a2a'; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(482, 334); c.lineTo(482, 338); c.moveTo(490, 334); c.lineTo(490, 338); c.stroke();
        c.fillStyle = '#1e5a78';
        c.beginPath(); c.ellipse(484, 294, 5, 6.4, -0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e8f4f7';
        c.beginPath(); c.arc(482.6, 291.8, 1, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f2c14e';
        c.beginPath(); c.moveTo(478, 295.5); c.lineTo(474.4, 296.6); c.lineTo(478, 297.7); c.closePath(); c.fill();
        c.strokeStyle = '#2a7a9e'; c.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) {
          const a = -0.5 + i * 0.45;
          c.beginPath(); c.moveTo(482, 289); c.lineTo(482 + Math.sin(a) * 4.5, 284.4 - i * 0.9); c.stroke();
          c.fillStyle = '#3ecfb2';
          c.beginPath(); c.arc(482 + Math.sin(a) * 4.5, 284.4 - i * 0.9, 0.9, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#1e6a78';
        c.beginPath();
        c.moveTo(491, 301);
        c.quadraticCurveTo(506 + sway, 308, 508 + sway, 326);
        c.quadraticCurveTo(496, 320, 489, 313);
        c.closePath(); c.fill();
        c.fillStyle = '#3ecfb2';
        for (let i = 0; i < 3; i++) {
          c.beginPath(); c.ellipse(498 + i * 3 + sway * 0.5, 308 + i * 5.4, 1.5, 2.3, 0.5, 0, Math.PI * 2); c.fill();
        }
      } },
      { y: 412, draw: (c, t) => {
        // low tea table + cushion
        c.fillStyle = '#c05a7a';
        rr(c, 128, 402, 28, 11, 5); c.fill();
        c.fillStyle = '#a84866';
        rr(c, 132, 406, 28, 11, 5); c.fill();
        c.fillStyle = '#8a5a33';
        c.beginPath(); c.moveTo(150, 382); c.lineTo(200, 382); c.lineTo(194, 398); c.lineTo(156, 398); c.closePath(); c.fill();
        c.fillStyle = '#6b4423'; c.fillRect(158, 398, 34, 10);
        if (!Game.flags.teapotTaken) {
          c.fillStyle = '#f4efe2';
          c.beginPath(); c.ellipse(168, 381, 6.4, 2.8, 0, 0, Math.PI * 2); c.fill();
          c.fillRect(163, 375, 10, 6);
          c.beginPath(); c.ellipse(165.5, 375, 4, 3, 0, Math.PI, 0); c.fill();
          c.beginPath(); c.ellipse(172.5, 375, 4, 3, 0, Math.PI, 0); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.55)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(168, 371);
          c.quadraticCurveTo(171 + Math.sin(t * 2) * 2, 366, 168, 361);
          c.stroke();
        }
        c.fillStyle = '#f4efe2';
        c.beginPath(); c.arc(190, 380.5, 2.7, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#c05a7a';
        c.beginPath(); c.arc(190, 380.5, 1.4, 0, Math.PI * 2); c.fill();
      } }
    ];
    scene.drawBg = function (ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#8a7ab0'); g.addColorStop(0.45, '#c898b8'); g.addColorStop(0.8, '#efc29a'); g.addColorStop(1, '#f7d9a8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 300);
      for (const [sx2, sy2, ph, ss] of stars) {
        ctx.globalAlpha = 0.35 + 0.45 * Math.sin(t * 1.8 + ph);
        ctx.fillStyle = '#fdf6e3';
        ctx.fillRect(sx2, sy2, ss, ss);
      }
      ctx.globalAlpha = 1;
      // crescent moon, top-left
      const mg = ctx.createRadialGradient(70, 64, 4, 70, 64, 38);
      mg.addColorStop(0, 'rgba(253,246,227,0.5)'); mg.addColorStop(1, 'rgba(253,246,227,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(70, 64, 38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7f0dc';
      ctx.beginPath(); ctx.arc(70, 64, 12.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c898b8';
      ctx.beginPath(); ctx.arc(75, 60, 11, 0, Math.PI * 2); ctx.fill();
      // distant fort silhouette
      ctx.fillStyle = 'rgba(106,74,104,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, 262);
      ctx.quadraticCurveTo(60, 258, 80, 238); ctx.lineTo(80, 224);
      ctx.quadraticCurveTo(100, 200, 120, 224); ctx.lineTo(120, 244);
      ctx.lineTo(170, 244); ctx.lineTo(170, 232);
      ctx.quadraticCurveTo(195, 204, 220, 232); ctx.lineTo(220, 250);
      ctx.lineTo(300, 250); ctx.lineTo(300, 236);
      ctx.quadraticCurveTo(330, 202, 360, 236); ctx.lineTo(360, 252);
      ctx.lineTo(430, 252); ctx.lineTo(430, 240);
      ctx.quadraticCurveTo(455, 214, 480, 240); ctx.lineTo(480, 258);
      ctx.lineTo(545, 258); ctx.lineTo(545, 248);
      ctx.quadraticCurveTo(572, 222, 600, 248); ctx.lineTo(600, 268);
      ctx.lineTo(640, 268); ctx.lineTo(640, 300);
      ctx.lineTo(0, 300);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,205,120,0.9)';
      for (const [wx, wy] of [[92, 236], [188, 242], [342, 244], [444, 248], [574, 260]]) {
        ctx.fillRect(wx, wy, 4, 6);
      }
      // hall of mirrors along the top
      ctx.fillStyle = '#e0d4ba';
      ctx.fillRect(60, 150, 490, 128);
      const wg2 = ctx.createLinearGradient(0, 150, 0, 278);
      wg2.addColorStop(0, '#efe6cf'); wg2.addColorStop(1, '#d9cbaa');
      ctx.fillStyle = wg2;
      ctx.fillRect(60, 156, 490, 122);
      ctx.fillStyle = '#b98a5a';
      ctx.fillRect(60, 180, 490, 5);
      ctx.fillStyle = '#8a5a33';
      for (let bx = 66; bx < 544; bx += 26) ctx.fillRect(bx, 181, 12, 3);
      for (let i = 0; i < 5; i++) {
        const ax = 106 + i * 100;
        ctx.fillStyle = '#b09468';
        cuspedArch(ctx, ax, 272, 64, 100); ctx.fill();
        if (i === 1 || i === 3) {
          const ag = ctx.createLinearGradient(0, 175, 0, 272);
          ag.addColorStop(0, '#f7c87a'); ag.addColorStop(1, '#e89a5a');
          ctx.fillStyle = ag;
          cuspedArch(ctx, ax, 268, 50, 88); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,190,0.9)';
          for (let k = 0; k < 4; k++) {
            ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5 + k + i);
            ctx.beginPath(); ctx.arc(ax - 12 + (k % 2) * 24, 258 - k * 20, 1.8, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = '#6b5138';
          cuspedArch(ctx, ax, 268, 50, 88); ctx.fill();
          ctx.fillStyle = '#4a3a28';
          cuspedArch(ctx, ax, 268, 38, 80); ctx.fill();
        }
      }
      // marble floor
      const fg = ctx.createLinearGradient(0, 278, 0, 480);
      fg.addColorStop(0, '#cfc8b6'); fg.addColorStop(0.4, '#e8e2d4'); fg.addColorStop(1, '#d5cdb8');
      ctx.fillStyle = fg;
      ctx.fillRect(0, 278, 640, 202);
      ctx.strokeStyle = 'rgba(140,120,90,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const y = 284 + i * i * 1.3 + i * 5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke();
      }
      // rose-carpet walking band
      const cg = ctx.createLinearGradient(0, 396, 0, 480);
      cg.addColorStop(0, '#e0b8c0'); cg.addColorStop(1, '#d8aab4');
      ctx.fillStyle = cg; ctx.fillRect(0, 396, 640, 84);
      ctx.strokeStyle = '#a8788a'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(0, 397); ctx.lineTo(640, 397); ctx.stroke();
      // rose petals
      const rp = mulberry32(404);
      ctx.fillStyle = '#e8a0b4';
      for (let i = 0; i < 20; i++) {
        const px2 = rp() * 640, py2 = 402 + rp() * 74;
        ctx.beginPath(); ctx.ellipse(px2, py2, 2.4, 1.3, rp() * 3, 0, Math.PI * 2); ctx.fill();
      }
      // standing lantern
      lantern(ctx, 384, 286, 1.0, t, 'rgba(255,196,110,A)');
      exitGlow(ctx, 20, 438, t);
    };
    scene.drawFg = function (ctx, t) {
      fgFoliage(ctx, mulberry32(931), 20, -8, 56);
    };
    return scene;
  })();

  return { list: { gate, garden, terrace }, overlay, get gardenerLoaded() { return GardenerSprites.loaded; } };
})();
