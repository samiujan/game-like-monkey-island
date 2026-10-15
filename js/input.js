// Mouse + keyboard: maps screen pixels to the 640x480 logical space,
// decides what the cursor is over, and turns clicks into walk orders.
const Input = (() => {
  let mx = 320, my = 240;
  let inside = false;
  let hover = { type: 'none', label: '', ref: null };

  function toLogical(e) {
    const r = cvs.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * 640 / r.width,
      y: (e.clientY - r.top) * 480 / r.height
    };
  }

  function pick(x, y) {
    const scene = Game.scene;
    if (!scene) return { type: 'none', label: '', ref: null };
    for (const ex of scene.exits) {
      if (x >= ex.x && x <= ex.x + ex.w && y >= ex.y && y <= ex.y + ex.h)
        return { type: 'exit', label: 'Walk to ' + ex.label, ref: ex };
    }
    const held = Inventory.held;
    for (const hs of scene.hotspots) {
      if (hs.if && !hs.if()) continue;   // not there yet (or already gone)
      if (x >= hs.x && x <= hs.x + hs.w && y >= hs.y && y <= hs.y + hs.h) {
        // holding something turns every hotspot into a use-target
        if (held) {
          return { type: 'hotspot', label: 'Use ' + Inventory.items[held].label + ' on ' + hs.label, ref: hs };
        }
        let verb = 'Look at ';
        if (hs.talk) verb = 'Talk to ';
        else if (hs.pickup) verb = 'Pick up ';
        return { type: 'hotspot', label: verb + hs.label, ref: hs };
      }
    }
    return { type: 'walk', label: '', ref: null };
  }

  function clampWalk(p) {
    return Game.scene.clamp(p.x, p.y);
  }

  function segHitsRect(ax, ay, bx, by, r) {
    const steps = 40;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (x > r.x0 - 2 && x < r.x1 + 2 && y > r.y0 - 2 && y < r.y1 + 2) return true;
    }
    return false;
  }

  // If the straight line to the target crosses something solid, go round it in
  // an L: step out sideways at the current depth, then along at the target's
  // depth. Candidate sides are tried in order of preference (the side the
  // target is on first) and the first one whose every leg is clear wins —
  // otherwise the "detour" crosses the very prop it is avoiding.
  function routeTo(ax, ay, bx, by) {
    const scene = Game.scene;
    const pad = 14;
    for (const r of (scene.blocked || [])) {
      if (!segHitsRect(ax, ay, bx, by, r)) continue;
      const cands = [];
      if (bx > r.x1) cands.push(r.x1 + pad);
      if (bx < r.x0) cands.push(r.x0 - pad);
      cands.push(r.x0 - pad, r.x1 + pad);
      const fit = (pts) => {
        let from = { x: ax, y: ay };
        for (const p of pts) {
          if (segHitsRect(from.x, from.y, p.x, p.y, r)) return false;
          from = p;
        }
        return !segHitsRect(from.x, from.y, bx, by, r);
      };
      const clean = (pts) => pts.map((p) => {
        const c = scene.clamp(p.x, p.y);
        return scene.pushOut(c.x, c.y);
      });
      for (const gx of cands) {
        const pts = [{ x: gx, y: ay }, { x: gx, y: by }];
        if (fit(pts)) return clean(pts);
      }
      const gx = bx >= (r.x0 + r.x1) / 2 ? r.x1 + pad : r.x0 - pad;
      return clean([{ x: gx, y: ay }, { x: gx, y: by }]);
    }
    return [];
  }

  // walk somewhere sensible: never inside a prop, around one if need be
  function goTo(x, y, pending) {
    const scene = Game.scene;
    const safe = scene.pushOut(x, y);
    const via = routeTo(Game.player.x, Game.player.y, safe.x, safe.y);
    Game.player.walkTo(safe.x, safe.y, pending, via);
  }

  return {
    get mx() { return mx; },
    get my() { return my; },
    get hover() { return hover; },
    get inside() { return inside; },
    init() {
      cvs.addEventListener('mousemove', (e) => {
        const p = toLogical(e);
        mx = p.x; my = p.y;
        inside = true;
        if (Game.state === 'play' && Game.scene) hover = pick(mx, my);
        else hover = { type: 'none', label: '', ref: null };
      });
      cvs.addEventListener('mouseleave', () => { inside = false; });
      cvs.addEventListener('click', (e) => {
        const p = toLogical(e);
        mx = p.x; my = p.y; inside = true;
        if (Game.state === 'title') { if (PrinceSprites.ready) Game.start(); return; }
        if (Game.state !== 'play' || !Game.scene) return;

        // conversation options swallow clicks
        if (Dialogue.active) { Dialogue.clickAt(mx, my); return; }

        // satchel items: click to pick the item up (or put it back down)
        for (const r of (Inventory._rects || [])) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            const id = r.id;
            Speech.clear();
            if (Inventory.held === id) {
              Inventory.letGo();
              Speech.say(['(You put it away.)'], 'Prince');
            } else {
              Inventory.hold(id);
              Speech.say([Inventory.items[id].look], 'Prince');
            }
            Game.held = Inventory.held;
            refreshHover();
            return;
          }
        }

        if (Game.fade) return;

        const h = pick(mx, my);
        const pw = clampWalk({ x: mx, y: my });
        if (h.type === 'exit') {
          Inventory.letGo();
          Game.held = null;
          const ex = h.ref;
          const c = Game.scene.clamp(ex.x + ex.w / 2, pw.y);
          goTo(c.x, c.y, { type: 'exit', exit: ex });
        } else if (h.type === 'hotspot') {
          const hs = h.ref;
          let pending = { type: 'look', hs };
          let tx = hs.x + hs.w / 2;
          if (Inventory.held) {
            pending = { type: 'use', hs, item: Inventory.held };
            const side = Game.player.x < tx ? -1 : 1;
            tx += side * 52;
          } else if (hs.talk) {
            pending = { type: 'talk', hs };
            // stand beside the character, never on top of them
            const side = Game.player.x < tx ? -1 : 1;
            tx += side * 58;
          } else if (hs.pickup) pending = { type: 'pickup', hs };
          const c = Game.scene.clamp(tx, pw.y);
          goTo(c.x, c.y, pending);
        } else {
          goTo(pw.x, pw.y, null);
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'm' || e.key === 'M') {
          Music.toggle();
          if (window.refreshMusicUI) window.refreshMusicUI();
          return;
        }
        if (Dialogue.active) {
          if (e.key === 'Escape') Dialogue.close();
          else {
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= 9) Dialogue.key(n);
          }
          return;
        }
        if (e.key === 'Escape' && Inventory.held) {
          Inventory.letGo();
          Game.held = null;
          refreshHover();
        }
      });
    },
    refreshHover() {
      if (Game.state === 'play' && Game.scene) hover = pick(mx, my);
      else hover = { type: 'none', label: '', ref: null };
    }
  };
})();
