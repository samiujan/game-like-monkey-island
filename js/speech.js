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
  let queue = [];
  let current = null; // {speaker, text, t, dur}

  const FONT = '12px Georgia, serif';
  const LH = 16, PAD_X = 12, BAR_MARGIN = 8;

  function barGeometry(ctx, speaker, text) {
    ctx.font = FONT;
    const headW = speaker ? ctx.measureText(speaker + ':  ').width : 0;
    const maxW = W - BAR_MARGIN * 2 - PAD_X * 2;
    const firstMax = maxW - headW;
    // word-wrap: line 1 leaves room for the speaker head, rest use full width
    const words = text.split(' ');
    const lines = [];
    let cur = '', isFirst = true;
    for (const w of words) {
      const limit = isFirst ? firstMax : maxW;
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > limit && cur) {
        lines.push(cur);
        cur = w;
        isFirst = false;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    const bh = lines.length * LH + 12;
    return { lines, headW, bh, by: H - bh - BAR_MARGIN };
  }

  return {
    say(lines, speaker) {
      if (!lines || !lines.length) return;
      queue = lines.map(l => ({ text: l, speaker: speaker || 'Prince' }));
      if (!current) this.next();
    },
    next() {
      const item = queue.shift();
      if (!item) { current = null; return; }
      current = { speaker: item.speaker, text: item.text, t: 0, dur: 1.7 + item.text.length * 0.05 };
    },
    clear() { queue = []; current = null; },
    get active() { return !!current; },
    update(dt) {
      if (!current) return;
      current.t += dt;
      if (current.t >= current.dur) this.next();
    },
    draw(ctx) {
      if (!current) return;
      const c = current;
      const inA = Math.min(1, c.t / 0.15);
      const outA = Math.min(1, Math.max(0, (c.dur - c.t) / 0.25));
      const alpha = Math.min(inA, outA);

      ctx.save();
      ctx.font = FONT;
      const { lines, headW, bh, by } = barGeometry(ctx, c.speaker, c.text);

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
