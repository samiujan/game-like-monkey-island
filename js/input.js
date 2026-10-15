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
    const held0 = Inventory.held;

    // The whole left and right edge is a doorway, not just a painted notch —
    // unless the satchel is under the pointer, which keeps its own meaning.
    let overSatchel = false;
    for (const r of (Inventory._rects || [])) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { overSatchel = true; break; }
    }
    if (!overSatchel) {
      const EDGE = 58;
      const side = x <= EDGE ? 'left' : (x >= 640 - EDGE ? 'right' : null);
      if (side) {
        const ex = scene.exits.find((e) => e.side === side);
        if (ex) {
          const label = 'Walk to ' + ex.label;
          return { type: 'exit', label: held0 ? label : label, ref: ex, edge: true };
        }
      }
    }
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

  // walk somewhere sensible: never inside a prop, and round one if need be
  function goTo(x, y, pending, rush) {
    const scene = Game.scene;
    const safe = scene.pushOut(x, y);
    const path = scene.findPath(Game.player.x, Game.player.y, safe.x, safe.y);
    Game.player.walkTo(safe.x, safe.y, pending, path, rush);
  }

  // double-clicking the floor sets him off at a run
  let lastClick = { t: -1e9, x: 0, y: 0 };

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

        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const rush = (now - lastClick.t < 340) && Math.hypot(mx - lastClick.x, my - lastClick.y) < 18;
        lastClick = { t: now, x: mx, y: my };

        const h = pick(mx, my);
        const pw = clampWalk({ x: mx, y: my });
        if (h.type === 'exit') {
          Inventory.letGo();
          Game.held = null;
          const ex = h.ref;
          const edgeX = h.edge ? (ex.side === 'left' ? 6 : 634) : ex.x + ex.w / 2;
          const c = Game.scene.clamp(edgeX, pw.y);
          goTo(c.x, c.y, { type: 'exit', exit: ex }, rush);
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
          goTo(c.x, c.y, pending, rush);
        } else {
          goTo(pw.x, pw.y, null, rush);
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
