// Inventory (a small royal satchel) and dialogue trees. The quest is small
// and gentle: the old gardener of Hazuri Bagh longs for cardamom tea, and the
// teapot of the marble terrace never runs dry.
const Inventory = (() => {
  const items = {
    teapot: {
      label: 'the teapot',
      look: 'Warm, polished, and always ready for a second cup.',
      icon(ctx, x, y) {
        ctx.fillStyle = '#f4efe2';
        ctx.strokeStyle = '#8a5a33';
        ctx.lineWidth = 1;
        // spout
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 2); ctx.lineTo(x - 15, y - 4); ctx.lineTo(x - 7, y - 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // body
        ctx.beginPath(); ctx.ellipse(x - 1, y + 2, 9, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // lid
        ctx.beginPath(); ctx.arc(x - 1, y - 4, 4.5, Math.PI, 0); ctx.fill(); ctx.stroke();
        // knob
        ctx.fillStyle = '#d4a017';
        ctx.beginPath(); ctx.arc(x - 1, y - 9, 1.4, 0, Math.PI * 2); ctx.fill();
        // handle
        ctx.strokeStyle = '#8a5a33';
        ctx.beginPath(); ctx.arc(x + 9, y + 1, 4.5, -1.2, 1.2); ctx.stroke();
      }
    },
    mango: {
      label: 'a mango',
      look: 'Golden, fragrant, and officially sanctioned by the fort monkeys.',
      icon(ctx, x, y) {
        ctx.fillStyle = '#f2a03d';
        ctx.beginPath(); ctx.ellipse(x, y + 1, 7, 9, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(247,233,176,0.8)';
        ctx.beginPath(); ctx.ellipse(x - 2.5, y - 2.5, 2.5, 4, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4e8f4a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + 1, y - 7); ctx.quadraticCurveTo(x + 5, y - 11, x + 8, y - 10);
        ctx.stroke();
      }
    }
  };

  let bag = [];
  return {
    items,
    has: (id) => bag.indexOf(id) >= 0,
    add: (id) => { if (bag.indexOf(id) < 0) bag.push(id); },
    remove: (id) => { bag = bag.filter((b) => b !== id); },
    get list() { return bag; },
    _rects: []
  };
})();

const Dialogue = (() => {
  let active = false;
  let cur = null;   // current node: {say, options}
  let rects = [];

  function node(say, options) { return { say, options }; }

  function startQuest() {
    Game.flags.questStarted = true;
    Speech.say([
      'Well... my bones ache for a proper cup of cardamom tea, but the old kettle is gone.',
      'They say the teapot of the marble terrace never runs dry. It is a long walk for an old man... but perhaps not for a prince.'
    ], 'Chacha Bagh');
  }

  function giveTeapot() {
    Inventory.remove('teapot');
    Inventory.add('mango');
    Game.flags.questDone = true;
    Game.flags.teapotTaken = true;
    Speech.say([
      'Bless your generous heart, Prince!',
      'Here — the fort monkeys voted this very morning to release one mango early. A historic day.'
    ], 'Chacha Bagh');
  }

  function gardenerRoot() {
    const f = Game.flags;
    if (f.questDone) return node(
      'The tea was perfect. You are a good soul, Prince.',
      [
        { text: 'How was the tea, really?', respond: ['Cardamom, a little honey, and the company of the roses.', 'The monkeys sent their regards, by the way.'] },
        { text: 'Enjoy your evening, chacha.', end: true }
      ]);
    if (Inventory.has('teapot')) return node(
      'Wait... is that the terrace teapot?! You fetched it yourself?',
      [
        { text: 'It is yours, chacha.', action: giveTeapot },
        { text: 'Actually, I was just passing by.', respond: ['Of course, of course. A prince is a busy person.', 'The teapot can wait. Probably.'] }
      ]);
    if (f.questStarted) return node(
      'The teapot of the marble terrace... whenever your royal schedule allows.',
      [
        { text: "I'm on my way, chacha.", end: true },
        { text: 'Why not drink from the fountain?', respond: ['Ha! Water that shows off is for the fish.', 'Tea needs patience, and a good pot.'] }
      ]);
    return node(
      'Ah, Prince! Come to admire the marigolds? They admire you back.',
      [
        { text: 'What a beautiful garden.', respond: ['Beautiful, and full of stubborn weeds.', 'We understand each other, the weeds and I.'] },
        { text: 'Is everything well, chacha?', action: startQuest },
        { text: 'Goodbye for now.', end: true }
      ]);
  }

  return {
    open() {
      cur = gardenerRoot();
      active = true;
      Speech.clear();
      Speech.say([cur.say], 'Chacha Bagh');
    },
    close() {
      active = false;
      rects = [];
    },
    get active() { return active; },
    choose(i) {
      if (!active || !cur || !cur.options[i]) return;
      const o = cur.options[i];
      rects = [];
      Speech.clear();
      if (o.action) { o.action(); this.close(); return; }
      if (o.respond) Speech.say(o.respond, 'Chacha Bagh');
      this.close();
    },
    key(digit) { this.choose(digit - 1); },
    // returns true if the click was consumed (any click during dialogue is)
    clickAt(x, y) {
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { this.choose(i); return true; }
      }
      return true;
    },
    draw(ctx) {
      if (!active || !cur) return;
      ctx.font = '12px Georgia, serif';
      rects = [];
      const rowH = 24, gap = 6;
      // options sit just above the speech bar so nothing is covered
      let y = H - 64 - (cur.options.length - 1) * (rowH + gap);
      cur.options.forEach((o, i) => {
        const label = (i + 1) + '.  ' + o.text;
        const w = ctx.measureText(label).width + 24;
        const x = 10;
        const hov = Input.mx >= x && Input.mx <= x + w && Input.my >= y && Input.my <= y + rowH;
        ctx.fillStyle = hov ? 'rgba(70,44,20,0.88)' : 'rgba(38,22,10,0.78)';
        rr(ctx, x, y, w, rowH, 7);
        ctx.fill();
        ctx.strokeStyle = hov ? '#f2c14e' : 'rgba(232,217,176,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#f2e4c2';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 12, y + rowH / 2 + 0.5);
        rects.push({ x, y, w, h: rowH });
        y += rowH + gap;
      });
      ctx.textBaseline = 'alphabetic';
    }
  };
})();
