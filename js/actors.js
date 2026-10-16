// Painted characters: their sprite sets, their idle life, and the ones that
// wander. An actor owns a position, a facing, a walk cycle and a home patch to
// roam; the hotspot and the depth-sorted prop that stand for it are dragged
// along. No pathfinding is needed because each home patch is chosen to be clear
// of props, so every hop is a straight line.
//
// Loaded before scenes.js, which builds the actual actors.

const ActorSprites = {
  gardener: { idle: [], walk: [], loaded: false },
  cook: { idle: [], walk: [], loaded: false },
  monkey: { idle: [], walk: [], loaded: false },
  peacock: { side: [], display: [], walk: [], loaded: false },

  load() {
    const load = (dir, names, into, done) => {
      let left = names.length;
      names.forEach((n, i) => {
        const im = new Image();
        im.onload = () => { into[i] = im; if (--left === 0 && done) done(); };
        im.src = 'assets/' + dir + '/' + n + '.png';
      });
    };
    const seq = (base, n) => Array.from({ length: n }, (_, i) => base + '-' + i);

    load('gardener', ['g-pose-0', 'g-pose-1', 'g-pose-2'], this.gardener.idle,
      () => { this.gardener.loaded = true; });
    load('gardener', seq('g-walk', 16), this.gardener.walk, null);

    load('cook', ['cook-idle', 'cook-idle-1', 'cook-idle-2'], this.cook.idle,
      () => { this.cook.loaded = true; });
    load('cook', seq('cook-walk', 16), this.cook.walk, null);

    load('monkey', ['monkey-0', 'monkey-0b', 'monkey-1', 'monkey-1b', 'monkey-2', 'monkey-2b'],
      this.monkey.idle, () => { this.monkey.loaded = true; });
    load('monkey', seq('monkey-walk', 5), this.monkey.walk, null);

    load('peacock', ['peacock-side', 'peacock-side-2'], this.peacock.side, null);
    load('peacock', ['peacock-display', 'peacock-display-2'], this.peacock.display, null);
    load('peacock', seq('peacock-walk', 5), this.peacock.walk,
      () => { this.peacock.loaded = true; });
  },

  // the tallest frame of a character, so its idle and walk poses share one
  // scale and it does not change size when it sets off
  refHeight(kind) {
    let m = 0;
    const sp = this[kind];
    for (const g of [sp.idle, sp.side, sp.walk, sp.display]) {
      if (!g) continue;
      for (const im of g) if (im && im.height > m) m = im.height;
    }
    return m;
  },

  idleSet(kind) {
    const sp = this[kind];
    return kind === 'peacock' ? (Game.flags.peacockVain ? sp.display : sp.side) : sp.idle;
  }
};

const Actors = (() => {
  // on-screen height at depth scale 1, plus each character's idle rhythm
  // `face` is which way the WALK art looks natively (+1 right, -1 left), and
  // `mirrorIdle` whether the resting poses should flip with it — front-facing
  // idle art should not, or the character's gesture swaps hands.
  const KIND = {
    gardener: { h: 134, hold: 6.0, fade: 0.35, bob: 0.5, shadow: 22, face: -1, mirrorIdle: false },
    monkey: { h: 92, hold: 4.5, fade: 0.30, bob: 1.0, shadow: 15, face: 1, mirrorIdle: false },
    peacock: { h: 92, hold: 5.0, fade: 0.45, bob: 0.5, shadow: 40, face: 1, mirrorIdle: true }
  };

  const list = [];

  const add = (kind, o) => {
    const a = {
      kind,
      cfg: KIND[kind],
      scene: o.scene,
      x: o.x, y: o.y,
      home: o.home,
      speed: o.speed || 28,
      seed: o.seed || 0,
      variant: o.variant || 0,
      facing: o.facing === undefined ? -1 : o.facing,
      state: 'wait',
      timer: o.wait === undefined ? 1 + (o.seed || 0) : o.wait,
      tx: o.x, ty: o.y,
      phase: 0,
      hold: o.hold || KIND[kind].hold,
      hot: null,
      prop: null
    };
    list.push(a);
    return a;
  };

  const attach = (a, hot, prop) => {
    a.hot = hot;
    a.prop = prop;
    if (hot) hot.actor = a;
    // place the hotspot now rather than waiting for the first update, or it
    // spends a frame sitting at the origin in the corner of the scene
    sync(a);
    return a;
  };

  const sync = (a) => {
    if (a.hot) {
      a.hot.x = a.x - a.hot.w / 2;
      a.hot.y = a.y + 2 - a.hot.h;
    }
    if (a.prop) a.prop.y = a.y;
  };

  const pick = (a) => {
    for (let i = 0; i < 6; i++) {
      const x = a.home.x0 + Math.random() * (a.home.x1 - a.home.x0);
      const y = a.home.y0 + Math.random() * (a.home.y1 - a.home.y0);
      if (Math.hypot(x - a.x, y - a.y) < 16) continue;
      a.tx = x; a.ty = y; a.state = 'walk';
      return;
    }
    a.timer = 2;
  };

  // ---- the idle blender, shared with the characters that never move --------
  // Hold a pose for a long beat, then dissolve to the next in a fraction of a
  // second. Derived from the clock, so there is no animation state to keep.
  function idleBlend(t, n, hold, fade, seed) {
    if (n < 2) return { from: 0, to: 0, mix: 0 };
    const cycle = hold + fade;
    const tt = (t + seed * 2.3) % (cycle * n);
    const i = Math.floor(tt / cycle);
    const local = tt - i * cycle;
    return { from: i % n, to: (i + 1) % n, mix: local < hold ? 0 : (local - hold) / fade };
  }

  function drawIdle(ctx, frames, x, baseY, k, t, seed, hold, fade, bobAmt, facing) {
    if (!frames[0]) return;
    const b = idleBlend(t, frames.length, hold, fade, seed);
    const dy = Math.sin(t * 1.15 + seed) * bobAmt;
    ctx.save();
    ctx.translate(x, baseY + dy);
    if (facing !== undefined && facing < 0) ctx.scale(-1, 1);
    for (let i = 0; i < frames.length; i++) {
      const a = i === b.from ? 1 - b.mix : (i === b.to ? b.mix : 0);
      if (a <= 0.004 || !frames[i]) continue;
      const im = frames[i];
      const w = im.width * k, h = im.height * k;
      ctx.globalAlpha = a;
      ctx.drawImage(im, -w / 2, -h, w, h);
    }
    ctx.restore();
  }

  return {
    list,
    add,
    attach,
    idleBlend,
    drawIdle,

    update(dt, scene) {
      for (const a of list) {
        if (a.scene !== scene.id) continue;
        if (a.state === 'wait') {
          a.timer -= dt;
          if (a.timer <= 0) pick(a);
        } else {
          const dx = a.tx - a.x, dy = a.ty - a.y;
          const d = Math.hypot(dx, dy);
          if (d < 1.6) {
            a.x = a.tx; a.y = a.ty;
            a.state = 'wait';
            a.timer = 2 + Math.random() * 5;
            a.phase = 0;
          } else {
            if (Math.abs(dx) > 1) a.facing = dx > 0 ? 1 : -1;
            const step = a.speed * scene.depth(a.y) * dt;
            a.x += (dx / d) * step;
            a.y += (dy / d) * step;
            a.phase += step * 0.10;
          }
        }
        sync(a);
      }
    },

    // stand still for a while — called when the player clicks on someone, so
    // they are not halfway across the lawn by the time he arrives
    hold(a, secs) {
      a.state = 'wait';
      a.timer = Math.max(a.timer, secs);
    },

    draw(ctx, a, scene, t) {
      const sp = ActorSprites[a.kind];
      const k = (a.cfg.h * scene.depth(a.y)) / ActorSprites.refHeight(a.kind);
      if (!k) return;
      const s = scene.depth(a.y);

      ctx.save();
      ctx.fillStyle = 'rgba(40,28,12,0.20)';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 1, a.cfg.shadow * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const facing = a.facing * (a.cfg.face || 1);   // <0 means mirror
      const walk = sp.walk;
      if (a.state === 'walk' && walk && walk.length && walk[0]) {
        const img = walk[Math.floor(a.phase) % walk.length];
        if (!img) return;
        const w = img.width * k, h = img.height * k;
        ctx.save();
        ctx.translate(a.x, a.y - Math.abs(Math.sin(a.phase * Math.PI)) * 1.1 * s);
        if (facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, -h, w, h);
        ctx.restore();
        return;
      }
      let set = ActorSprites.idleSet(a.kind);
      // a monkey's variant picks its own pair out of the pooled idle frames
      if (a.kind === 'monkey' && a.variant) set = set.slice(a.variant * 2, a.variant * 2 + 2);
      drawIdle(ctx, set, a.x, a.y, k, t,
        a.seed, a.hold, a.cfg.fade, a.cfg.bob, a.cfg.mirrorIdle ? facing : 1);
    }
  };
})();
