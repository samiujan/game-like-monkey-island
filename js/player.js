// The prince: sprite-based rendering from the hand-made model sheet
// (assets/prince/{front,back,walk-0..4}.png). Feet at (x, y); ~112px tall,
// constant size across the horizontal world. No fallback art — the sprites
// are the character; the title screen waits for them to arrive.
const PrinceSprites = {
  img: {},
  walk: [],
  loaded: false,       // pose set
  walkLoaded: false,   // walk cycle frames
  load() {
    const poses = {
      front: 'pose-0', front2: 'pose-1',
      'idle-left': 'pose-3', 'idle-right': 'pose-2',
      'back-idle': 'pose-6', 'back-walk': 'pose-4'
    };
    let left = Object.keys(poses).length;
    for (const [key, file] of Object.entries(poses)) {
      const im = new Image();
      im.onload = () => { if (--left === 0) this.loaded = true; };
      im.src = 'assets/prince/' + file + '.png';
      this.img[key] = im;
    }
    let wleft = 5;
    for (let i = 0; i < 5; i++) {
      const im = new Image();
      im.onload = () => { if (--wleft === 0) this.walkLoaded = true; };
      im.src = 'assets/prince/walk-' + i + '.png';
      this.walk.push(im);
    }
  },
  get ready() { return this.loaded && this.walkLoaded; }
};

// Trying the wrong thing on the wrong thing is half of an adventure game.
let refusalTick = 0;
function refusal(item, target) {
  const lines = [
    `You wave ${item} at ${target}. The fort remains unimpressed.`,
    `${item} and ${target}: not, on reflection, a partnership.`,
    'Nothing happens, except that you look slightly silly.',
    'Two perfectly good things, stubbornly refusing to be a solution.'
  ];
  return lines[refusalTick++ % lines.length];
}

class Player {
  constructor() {
    this.x = 320;
    this.y = 400;
    this.tx = 320;
    this.ty = 400;
    this.facing = 1;      // 1 = right, -1 = left
    this.phase = 0;       // walk-cycle phase
    this.moving = false;
    this.pending = null;  // action fired on arrival: {type:'exit'|'look', ...}
  }

  scaleAt(scene, y) {
    return scene.depth(y); // perspective: far up the floor = smaller
  }

  update(dt, scene) {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) {
      this.x = this.tx;
      this.y = this.ty;
      this.moving = false;
      const p = this.pending;
      this.pending = null;
      if (p) this.fire(p);
      return;
    }
    this.moving = true;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;

    const speed = 95 * this.scaleAt(scene, this.y);
    const step = speed * dt;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    // keep him on the trapezoid, not merely inside a rectangle
    const c = scene.clamp(this.x, this.y);
    this.x = c.x; this.y = c.y;
    this.phase += step * 0.105;
  }

  walkTo(x, y, pending) {
    this.tx = x;
    this.ty = y;
    this.pending = pending || null;
    if (!this.moving && Math.hypot(this.tx - this.x, this.ty - this.y) < 1.5) {
      const p = this.pending;
      this.pending = null;
      if (p) this.fire(p);
    }
  }

  fire(p) {
    if (p.type === 'exit') {
      Game.transitionTo(p.exit.target, p.exit.spawn);
    } else if (p.type === 'look') {
      const hs = p.hs;
      const cx = hs.x + hs.w / 2;
      if (Math.abs(cx - this.x) > 6) this.facing = cx > this.x ? 1 : -1;
      Speech.say(hs.lines, 'Prince');
    } else if (p.type === 'pickup') {
      const sc = Game.scene;
      const idx = sc.hotspots.indexOf(p.hs);
      if (idx >= 0) sc.hotspots.splice(idx, 1);
      Game.flags[p.hs.flag] = true;
      Inventory.add(p.hs.item);
      const cx = p.hs.x + p.hs.w / 2;
      if (Math.abs(cx - this.x) > 6) this.facing = cx > this.x ? 1 : -1;
      Speech.say(p.hs.pickupLines, 'Prince');
    } else if (p.type === 'talk') {
      const cx = p.hs.x + p.hs.w / 2;
      if (Math.abs(cx - this.x) > 6) this.facing = cx > this.x ? 1 : -1;
      Dialogue.open(p.hs.npc);
    } else if (p.type === 'use') {
      const hs = p.hs;
      const cx = hs.x + hs.w / 2;
      if (Math.abs(cx - this.x) > 6) this.facing = cx > this.x ? 1 : -1;
      const entry = (hs.useOn || {})[p.item];
      Inventory.letGo();
      Game.held = null;
      if (entry) {
        if (entry.lines) Speech.say(entry.lines, 'Prince');
        if (entry.action) entry.action();
      } else {
        const item = Inventory.items[p.item].label;
        Speech.say([refusal(item, hs.label)], 'Prince');
      }
    }
  }

  headPos(scene) {
    return { x: this.x, y: this.y - 104 * this.scaleAt(scene, this.y) };
  }

  draw(ctx, scene, t) {
    if (!PrinceSprites.ready) return; // sprites still loading
    const s = this.scaleAt(scene, this.y);
    ctx.save();
    ctx.translate(this.x, this.y);

    // soft shadow — shrinks with him as he walks away
    ctx.fillStyle = 'rgba(60,30,10,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 20 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (this.moving) {
      // walk cycle frames (art faces right natively — mirror for left)
      const order = [0, 1, 2, 3, 4];
      const img = PrinceSprites.walk[order[Math.floor(this.phase * 0.9) % order.length]];
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.translate(0, -Math.abs(Math.sin(this.phase)) * 1.2);
      const k = (TARGET_H * s) / img.height;
      ctx.drawImage(img, -(img.width * k) / 2, -TARGET_H * s, img.width * k, TARGET_H * s);
    } else {
      // idle: profile matching the last direction; now and then he
      // turns and looks at you instead
      const cycle = t % 9;
      const key = cycle < 6.5 ? (this.facing < 0 ? 'idle-left' : 'idle-right')
        : (cycle < 7.8 ? 'front' : 'front2');
      const img = PrinceSprites.img[key];
      const k = (TARGET_H * s) / img.height;
      const breathe = 1 + Math.sin(t * 1.6) * 0.006;
      ctx.translate(0, Math.sin(t * 1.6) * 0.5);
      ctx.scale(1, breathe);
      ctx.drawImage(img, -(img.width * k) / 2, -TARGET_H * s, img.width * k, TARGET_H * s);
    }
    ctx.restore();
    ctx.restore();
  }
}

// Height of the prince at depth scale 1. Monkey Island proportions: roughly a
// third of the 480px frame.
const TARGET_H = 150;
