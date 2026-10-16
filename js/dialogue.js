// Inventory (a small royal satchel) and dialogue trees.
//
// The puzzle — "A Feather for a Mango" — runs: Chacha Bagh wants cardamom tea
// but has neither pot nor spice. The cook has the cardamom and will trade only
// for a ripe mango. The monkeys hoard the mangoes and will trade only for a
// peacock's tail feather. The peacock guards his feathers, until you angle the
// standing lantern so he catches his own reflection in the hall of mirrors.
const Inventory = (() => {
  const items = {
    teapot: {
      label: 'the teapot',
      look: 'Warm, polished to a mirror shine, and always ready for a second cup.',
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
    },
    feather: {
      label: 'the peacock feather',
      look: 'Long, iridescent, and extremely aware of how good it looks.',
      icon(ctx, x, y) {
        // quill
        ctx.strokeStyle = '#e8e2d0';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 11); ctx.quadraticCurveTo(x - 3, y + 2, x + 2, y - 6);
        ctx.stroke();
        // barbs
        ctx.fillStyle = '#2a7a9e';
        ctx.beginPath();
        ctx.moveTo(x + 1, y - 7);
        ctx.quadraticCurveTo(x + 9, y - 13, x + 8, y - 2);
        ctx.quadraticCurveTo(x + 4, y - 3, x + 1, y - 7);
        ctx.fill();
        // the eye
        ctx.fillStyle = '#1e5a78';
        ctx.beginPath(); ctx.ellipse(x + 5, y - 6, 4.4, 5.6, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3ecfb2';
        ctx.beginPath(); ctx.ellipse(x + 5, y - 6, 2.2, 3, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f2c14e';
        ctx.beginPath(); ctx.ellipse(x + 5, y - 6, 0.9, 1.5, 0.3, 0, Math.PI * 2); ctx.fill();
      }
    },
    cardamom: {
      label: 'the cardamom',
      look: 'A twist of muslin, warm with green pods. It smells like a good morning.',
      icon(ctx, x, y) {
        // pods peeking out
        ctx.fillStyle = '#9dbf72';
        for (const [dx, dy] of [[-6, -3], [1, -6], [6, -1]]) {
          ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 3.2, 4.4, dx * 0.08, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#6f9450';
        ctx.lineWidth = 0.9;
        for (const dx of [-6, 1, 6]) {
          ctx.beginPath(); ctx.moveTo(x + dx, y - 8); ctx.lineTo(x + dx, y + 3); ctx.stroke();
        }
        // muslin pouch
        ctx.fillStyle = '#f0e8d6';
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 1);
        ctx.quadraticCurveTo(x, y + 13, x + 9, y + 1);
        ctx.quadraticCurveTo(x, y + 5, x - 9, y + 1);
        ctx.fill();
        ctx.strokeStyle = '#c9b891';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 1); ctx.quadraticCurveTo(x, y + 5, x + 9, y + 1);
        ctx.stroke();
        // tie
        ctx.strokeStyle = '#b8863f';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - 10, y + 1); ctx.lineTo(x + 10, y + 1); ctx.stroke();
      }
    },
    marigold: {
      label: 'the marigold',
      look: 'Orange as a sunset and twice as pleased with itself. A gift.',
      icon(ctx, x, y) {
        ctx.strokeStyle = '#4e8f4a';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y + 11); ctx.lineTo(x, y + 1); ctx.stroke();
        ctx.fillStyle = '#4e8f4a';
        ctx.beginPath(); ctx.ellipse(x + 5, y + 5, 4, 2, 0.5, 0, Math.PI * 2); ctx.fill();
        // ruffled head
        ctx.fillStyle = '#e8843a';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * 4.6, y - 4 + Math.sin(a) * 4.6, 3.2, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f2c14e';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * 2.4, y - 4 + Math.sin(a) * 2.4, 2, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#c6552e';
        ctx.beginPath(); ctx.arc(x, y - 4, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  let bag = [];
  let held = null;   // the item currently "in hand" for use-on-target
  return {
    items,
    has: (id) => bag.indexOf(id) >= 0,
    add: (id) => { if (bag.indexOf(id) < 0) bag.push(id); },
    remove: (id) => {
      bag = bag.filter((b) => b !== id);
      if (held === id) held = null;
    },
    get list() { return bag; },
    get held() { return held; },
    hold: (id) => { held = (held === id) ? null : id; return held; },
    letGo: () => { held = null; },
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
      'Well... my bones ache for a proper cup of cardamom tea, and the old kettle walked off years ago.',
      'The kitchens keep a great copper teapot. And the cardamom — that, only the cook will part with. Good luck with that one.'
    ], 'Chacha Bagh');
  }

  // --- the gardener's ending: pot + spice together ------------------------
  function brewTea() {
    Inventory.remove('teapot');
    Inventory.remove('cardamom');
    Inventory.add('marigold');
    Game.flags.questDone = true;
    Speech.say([
      'The pot AND the cardamom. Prince, you have done a small, difficult, ridiculous thing.',
      'Sit. Two cups, as always — the second one was waiting for you.',
      'Here. A marigold for your turban. Do not tell the roses.'
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
    if (Inventory.has('teapot') && Inventory.has('cardamom')) return node(
      'Wait — the terrace teapot AND the cook\'s cardamom? Both?',
      [
        { text: 'Both. Shall I put the water on?', action: brewTea },
        { text: 'I was only carrying them about, actually.', respond: ['Of course. Princes are famous for that.', 'The water, when you are ready.'] }
      ]);
    if (f.questStarted) {
      let say;
      if (!Inventory.has('teapot')) {
        say = 'The great copper teapot from the kitchens... and the cardamom. Whenever your royal schedule allows.';
      } else {
        say = 'The pot! Now the cardamom. The cook keeps it, and the cook does not give.';
      }
      return node(say, [
        { text: 'I am on it, chacha.', end: true },
        { text: 'Why not drink from the fountain?', respond: ['Ha! Water that shows off is for the fish.', 'Tea needs patience, and a good pot.'] }
      ]);
    }
    return node(
      'Ah, Prince! Come to admire the marigolds? They admire you back.',
      [
        { text: 'What a beautiful garden.', respond: ['Beautiful, and full of stubborn weeds.', 'We understand each other, the weeds and I.'] },
        { text: 'Is everything well, chacha?', action: startQuest },
        { text: 'Goodbye for now.', end: true }
      ]);
  }

  // --- the cook -----------------------------------------------------------
  function cookAsks() {
    Game.flags.cookAsked = true;
    Speech.say([
      'Cardamom? For tea? HA.',
      'The cardamom is mine and the cardamom stays. Unless you bring me a ripe mango.',
      'Coin does not sweeten a dish, Prince. Fruit does.'
    ], 'Ustad Bawarchi');
  }

  function tradeCardamom() {
    Inventory.remove('mango');
    Inventory.add('cardamom');
    Game.flags.cardamomGiven = true;
    Speech.say([
      'Ha! Look at it. Perfect. Not a bruise on it.',
      'Take the cardamom — all of it. Do not tell the other cooks.',
      'And Prince... the gardener. Eleven years he has been asking me for cardamom. Eleven years.'
    ], 'Ustad Bawarchi');
  }

  function cookRoot() {
    const f = Game.flags;
    if (f.cardamomGiven) return node(
      'The mango was perfect. The kitchen is yours, Prince. Within reason.',
      [
        { text: 'What did you make with it?', respond: ['Sorbet. For the ambassadors.', 'They will never know it was a monkey\'s mango.'] },
        { text: 'Good day, ustad.', end: true }
      ]);
    if (Inventory.has('mango')) return node(
      'Is that — is that a RIPE MANGO? In MY kitchen?',
      [
        { text: 'The cardamom first, ustad.', action: tradeCardamom },
        { text: 'I might keep it, actually.', respond: ['Then keep your tea ambitions modest.', 'I will be here. With the cardamom. Waiting.'] }
      ]);
    if (f.cookAsked) return node(
      'Still no mango. The cardamom sits. The prince wanders.',
      [
        { text: 'Where would a prince find a ripe mango?', respond: ['Not in my kitchen.', 'The monkeys of Hazuri Bagh have them all — and they do not sell. They TRADE.'] },
        { text: 'Working on it, ustad.', end: true }
      ]);
    return node(
      'You. Out of my kitchen. Unless you have brought me something.',
      [
        { text: 'I need cardamom, ustad.', action: cookAsks },
        { text: 'What is cooking?', respond: ['Dinner for forty. None of it for you.', 'Unless you bring me a ripe mango.'] },
        { text: 'I will come back.', end: true }
      ]);
  }

  // --- the monkeys --------------------------------------------------------
  function monkeyDemand() {
    Game.flags.metMonkeys = true;
    Speech.say([
      '(The largest monkey looks you up and down, and shakes its head, slowly.)',
      '(It points at the terrace. Then it touches its ear, and mimes something long, blue and extremely showy.)',
      '(The mango is not for sale. The mango is for a feather.)'
    ], 'The fort monkeys');
  }

  function tradeMango() {
    Inventory.remove('feather');
    Inventory.add('mango');
    Game.flags.mangoGiven = true;
    Speech.say([
      '(The monkeys hold the feather up to the light. They are visibly moved.)',
      '(The mango is handed over with tremendous ceremony, and one small bow.)'
    ], 'The fort monkeys');
  }

  function monkeysRoot() {
    const f = Game.flags;
    if (f.mangoGiven) return node(
      '(The monkeys have resumed their schedule. The schedule is napping.)',
      [
        { text: 'Thank you for the mango.', respond: ['(The monkeys examine their fingernails, modestly.)'] },
        { text: 'Carry on.', end: true }
      ]);
    if (Inventory.has('feather')) return node(
      '(Every monkey stops. Every monkey stares at the feather.)',
      [
        { text: 'One feather. One mango. Fair?', action: tradeMango },
        { text: 'Actually, I think I shall keep it.', respond: ['(The monkeys do not move. The monkeys have time.)'] }
      ]);
    if (f.metMonkeys) return node(
      '(The monkeys are still sitting on the only ripe mango. They are still unimpressed.)',
      [
        { text: 'What DO you want?', respond: [
          '(The smallest monkey points at the terrace and touches its own ear.)',
          '(It mimes something long, blue and showy.)',
          '(The mango is not for sale. The mango is for a feather.)'] },
        { text: 'We will speak later.', end: true }
      ]);
    return node(
      '(Three monkeys, one ripe mango, and a great deal of confidence.)',
      [
        { text: 'May a prince have that mango?', action: monkeyDemand },
        { text: 'What are you three doing?', respond: ['(Napping. Guarding. Being monkeys.)', '(It is a demanding schedule.)'] },
        { text: 'Leave them to it.', end: true }
      ]);
  }

  // --- the peacock --------------------------------------------------------
  // Flattery does not work on a bird who already agrees with you. The way in
  // is to plant a doubt: he has to want to look before a mirror is any use.
  function peacockDoubt() {
    Game.flags.peacockCurious = true;
    Speech.say([
      '(The peacock stops. He turns his head, slowly, towards the hall of mirrors.)',
      '(It is a terrible question to put to a vain bird, and it has landed.)',
      '(He is now extremely interested in how he looks — and has nothing to look into.)'
    ], 'The palace peacock');
  }

  function peacockRoot() {
    const f = Game.flags;
    if (f.peacockVain) return node(
      '(The peacock is admiring himself. He has been at it for some time.)',
      [
        { text: 'You look magnificent.', respond: ['(He agrees. He agrees so completely that he does not turn round.)'] },
        { text: 'Leave him to it.', end: true }
      ]);
    if (f.peacockCurious) return node(
      '(The peacock keeps glancing towards the hall of mirrors. He is thinking about it.)',
      [
        { text: 'Something shiny would help.', respond: ['(He looks at you. Then at your satchel. Then at you again.)'] },
        { text: 'Soon.', end: true }
      ]);
    return node(
      '(The peacock regards you the way one regards weather. He judges everyone, silently — but kindly.)',
      [
        { text: 'You are the finest bird in the fort.', respond: [
          '(He inclines his head, graciously. He has heard this before.)',
          '(It is clear that flattery will get you nowhere he has not already been.)'] },
        { text: 'Have you looked at yourself lately?', action: peacockDoubt },
        { text: 'Never mind.', end: true }
      ]);
  }

  const TREES = { gardener: gardenerRoot, cook: cookRoot, monkeys: monkeysRoot, peacock: peacockRoot };
  const SPEAKERS = { gardener: 'Chacha Bagh', cook: 'Ustad Bawarchi', monkeys: 'The fort monkeys', peacock: 'The palace peacock' };
  let curSpeaker = SPEAKERS.gardener;

  return {
    // the two barter steps are also reachable by using the item on the
    // character, so scenes.js calls these straight from a hotspot's useOn
    tradeMango,
    tradeCardamom,
    open(npc) {
      const id = TREES[npc] ? npc : 'gardener';
      curSpeaker = SPEAKERS[id];
      cur = TREES[id]();
      active = true;
      Speech.clear();
      Speech.say([cur.say], curSpeaker);
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
      if (o.respond) Speech.say(o.respond, curSpeaker);
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
      // Options stack directly on top of the speech bar. This used to be a
      // fixed offset from the bottom of the screen, which was fine while the
      // bar held one line; a sequence of four lines grew the bar straight
      // through the options.
      const blockH = cur.options.length * rowH + (cur.options.length - 1) * gap;
      const barTop = Speech.active ? Speech.top : H - 8;
      let y = Math.max(8, barTop - 10 - blockH);
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
