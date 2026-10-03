// Boot, title screen, game loop, scene transitions, UI polish.
const W = 640, H = 480;
let cvs, ctx;

const Game = {
  state: 'title',   // 'title' | 'play'
  scene: null,
  sceneId: null,
  player: null,
  fade: null,       // {t, dur, done, cb}
  toast: null,      // {text, t}
  t: 0,
  flags: {},        // quest + world state

  start() {
    Music.start();
    this.state = 'play';
    this.enterScene('gate', { x: 320, y: 432 });
  },

  enterScene(id, spawn) {
    this.sceneId = id;
    this.scene = Scenes.list[id];
    const p = this.player;
    p.x = p.tx = spawn.x;
    p.y = p.ty = spawn.y;
    p.moving = false;
    p.pending = null;
    p.facing = spawn.x < 320 ? 1 : -1;
    Speech.clear();
    // refresh hover so the status line matches the new scene immediately
    Input.refreshHover();
    Music.sceneChanged(id);
    this.toast = { text: this.scene.name, t: 0 };
  },

  transitionTo(id, spawn) {
    if (this.fade) return;
    this.fade = { t: 0, dur: 0.85, done: false, cb: () => this.enterScene(id, spawn) };
  }
};

function drawTitle(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, 480);
  g.addColorStop(0, '#f7d9a0'); g.addColorStop(0.55, '#f2b57c'); g.addColorStop(1, '#e8b088');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // sun + drifting birds
  const sg = ctx.createRadialGradient(320, 190, 10, 320, 190, 170);
  sg.addColorStop(0, 'rgba(255,244,210,0.9)'); sg.addColorStop(1, 'rgba(255,244,210,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(320, 190, 170, 0, Math.PI * 2); ctx.fill();

  // fort skyline: crenellated wall, domes, a kiosk
  ctx.fillStyle = 'rgba(140,84,52,0.85)';
  ctx.beginPath();
  ctx.moveTo(40, 330);
  ctx.lineTo(70, 268); ctx.lineTo(96, 268);            // left tower
  ctx.lineTo(96, 240);
  ctx.quadraticCurveTo(118, 214, 140, 240);            // kiosk dome
  ctx.lineTo(140, 268);
  ctx.lineTo(236, 268);
  ctx.lineTo(236, 232);
  ctx.quadraticCurveTo(260, 196, 284, 232);            // big dome
  ctx.lineTo(284, 268);
  ctx.lineTo(356, 268);
  ctx.lineTo(356, 240);
  ctx.quadraticCurveTo(380, 204, 404, 240);            // second dome
  ctx.lineTo(404, 268);
  ctx.lineTo(500, 268); ctx.lineTo(500, 240);
  ctx.quadraticCurveTo(522, 214, 544, 240);            // right kiosk
  ctx.lineTo(544, 268); ctx.lineTo(570, 268);          // right tower
  ctx.lineTo(600, 330);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8a4a28';
  ctx.fillRect(0, 326, W, 154);
  ctx.fillStyle = 'rgba(60,30,15,0.35)';
  ctx.fillRect(0, 326, W, 8);

  // the prince, waiting on the title
  Game.player.x = 320; Game.player.y = 420; Game.player.facing = 1;
  Game.player.draw(ctx, Scenes.list.gate, t);

  Scenes.overlay(ctx);

  // title text
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(50,25,10,0.35)';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('Prince of Lahore', 322, 82);
  ctx.fillStyle = '#f9efdc';
  ctx.strokeStyle = 'rgba(90,45,15,0.8)';
  ctx.lineWidth = 2;
  ctx.fillText('Prince of Lahore', 320, 80);
  ctx.strokeText('Prince of Lahore', 320, 80);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#5c3a1e';
  ctx.fillText('a small, comfortable adventure in the Lahore Fort', 320, 104);

  const a = 0.55 + 0.45 * Math.sin(t * 2.4);
  ctx.globalAlpha = a;
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#f9efdc';
  ctx.fillText(PrinceSprites.ready ? '— click anywhere to begin —' : 'loading the fort…', 320, 452);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawCursor() {
  const h = Input.hover;
  const x = Input.mx, y = Input.my;
  ctx.save();
  if (h.type === 'hotspot') {
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 1.6;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * 3, y + dy * 3);
      ctx.lineTo(x + dx * 7, y + dy * 7);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (h.type === 'exit') {
    const dir = h.ref.side === 'left' ? -1 : 1;
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(x + 6 * dir, y);
    ctx.lineTo(x - 4 * dir, y - 6);
    ctx.lineTo(x - 4 * dir, y + 6);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(249,239,220,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(249,239,220,0.9)';
    ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawStatusLine() {
  const h = Input.hover;
  if (h.type === 'none' || !h.label || Speech.active) return;
  ctx.font = '12px Georgia, serif';
  const tw = ctx.measureText(h.label).width;
  const bw = tw + 22;
  const bx = 10, by = H - 30;
  ctx.fillStyle = 'rgba(38,22,10,0.72)';
  rr(ctx, bx, by, bw, 22, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,217,176,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f2e4c2';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(h.label, bx + 11, by + 12);
  ctx.textBaseline = 'alphabetic';
}

function drawToast() {
  const toast = Game.toast;
  if (!toast) return;
  toast.t += 0; // advanced in update()
  const t = toast.t;
  const a = Math.min(1, t / 0.5) * Math.min(1, Math.max(0, (3.4 - t) / 0.6));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = 'italic 15px Georgia, serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(toast.text).width;
  ctx.fillStyle = 'rgba(38,22,10,0.66)';
  rr(ctx, 320 - tw / 2 - 14, 16, tw + 28, 28, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,217,176,0.55)';
  ctx.stroke();
  ctx.fillStyle = '#f7ecd2';
  ctx.fillText(toast.text, 320, 35);
  ctx.restore();
  ctx.textAlign = 'left';
}

function update(dt) {
  Game.t += dt;
  if (Game.state !== 'play') return;
  if (Game.fade) {
    const f = Game.fade;
    f.t += dt;
    if (!f.done && f.t >= f.dur / 2) { f.done = true; f.cb(); }
    if (f.t >= f.dur) Game.fade = null;
  } else {
    Game.player.update(dt, Game.scene);
  }
  Speech.update(dt);
  if (Game.toast) {
    Game.toast.t += dt;
    if (Game.toast.t > 4.2) Game.toast = null;
  }
}

function drawInventory() {
  const bag = Inventory.list;
  Inventory._rects = [];
  for (let i = 0; i < bag.length; i++) {
    const w = 48, h = 42;
    const x = W - 14 - w - i * (w + 8);
    const y = H - h - 10;
    const hov = Input.mx >= x && Input.mx <= x + w && Input.my >= y && Input.my <= y + h;
    ctx.fillStyle = hov ? 'rgba(70,44,20,0.85)' : 'rgba(38,22,10,0.72)';
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = hov ? '#f2c14e' : 'rgba(232,217,176,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    Inventory.items[bag[i]].icon(ctx, x + w / 2, y + h / 2);
    Inventory._rects.push({ x, y, w, h, id: bag[i] });
  }
}

function drawPlay() {
  const scene = Game.scene;
  scene.drawBg(ctx, Game.t);
  // depth-sort props against the player
  const py = Game.player.y;
  for (const p of scene.props) if (p.y <= py) p.draw(ctx, Game.t);
  Game.player.draw(ctx, scene, Game.t);
  for (const p of scene.props) if (p.y > py) p.draw(ctx, Game.t);
  if (scene.drawFg) scene.drawFg(ctx, Game.t);

  Scenes.overlay(ctx);
  Speech.draw(ctx);
  if (!Dialogue.active && !Speech.active) drawStatusLine();
  drawToast();
  drawInventory();
  Dialogue.draw(ctx);
  if (!Game.fade && Input.inside) drawCursor();

  if (Game.fade) {
    const f = Game.fade;
    const half = f.dur / 2;
    const a = f.t < half ? f.t / half : 1 - (f.t - half) / half;
    ctx.fillStyle = `rgba(12,7,4,${(a * a).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function loop(ts) {
  if (!Number.isFinite(ts)) ts = performance.now();
  if (!Number.isFinite(loop.last)) loop.last = ts;
  const dt = Math.min(0.05, Math.max(0, (ts - loop.last) / 1000));
  loop.last = ts;
  update(dt);
  if (Game.state === 'title') drawTitle(ctx, Game.t);
  else drawPlay();
  requestAnimationFrame(loop);
}

function setupMusicUI() {
  const toggleBtn = document.getElementById('music-toggle');
  const currentBtn = document.getElementById('music-current');
  const menu = document.getElementById('music-menu');

  function refresh() {
    const s = Music.status();
    toggleBtn.innerHTML = '&#9834; ' + (s.muted ? 'off' : 'on');
    const t = Music.TRACKS.find(t => t.id === s.pref);
    currentBtn.innerHTML = (s.pref === 'auto' ? 'Auto' : t.label) + ' &#9662;';
    menu.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.track === s.pref));
  }
  window.refreshMusicUI = refresh;

  Music.TRACKS.forEach(t => {
    const b = document.createElement('button');
    b.textContent = t.label;
    b.dataset.track = t.id;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      Music.setPref(t.id);
      menu.classList.remove('open');
      refresh();
    });
    menu.appendChild(b);
  });

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Music.toggle();
    refresh();
  });
  currentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));
  refresh();
}

window.addEventListener('load', () => {
  cvs = document.getElementById('game');
  ctx = cvs.getContext('2d');
  Game.player = new Player();
  Input.init();
  PrinceSprites.load();
  GardenerSprites.load();
  setupMusicUI();
  requestAnimationFrame(loop);
});
