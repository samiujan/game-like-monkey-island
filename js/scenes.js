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

  // ------------------------------------------------------------ the ground
  // The walkable floor is a trapezoid, not a flat band: a far edge up near the
  // back wall and a near edge at the bottom of the frame. Everything about
  // perspective hangs off this — clamp() keeps the prince on the floor, and
  // depth(y) is the ramp that scales him (and anything else) with distance.
  const GROUND = {
    far:  { y: 302, x0: 130, x1: 510 },
    near: { y: 476, x0: -40, x1: 680 }
  };
  const SCALE_FAR = 0.72;   // at the far edge — a small figure by the wall
  const SCALE_NEAR = 1.20;  // at the near edge — close to the camera

  function makeScene(id, name, ground) {
    const G = ground || GROUND;
    const t01 = (y) => Math.max(0, Math.min(1, (y - G.far.y) / (G.near.y - G.far.y)));
    // the left/right bounds of the floor at a given depth
    function span(y) {
      const t = t01(y);
      return {
        x0: G.far.x0 + (G.near.x0 - G.far.x0) * t,
        x1: G.far.x1 + (G.near.x1 - G.far.x1) * t
      };
    }
    return {
      id, name,
      ground: G,
      span,
      blocked: [],
      clamp(x, y) {
        const cy = Math.max(G.far.y, Math.min(G.near.y, y));
        const s = span(cy);
        return { x: Math.max(s.x0, Math.min(s.x1, x)), y: cy };
      },
      depth(y) {
        return SCALE_FAR + (SCALE_NEAR - SCALE_FAR) * t01(y);
      }
    };
  }

  // The fan of paving joints that makes a floor read as receding: lines through
  // a vanishing point on the horizon, crossed by rows that crowd together as
  // they approach it.
  function paving(ctx, vpx, vpy, rowYs, lineAlpha, rowAlpha) {
    ctx.save();
    ctx.strokeStyle = `rgba(120,74,42,${lineAlpha})`;
    ctx.lineWidth = 1;
    for (let bx = -300; bx <= 940; bx += 74) {
      ctx.beginPath();
      ctx.moveTo(vpx, vpy);
      ctx.lineTo(bx, 480);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(120,74,42,${rowAlpha})`;
    for (const ry of rowYs) {
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(640, ry); ctx.stroke();
    }
    ctx.restore();
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

  // Chacha Bagh: sprite only — nothing draws until his sheet has arrived.
  // baseY is where his feet rest on the floor; s is the depth scale there.
  function drawGardenerChar(ctx, t, baseY, s) {
    if (!GardenerSprites.loaded) return;
    const TARGET_H = 134 * s;
    const img = GardenerSprites.img;
    const k = TARGET_H / img.height;
    const w = img.width * k, h = img.height * k;
    ctx.save();
    ctx.translate(206, baseY);
    // soft shadow, matched to the prince's
    ctx.fillStyle = 'rgba(30,60,24,0.20)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 20 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
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
      { x: 552, y: 312, w: 88, h: 164, side: 'right', target: 'garden', spawn: { x: 78, y: 448 }, label: 'the Hazuri Bagh gardens' }
    ];
    scene.hotspots = [
      { x: 500, y: 150, w: 134, h: 152, label: 'the great wooden doors', lines: [
        'The doors are open, but the gatekeeper insists everyone must still knock. Tradition.'] },
      { x: 40, y: 168, w: 330, h: 134, label: 'the sandstone wall', lines: [
        'Warm, golden sandstone. As a prince, you may NOT carve your name into it.',
        'Your grandfather is still upset about the last time.'] },
      { x: 24, y: 196, w: 96, h: 106, label: 'the outer gates', lines: [
        'Closed since breakfast. The world outside can wait — the fort is quite enough for today.'] },
      { x: 498, y: 56, w: 116, h: 84, label: 'the marble pavilion', lines: [
        'The royal pavilion watches over the gate. Best view of the courtyard, worst chairs.'] },
      { x: 522, y: 4, w: 96, h: 58, label: 'the pennant', lines: [
        'The royal standard, fluttering its approval of this fine morning.'] }
    ];
    scene.props = [
      { y: 318, draw: (c, t) => potPlant(c, mulberry32(21), 486, 318, 1.2 * scene.depth(318), t) },
      { y: 322, draw: (c, t) => potPlant(c, mulberry32(45), 626, 322, 1.2 * scene.depth(322), t) }
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
      // ---- the courtyard floor: a receding plane running down from the wall ----
      const HORIZON = 302, VPX = 320;
      const fgr = ctx.createLinearGradient(0, HORIZON, 0, 480);
      fgr.addColorStop(0, '#c1926a'); fgr.addColorStop(0.22, '#d8b489');
      fgr.addColorStop(0.62, '#e8cda0'); fgr.addColorStop(1, '#cfa87a');
      ctx.fillStyle = fgr; ctx.fillRect(0, HORIZON, 640, 480 - HORIZON);
      // joints fan out from a vanishing point; rows crowd together toward it
      paving(ctx, VPX, HORIZON, [303, 312, 324, 340, 360, 386, 418, 456, 478], 0.15, 0.24);
      // the wall's shadow pooling at its base — this is what sells the depth
      const sg2 = ctx.createLinearGradient(0, HORIZON, 0, 344);
      sg2.addColorStop(0, 'rgba(72,36,14,0.34)');
      sg2.addColorStop(1, 'rgba(72,36,14,0)');
      ctx.fillStyle = sg2; ctx.fillRect(0, HORIZON, 640, 42);
      // sandstone wall across the top, gate tower at the right end
      stoneWall(ctx, mulberry32(31), 0, 150, 500, 152, '#c98d5a', '#a96b3c');
      kangura(ctx, 0, 142, 500, '#b97f4e');
      chhatri(ctx, 150, 152, 0.9);
      chhatri(ctx, 330, 152, 0.9);
      // the outer doors, shut, at the left end of the wall
      ctx.fillStyle = '#6b4423';
      pointedArch(ctx, 72, 302, 88, 112); ctx.fill();
      ctx.fillStyle = '#4a2c18';
      pointedArch(ctx, 72, 302, 76, 102); ctx.fill();
      ctx.fillStyle = 'rgba(28,16,6,0.6)';
      ctx.fillRect(70, 204, 4, 98);
      ctx.fillStyle = '#d4a017';
      for (const [dx3, dy3] of [[56, 246], [62, 266], [82, 246], [88, 266]]) {
        ctx.beginPath(); ctx.arc(dx3, dy3, 1.7, 0, Math.PI * 2); ctx.fill();
      }
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
      // grass sprouting through the paving, sized by how far away it is
      const r2 = mulberry32(77);
      for (let i = 0; i < 16; i++) {
        const gy = 312 + r2() * 158;
        grassTuft(ctx, r2, r2() * 640, gy, (4 + r2() * 5) * scene.depth(gy));
      }
      exitGlow(ctx, 600, 432, t);
    };
    scene.drawFg = function (ctx, t) {
      // framing: foliage cropping the corners, as in the reference shots
      fgFoliage(ctx, mulberry32(911), 14, -8, 62);
      fgFoliage(ctx, mulberry32(913), -14, 502, 76);
      fgFoliage(ctx, mulberry32(917), 650, 508, 80);
    };
    return scene;
  })();

  // ---------------------------------------------------------------- GARDEN
  const garden = (() => {
    const rnd = mulberry32(101);
    const fcols = ['#e86a8a', '#f2c14e', '#f0f0f7', '#e8845a'];
    const scene = makeScene('garden', 'Hazuri Bagh', {
      far:  { y: 300, x0: 90, x1: 550 },
      near: { y: 478, x0: -60, x1: 700 }
    });

    // a flowerbed: a low mound of flowers, sized by how far up the lawn it sits
    function flowerbed(c, seed, cx, cy, w) {
      const s = scene.depth(cy);
      c.save();
      c.translate(cx, cy);
      c.scale(s, s);
      c.fillStyle = '#3a6b45';
      blob(c, mulberry32(seed), 0, 0, w, 14, 0.4); c.fill();
      c.fillStyle = '#5d9a4e';
      blob(c, mulberry32(seed + 1), 0, -3, w - 10, 10, 0.4); c.fill();
      flowerDots(c, mulberry32(seed + 2), -w + 12, -12, (w - 12) * 2, 20, Math.round(w * 0.22), fcols);
      c.restore();
    }

    scene.exits = [
      { x: 0, y: 336, w: 46, h: 142, side: 'left', target: 'gate', spawn: { x: 500, y: 436 }, label: 'the Alamgiri Gate' },
      { x: 594, y: 336, w: 46, h: 142, side: 'right', target: 'terrace', spawn: { x: 78, y: 442 }, label: 'the marble terrace' }
    ];
    scene.hotspots = [
      { x: 162, y: 242, w: 88, h: 136, label: 'the old gardener', talk: true, npc: 'gardener' },
      { x: 230, y: 308, w: 200, h: 68, label: 'the fountain', lines: [
        'The fountain insists on dancing, even when nobody is watching. Respect.'] },
      { x: 442, y: 226, w: 108, h: 168, label: 'the mango tree', lines: [
        'Not ripe yet. The fort monkeys follow a very strict schedule.'] },
      { x: 30, y: 126, w: 200, h: 96, label: 'the marble pavilion', lines: [
        'The white pavilion. Perfect for afternoon daydreams, of which you have many.'] },
      { x: 62, y: 424, w: 180, h: 42, label: 'the flowerbeds', lines: [
        'Marigolds, roses, and one extremely proud sunflower.'] },
      { x: 286, y: 116, w: 128, h: 62, label: 'a butterfly', lines: [
        'Even the butterflies are on holiday today.'] }
    ];
    scene.props = [
      { y: 374, draw: (c, t) => drawGardenerChar(c, t, 374, scene.depth(374)) },
      { y: 336, draw: (c, t) => flowerbed(c, 61, 430, 336, 74) },
      { y: 446, draw: (c, t) => flowerbed(c, 65, 152, 446, 84) },
      { y: 372, draw: (c, t) => {
        // the marble fountain tank, drawn from its own base at the origin
        const s = scene.depth(372) * 1.3;
        c.save();
        c.translate(330, 372);
        c.scale(s, s);
        c.fillStyle = '#e8e0cc';
        rr(c, -74, -44, 148, 44, 8); c.fill();
        c.fillStyle = '#f4efe0';
        rr(c, -80, -50, 160, 13, 6); c.fill();
        const wg = c.createLinearGradient(0, -38, 0, -6);
        wg.addColorStop(0, '#7ecfd4'); wg.addColorStop(1, '#4aa8b0');
        c.fillStyle = wg;
        rr(c, -68, -38, 136, 32, 5); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 3; i++) {
          const rp = ((t * 0.5 + i / 3) % 1);
          c.globalAlpha = 0.55 * (1 - rp);
          c.beginPath();
          c.ellipse(0, -22, 6 + rp * 46, 2.4 + rp * 9, 0, 0, Math.PI * 2);
          c.stroke();
        }
        c.globalAlpha = 1;
        c.fillStyle = '#efe8d8';
        c.fillRect(-4, -44, 8, 12);
        c.beginPath(); c.ellipse(0, -44, 6.5, 3.6, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.75)';
        c.lineWidth = 1.4;
        for (let k = 0; k < 5; k++) {
          const ang = -Math.PI / 2 + (k - 2) * 0.32;
          const jx = Math.cos(ang) * 22, jy = -44 + Math.sin(ang) * 17;
          c.beginPath();
          c.moveTo(0, -44);
          c.quadraticCurveTo(jx * 0.5, -49, jx, jy);
          c.stroke();
        }
        c.restore();
      } },
      { y: 392, draw: (c, t) => {
        // the mango tree, far side of the lawn
        const s = scene.depth(392) * 1.2;
        c.save();
        c.translate(500, 392);
        c.scale(s, s);
        const sway = Math.sin(t * 0.9) * 2;
        c.strokeStyle = '#6b4423'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(5, 0); c.quadraticCurveTo(-5, -42, 3, -76); c.stroke();
        c.lineWidth = 3.5;
        c.beginPath(); c.moveTo(3, -62); c.quadraticCurveTo(-18, -70, -28, -78); c.stroke();
        canopy(c, mulberry32(303), -4 + sway, -100, 40, sway);
        c.fillStyle = '#f2a03d';
        for (const [mx, my] of [[-26, -74], [-8, -70], [14, -78], [24, -88], [-12, -92]]) {
          c.beginPath(); c.ellipse(mx, my, 2.6, 3.5, 0.4, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      } },
      { y: 386, draw: (c, t) => {
        const s = scene.depth(386);
        c.save(); c.translate(96, 386); c.scale(s, s); cypress(c, 0, 0, 110); c.restore();
        c.save(); c.translate(146, 386); c.scale(s, s); cypress(c, 0, 0, 78, '#4e8f4a'); c.restore();
      } }
    ];
    scene.drawBg = function (ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#aee0e8'); g.addColorStop(0.7, '#d8ecd9'); g.addColorStop(1, '#f7e9c9');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 300);
      sunDisc(ctx, 552, 56, 15, 'rgba(255,244,210,0.8)', 'rgba(255,240,195,0)');
      for (const c of [{ x: 120, y: 46, s: 0.9, v: 3 }, { x: 380, y: 80, s: 0.8, v: 2.4 }, { x: 560, y: 40, s: 0.7, v: 3.6 }]) {
        cloud(ctx, mulberry32(c.x | 0), ((c.x + t * c.v) % 720) - 40, c.y, c.s);
      }
      // distant white pavilion, hazy, sitting on the horizon
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#f4efe2';
      ctx.fillRect(40, 230, 170, 58);
      ctx.fillStyle = '#e2d9c4';
      ctx.fillRect(40, 230, 170, 6);
      for (const mx of [66, 92, 118, 148, 178]) {
        ctx.fillStyle = '#cbbfa2';
        pointedArch(ctx, mx, 284, 14, 38); ctx.fill();
      }
      ctx.fillStyle = '#f7f3e8';
      for (const dx of [64, 125, 186]) {
        ctx.beginPath();
        ctx.moveTo(dx - 18, 230); ctx.quadraticCurveTo(dx, 202, dx + 18, 230); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // ---- the lawn: an open plane running back from the hedges ----
      const HORIZON = 300, VPX = 320;
      const lg = ctx.createLinearGradient(0, HORIZON, 0, 480);
      lg.addColorStop(0, '#547f42'); lg.addColorStop(0.35, '#639a4f'); lg.addColorStop(1, '#74ad5c');
      ctx.fillStyle = lg; ctx.fillRect(0, HORIZON, 640, 480 - HORIZON);
      // mowing stripes: wedges through the vanishing point, so they converge
      ctx.save();
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = '#ffffff';
      for (let i = -4; i < 4; i += 2) {
        ctx.beginPath();
        ctx.moveTo(VPX, HORIZON);
        ctx.lineTo(VPX + i * 96, 480);
        ctx.lineTo(VPX + (i + 1) * 96, 480);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // hedges marking the far edge of the lawn, layered for a clear horizon
      ctx.fillStyle = '#3f7a3c';
      blob(ctx, mulberry32(51), 150, HORIZON - 18, 200, 20, 0.4); ctx.fill();
      blob(ctx, mulberry32(52), 500, HORIZON - 22, 190, 19, 0.4); ctx.fill();
      ctx.fillStyle = '#4e8f4a';
      blob(ctx, mulberry32(53), 150, HORIZON - 26, 170, 14, 0.4); ctx.fill();
      blob(ctx, mulberry32(54), 500, HORIZON - 30, 160, 13, 0.4); ctx.fill();
      // the hedge line's shadow falling across the top of the lawn
      const hg = ctx.createLinearGradient(0, HORIZON, 0, 344);
      hg.addColorStop(0, 'rgba(28,58,22,0.36)');
      hg.addColorStop(1, 'rgba(28,58,22,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, HORIZON, 640, 44);
      // grass, sized by how far up the lawn it grows
      const r3 = mulberry32(88);
      for (let i = 0; i < 26; i++) {
        const gy = HORIZON + 8 + r3() * 168;
        grassTuft(ctx, r3, r3() * 640, gy, (4 + r3() * 6) * scene.depth(gy));
      }
      // the sandy path, right up against the camera
      const pg = ctx.createLinearGradient(0, 448, 0, 480);
      pg.addColorStop(0, 'rgba(219,197,152,0)');
      pg.addColorStop(1, 'rgba(212,187,141,0.95)');
      ctx.fillStyle = pg; ctx.fillRect(0, 448, 640, 32);
      const pr = mulberry32(89);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = `rgba(150,120,70,${(0.10 + pr() * 0.14).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(pr() * 640, 456 + pr() * 22, 6 + pr() * 14, 2 + pr() * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      butterfly(ctx, t, 330, 150, '#f2a03d', 0);
      butterfly(ctx, t, 390, 180, '#7ea8e8', 2.6);
      exitGlow(ctx, 20, 428, t);
      exitGlow(ctx, 620, 428, t);
    };
    scene.drawFg = function (ctx, t) {
      // framing: foliage cropping the frame, as in the reference shots
      fgFoliage(ctx, mulberry32(921), 24, -10, 62);
      fgVine(ctx, mulberry32(923), 100, 56);
      fgFoliage(ctx, mulberry32(925), -16, 500, 84);
      fgFoliage(ctx, mulberry32(927), 656, 506, 88);
      fgVine(ctx, mulberry32(929), 604, 74);
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
    const scene = makeScene('terrace', 'The Marble Terrace', {
      far:  { y: 306, x0: 150, x1: 490 },
      near: { y: 476, x0: -40, x1: 680 }
    });
    scene.exits = [
      { x: 0, y: 340, w: 46, h: 138, side: 'left', target: 'garden', spawn: { x: 560, y: 445 }, label: 'the Hazuri Bagh gardens' }
    ];
    scene.hotspots = [
      { x: 470, y: 292, w: 70, h: 100, label: 'the palace peacock', lines: [
        'The palace peacock. He judges everyone, silently — but kindly.'] },
      { x: 148, y: 388, w: 54, h: 36, label: 'the teapot', pickup: true, item: 'teapot', flag: 'teapotTaken',
        pickupLines: ['The second cup is always for whoever wanders by.', 'Today, that will be Chacha Bagh, the gardener.'] },
      { x: 100, y: 386, w: 124, h: 74, label: 'the tea table', lines: [
        'Two cups. The second is always for whoever happens to wander by.'] },
      { x: 60, y: 150, w: 490, h: 152, label: 'the hall of mirrors', lines: [
        'Five hundred candles inside, and every one of them on its best behavior.'] },
      { x: 42, y: 34, w: 74, h: 60, label: 'the early moon', lines: [
        'Even the moon arrives early, to get the best seat for the sunset.'] },
      { x: 396, y: 320, w: 70, h: 78, label: 'a standing lantern', lines: [
        'It has been lit every evening for two hundred years. Never once late.'] }
    ];
    scene.props = [
      { y: 392, draw: (c, t) => {
        const s = scene.depth(392);
        c.save(); c.translate(430, 392); c.scale(s, s);
        lantern(c, 0, -51, 1.7, t, 'rgba(255,196,110,A)');
        c.restore();
      } },
      { y: 386, draw: (c, t) => {
        // the palace peacock, drawn from its feet at the origin
        const s = scene.depth(386) * 1.75;
        const sway = Math.sin(t * 1.4) * 1.5;
        c.save();
        c.translate(496, 386);
        c.scale(s, s);
        c.fillStyle = '#2a7a9e';
        c.beginPath(); c.ellipse(0, -32, 11, 15, 0.1, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#2a7a9e'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, -22); c.lineTo(0, -4); c.stroke();
        c.strokeStyle = '#8a6a2a'; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(-4, -4); c.lineTo(-4, 0); c.moveTo(4, -4); c.lineTo(4, 0); c.stroke();
        c.fillStyle = '#1e5a78';
        c.beginPath(); c.ellipse(-2, -44, 5, 6.4, -0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e8f4f7';
        c.beginPath(); c.arc(-3.4, -46.2, 1, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f2c14e';
        c.beginPath(); c.moveTo(-8, -42.5); c.lineTo(-11.6, -41.4); c.lineTo(-8, -40.3); c.closePath(); c.fill();
        c.strokeStyle = '#2a7a9e'; c.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) {
          const a = -0.5 + i * 0.45;
          c.beginPath(); c.moveTo(-4, -49); c.lineTo(-4 + Math.sin(a) * 4.5, -53.6 - i * 0.9); c.stroke();
          c.fillStyle = '#3ecfb2';
          c.beginPath(); c.arc(-4 + Math.sin(a) * 4.5, -53.6 - i * 0.9, 0.9, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#1e6a78';
        c.beginPath();
        c.moveTo(5, -37);
        c.quadraticCurveTo(20 + sway, -30, 22 + sway, -12);
        c.quadraticCurveTo(10, -18, 3, -25);
        c.closePath(); c.fill();
        c.fillStyle = '#3ecfb2';
        for (let i = 0; i < 3; i++) {
          c.beginPath(); c.ellipse(12 + i * 3 + sway * 0.5, -30 + i * 5.4, 1.5, 2.3, 0.5, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      } },
      { y: 446, draw: (c, t) => {
        // low tea table + cushion, drawn from the foot of its legs
        const s = scene.depth(446) * 1.34;
        c.save();
        c.translate(170, 446);
        c.scale(s, s);
        c.fillStyle = '#c05a7a';
        rr(c, -42, -6, 28, 11, 5); c.fill();
        c.fillStyle = '#a84866';
        rr(c, -38, -2, 28, 11, 5); c.fill();
        c.fillStyle = '#8a5a33';
        c.beginPath(); c.moveTo(-20, -26); c.lineTo(30, -26); c.lineTo(24, -10); c.lineTo(-14, -10); c.closePath(); c.fill();
        c.fillStyle = '#6b4423'; c.fillRect(-12, -10, 34, 10);
        if (!Game.flags.teapotTaken) {
          c.fillStyle = '#f4efe2';
          c.beginPath(); c.ellipse(-2, -27, 6.4, 2.8, 0, 0, Math.PI * 2); c.fill();
          c.fillRect(-7, -33, 10, 6);
          c.beginPath(); c.ellipse(-4.5, -33, 4, 3, 0, Math.PI, 0); c.fill();
          c.beginPath(); c.ellipse(2.5, -33, 4, 3, 0, Math.PI, 0); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.55)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(-2, -37);
          c.quadraticCurveTo(1 + Math.sin(t * 2) * 2, -42, -2, -47);
          c.stroke();
        }
        c.fillStyle = '#f4efe2';
        c.beginPath(); c.arc(20, -27.5, 2.7, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#c05a7a';
        c.beginPath(); c.arc(20, -27.5, 1.4, 0, Math.PI * 2); c.fill();
        c.restore();
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
      // hall of mirrors along the back; its colonnade meets the floor at 302
      ctx.fillStyle = '#e0d4ba';
      ctx.fillRect(60, 150, 490, 152);
      const wg2 = ctx.createLinearGradient(0, 150, 0, 302);
      wg2.addColorStop(0, '#efe6cf'); wg2.addColorStop(1, '#d9cbaa');
      ctx.fillStyle = wg2;
      ctx.fillRect(60, 156, 490, 146);
      ctx.fillStyle = '#b98a5a';
      ctx.fillRect(60, 180, 490, 5);
      ctx.fillStyle = '#8a5a33';
      for (let bx = 66; bx < 544; bx += 26) ctx.fillRect(bx, 181, 12, 3);
      for (let i = 0; i < 5; i++) {
        const ax = 106 + i * 100;
        ctx.fillStyle = '#b09468';
        cuspedArch(ctx, ax, 300, 64, 122); ctx.fill();
        if (i === 1 || i === 3) {
          const ag = ctx.createLinearGradient(0, 178, 0, 300);
          ag.addColorStop(0, '#f7c87a'); ag.addColorStop(1, '#e89a5a');
          ctx.fillStyle = ag;
          cuspedArch(ctx, ax, 296, 50, 108); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,190,0.9)';
          for (let k = 0; k < 4; k++) {
            ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5 + k + i);
            ctx.beginPath(); ctx.arc(ax - 12 + (k % 2) * 24, 284 - k * 22, 1.8, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = '#6b5138';
          cuspedArch(ctx, ax, 296, 50, 108); ctx.fill();
          ctx.fillStyle = '#4a3a28';
          cuspedArch(ctx, ax, 296, 38, 98); ctx.fill();
        }
      }
      // ---- the marble floor: a receding plane running down to the camera ----
      const HORIZON = 302, VPX = 320;
      const fgd = ctx.createLinearGradient(0, HORIZON, 0, 480);
      fgd.addColorStop(0, '#aaa393'); fgd.addColorStop(0.3, '#cdc6b5');
      fgd.addColorStop(0.7, '#e4ded0'); fgd.addColorStop(1, '#d3ccba');
      ctx.fillStyle = fgd; ctx.fillRect(0, HORIZON, 640, 480 - HORIZON);
      paving(ctx, VPX, HORIZON, [303, 313, 326, 343, 365, 393, 427, 465], 0.09, 0.15);
      // the hall's shadow pooling at the foot of the colonnade
      const hg2 = ctx.createLinearGradient(0, HORIZON, 0, 348);
      hg2.addColorStop(0, 'rgba(64,54,44,0.34)');
      hg2.addColorStop(1, 'rgba(64,54,44,0)');
      ctx.fillStyle = hg2; ctx.fillRect(0, HORIZON, 640, 46);
      // the rose carpet, laid in perspective — the terrace's walking plane
      const RG = ctx.createLinearGradient(0, HORIZON, 0, 480);
      RG.addColorStop(0, '#b8798c'); RG.addColorStop(0.45, '#cf97a6'); RG.addColorStop(1, '#dcaab6');
      ctx.fillStyle = RG;
      ctx.beginPath();
      ctx.moveTo(178, HORIZON + 2); ctx.lineTo(462, HORIZON + 2);
      ctx.lineTo(672, 480); ctx.lineTo(-32, 480);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#9d6377'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(196, HORIZON + 14); ctx.lineTo(444, HORIZON + 14);
      ctx.lineTo(636, 480); ctx.lineTo(4, 480);
      ctx.closePath(); ctx.stroke();
      // rose petals, sized by how near they are
      const rp = mulberry32(404);
      for (let i = 0; i < 34; i++) {
        const py2 = HORIZON + 10 + rp() * 158;
        const t2 = (py2 - HORIZON) / (480 - HORIZON);
        const px2 = 320 + (rp() - 0.5) * (240 + t2 * 620);
        const ps = scene.depth(py2);
        ctx.fillStyle = `rgba(232,160,180,${(0.55 + rp() * 0.4).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(px2, py2, 2.4 * ps, 1.3 * ps, rp() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      exitGlow(ctx, 20, 428, t);
    };
    scene.drawFg = function (ctx, t) {
      // framing: foliage, plus a foreground column cropping the right edge
      fgFoliage(ctx, mulberry32(931), 20, -8, 56);
      fgFoliage(ctx, mulberry32(933), -14, 498, 72);
      const cg2 = ctx.createLinearGradient(596, 0, 640, 0);
      cg2.addColorStop(0, '#8d7f66'); cg2.addColorStop(1, '#6a5f4c');
      ctx.fillStyle = cg2;
      ctx.fillRect(604, 0, 36, 480);
      ctx.fillStyle = 'rgba(40,32,24,0.25)';
      ctx.fillRect(604, 0, 7, 480);
      ctx.fillStyle = '#9c8e74';
      ctx.fillRect(596, 0, 44, 16);
      ctx.fillRect(596, 448, 44, 32);
    };
    return scene;
  })();

  return { list: { gate, garden, terrace }, overlay, get gardenerLoaded() { return GardenerSprites.loaded; } };
})();
