// shared rounded-rect path helper (used by UI across files)
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Speech: bottom-bar dialogue in the classic adventure style.
// Lines render as "Speaker: what they say" on a translucent strip along the
// bottom edge, so nothing in the scene is ever covered.
const Speech = (() => {
  let current = null;  // {speaker, lines, t, dur}
  let top = 0;         // y of the bar's top edge, for whatever stacks above it

  // The satchel lives in the bottom-right corner, so the bar has to stop short
  // of it or the two draw over each other.
  function barWidth() {
    const n = (typeof Inventory !== 'undefined' && Inventory.list) ? Inventory.list.length : 0;
    const bagLeft = n ? (W - 14 - 48 - (n - 1) * 56) - 8 : W;
    return Math.min(W - BAR_MARGIN * 2, bagLeft - BAR_MARGIN) - PAD_X * 2;
  }

  const FONT = '12px Georgia, serif';
  const LH = 16, PAD_X = 12, BAR_MARGIN = 8;

  // An entire sequence is laid out in one bar and read at once, rather than
  // revealed a line at a time — the speaker head only indents the very first
  // output line, everything after it uses the full width.
  function barGeometry(ctx, speaker, lines) {
    ctx.font = FONT;
    const headW = speaker ? ctx.measureText(speaker + ':  ').width : 0;
    const maxW = barWidth();
    const out = [];
    lines.forEach((text, li) => {
      const firstMax = li === 0 ? maxW - headW : maxW;
      const words = String(text).split(' ');
      let cur = '', isFirst = true;
      for (const w of words) {
        const limit = isFirst ? firstMax : maxW;
        const test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test).width > limit && cur) {
          out.push(cur);
          cur = w;
          isFirst = false;
        } else {
          cur = test;
        }
      }
      if (cur) out.push(cur);
    });
    const bh = out.length * LH + 12;
    return { lines: out, headW, bh, by: H - bh - BAR_MARGIN };
  }

  return {
    say(lines, speaker) {
      if (!lines || !lines.length) return;
      const all = (Array.isArray(lines) ? lines : [lines]).slice();
      const chars = all.reduce((n, l) => n + String(l).length, 0);
      current = { speaker: speaker || 'Prince', lines: all, t: 0, dur: 2.2 + chars * 0.045 };
    },
    clear() { current = null; top = 0; },
    // kept for callers that used to advance the queue
    next() { current = null; },
    // what is on screen right now (used by the tests, handy when debugging)
    get lines() { return current ? current.lines : []; },
    // where the bar's top edge sits, so the dialogue options can sit above it.
    // Falls back to the bottom margin until the bar has been laid out once.
    get top() { return (current && top) ? top : H - BAR_MARGIN; },
    get height() { return current ? (H - BAR_MARGIN - top) : 0; },
    get active() { return !!current; },
    update(dt) {
      if (!current) return;
      current.t += dt;
      if (current.t >= current.dur) current = null;
    },
    draw(ctx) {
      if (!current) return;
      const c = current;
      const inA = Math.min(1, c.t / 0.15);
      const outA = Math.min(1, Math.max(0, (c.dur - c.t) / 0.25));
      const alpha = Math.min(inA, outA);

      ctx.save();
      ctx.font = FONT;
      const { lines, headW, bh, by } = barGeometry(ctx, c.speaker, c.lines);
      top = by;

      // translucent bar
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = 'rgba(24,14,8,0.9)';
      rr(ctx, BAR_MARGIN, by, W - BAR_MARGIN * 2, bh, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,217,176,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // text
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const head = c.speaker ? c.speaker + ':' : '';
      lines.forEach((l, i) => {
        const y = by + 6 + i * LH + LH / 2;
        let x = BAR_MARGIN + PAD_X;
        if (i === 0 && head) {
          ctx.fillStyle = '#f2c14e';
          ctx.fillText(head, x, y);
          x += headW;
        }
        ctx.fillStyle = '#f2e4c2';
        ctx.fillText(l, x, y);
      });
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  };
})();
