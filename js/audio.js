// Music: three procedural loops with crossfades, plus a per-scene auto mode.
//   Courtyard Raga  — the calm flute-and-tanpura loop (default at the gate)
//   Monkey Business — bouncy, happy-go-lucky plucks and chirps (the garden)
//   Fort at Rest    — pure atmosphere: wind, distant birds, a far-off bell (the terrace)
const Music = (() => {
  let ctx = null, master = null, started = false, muted = true; // music off by default
  let current = null, currentId = null;
  let pref = 'auto';
  const FADE = 2.5; // crossfade seconds

  const SCENE_TRACK = { gate: 'court', garden: 'whimsy', terrace: 'ambient' };
  const TRIM = { court: 1.0, whimsy: 0.85, ambient: 1.2 };
  const MASTER_VOL = 0.5;

  const TRACKS = [
    { id: 'auto',    label: 'Auto — follows the scene' },
    { id: 'court',   label: 'Courtyard Raga' },
    { id: 'whimsy',  label: 'Monkey Business' },
    { id: 'ambient', label: 'Fort at Rest' },
  ];

  function now() { return ctx.currentTime; }
  function resolve() {
    if (pref !== 'auto') return pref;
    return SCENE_TRACK[(typeof Game !== 'undefined' && Game.sceneId)] || 'court';
  }

  // ------------------------------------------------------------ shared voices
  function pluck(out, freq, when, vol, decay) {
    const d = decay || 0.4;
    const g = ctx.createGain();
    g.connect(out);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    const o1 = ctx.createOscillator();
    o1.type = 'triangle'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain(); g2.gain.value = 0.3;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    o1.start(when); o2.start(when);
    o1.stop(when + d + 0.1); o2.stop(when + d + 0.1);
  }

  function boing(out, freq, when, vol) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.12, when);
    o.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
    const g = ctx.createGain();
    g.connect(out);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    o.connect(g); o.start(when); o.stop(when + 0.35);
  }

  function chirp(out, when, f0, f1, dur, vol) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + dur);
    const g = ctx.createGain();
    g.connect(out);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.08);
    o.connect(g); o.start(when); o.stop(when + dur + 0.15);
  }

  function tick(out, when, vol) {
    const len = 0.03;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(hp); hp.connect(g); g.connect(out);
    src.start(when);
  }

  function flute(out, freq, when, dur) {
    const gain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1900;
    gain.connect(lp); lp.connect(out);
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, when);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.006, when + Math.min(0.5, dur * 0.5));
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle'; osc2.frequency.value = freq * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.16;
    osc2.connect(g2); g2.connect(gain);
    const peak = 0.16;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.08);
    gain.gain.setValueAtTime(peak, when + Math.max(0.09, dur - 0.28));
    gain.gain.linearRampToValueAtTime(0.0001, when + dur + 0.12);
    osc.start(when); osc2.start(when); lfo.start(when);
    osc.stop(when + dur + 0.2); osc2.stop(when + dur + 0.2); lfo.stop(when + dur + 0.2);
  }

  function thump(out, when) {
    const gain = ctx.createGain();
    gain.connect(out);
    gain.gain.setValueAtTime(0.09, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(62, when + 0.18);
    osc.connect(gain); osc.start(when); osc.stop(when + 0.25);
  }

  function shaker(out, when) {
    const len = 0.06;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 6500; bp.Q.value = 1.2;
    const gain = ctx.createGain(); gain.gain.value = 0.035;
    src.connect(bp); bp.connect(gain); gain.connect(out);
    src.start(when);
  }

  function bell(out, when) {
    [[523.25, 0.05], [783.99, 0.03], [1046.5, 0.018]].forEach(([f, v]) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 4);
      o.connect(g); o.start(when); o.stop(when + 4.2);
    });
  }

  // looped filtered noise with a slow wobble — the bed for atmospheric sounds
  function noiseBed(out, filterType, freq, q, vol, lfoFreq, lfoDepth) {
    const len = 2;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    const lfo = ctx.createOscillator(); lfo.frequency.value = lfoFreq;
    const lg = ctx.createGain(); lg.gain.value = lfoDepth;
    lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(); lfo.start();
    return { src, lfo };
  }

  function birdCall(out, when, seed) {
    const base = 2200 + (seed * 173) % 900;
    const n = 2 + (seed % 2);
    for (let i = 0; i < n; i++) {
      chirp(out, when + i * 0.16, base * (1 + i * 0.06), base * 0.72, 0.08, 0.035);
    }
  }

  // ------------------------------------------------------------ track builders
  // Each builder returns { out, stop() }. `out` starts silent; switchTo() fades it in.
  function buildCourt() {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    const S = { timers: [], stopped: false, drones: [] };

    const BEAT = 0.5;
    const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const PH_A  = [[0, 1], [1, 1], [2, 1.5], [4, 0.5], [3, 1], [2, 2], [null, 1]];
    const PH_A2 = [[0, 1], [1, 1], [2, 1.5], [4, 0.5], [5, 1], [4, 2], [null, 1]];
    const PH_B  = [[4, 1], [5, 1], [6, 1.5], [5, 0.5], [4, 1], [2, 2], [null, 1]];
    const PH_C  = [[7, 1], [6, 1], [5, 1.5], [4, 0.5], [3, 1], [2, 1], [1, 2]];
    const SEQUENCE = [PH_A, PH_A2, PH_B, PH_A, PH_C, PH_A2, PH_B, PH_A];
    const events = (() => {
      const ev = [];
      let t = 0;
      for (const phrase of SEQUENCE) {
        for (const [note, dur] of phrase) {
          if (note !== null) ev.push({ t, type: 'flute', note, dur: dur * BEAT });
          t += dur;
        }
      }
      const total = t;
      for (let b = 0; b < total; b++) {
        if (b % 8 === 0) { ev.push({ t: b, type: 'thump' }); ev.push({ t: b, type: 'arp' }); }
        else if (b % 2 === 1) ev.push({ t: b, type: 'shaker' });
      }
      ev.sort((a, b) => a.t - b.t);
      return { list: ev, beats: total };
    })();

    const mkDrone = (freq, vol) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = freq; o.detune.value = Math.random() * 4 - 2;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const g = ctx.createGain(); g.gain.value = 0;
      g.gain.setTargetAtTime(vol, ctx.currentTime, 3);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06 + Math.random() * 0.04;
      const lg = ctx.createGain(); lg.gain.value = vol * 0.25;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(); lfo.start();
      S.drones.push({ o, lfo });
    };
    mkDrone(130.81, 0.05); mkDrone(196.0, 0.035); mkDrone(261.63, 0.018);

    let idx = 0, loopStart = now() + 0.1;
    const schedule = () => {
      if (S.stopped) return;
      const ahead = now() + 0.9;
      while (true) {
        const e = events.list[idx];
        const when = loopStart + e.t * BEAT;
        if (when > ahead) break;
        if (when > now() - 0.05) {
          if (e.type === 'flute') flute(out, SCALE[e.note], when, e.dur);
          else if (e.type === 'thump') thump(out, when);
          else if (e.type === 'shaker') shaker(out, when);
          else if (e.type === 'arp') {
            pluck(out, 130.81, when, 0.05, 0.5);
            pluck(out, 196.0, when + 0.12, 0.045, 0.5);
            pluck(out, 329.63, when + 0.24, 0.04, 0.5);
          }
        }
        idx++;
        if (idx >= events.list.length) { idx = 0; loopStart += events.beats * BEAT; }
      }
    };
    S.timers.push(setInterval(schedule, 130));

    return { out, stop() {
      S.stopped = true;
      S.timers.forEach(clearInterval);
      S.drones.forEach(({ o, lfo }) => {
        try { o.stop(now() + FADE + 0.3); lfo.stop(now() + FADE + 0.3); } catch (e) {}
      });
    } };
  }

  function buildWhimsy() {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    const S = { timers: [], stopped: false };
    const BEAT = 0.3;
    const N = { B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };
    const A1 = [[N.E5,.5],[N.G5,.5],[N.E5,.5],[N.C5,.5],[N.D5,.5],[N.E5,.5],[N.D5,1],[null,1],
                [N.E5,.5],[N.G5,.5],[N.A5,.5],[N.G5,.5],[N.E5,.5],[N.D5,.5],[N.C5,1],[null,1]];
    const B1 = [[N.C5,.5],[N.D5,.5],[N.E5,.5],[N.G5,.5],[N.A5,.5],[N.G5,.5],[N.E5,1],[null,.5],
                [N.D5,.5],[N.E5,.5],[N.D5,.5],[N.B4,.5],[N.C5,1.5],[null,2]];
    const TAG = [[N.E5,.5],[N.G5,.5],[N.E5,.5],[N.C5,.5],[N.D5,.5],[N.E5,.5],[N.D5,1],[null,1],
                 [N.C5,.5],[N.E5,.5],[N.G5,.5],[N.A5,.5],[N.C6,.5],[N.A5,.5],[N.G5,1.5],[null,2]];
    const SEQ = [A1, B1, A1, TAG];
    const events = (() => {
      const ev = [];
      let t = 0;
      for (const phrase of SEQ) {
        for (const [f, d] of phrase) {
          if (f) ev.push({ t, type: 'm', f });
          t += d;
        }
      }
      const total = t;
      for (let b = 0; b < total; b++) {
        ev.push({ t: b, type: 'bass', i: b });
        ev.push({ t: b + 0.5, type: 'tick' });
      }
      for (const cb of [0, 10, 20, 30]) ev.push({ t: cb, type: 'chirp' });
      ev.sort((a, b) => a.t - b.t);
      return { list: ev, beats: total };
    })();

    let idx = 0, loopStart = now() + 0.1;
    const BASS = [130.81, 98.0, 130.81, 110.0];
    const schedule = () => {
      if (S.stopped) return;
      const ahead = now() + 0.9;
      while (true) {
        const e = events.list[idx];
        const when = loopStart + e.t * BEAT;
        if (when > ahead) break;
        if (when > now() - 0.05) {
          if (e.type === 'm') pluck(out, e.f, when, 0.12, 0.22);
          else if (e.type === 'bass') boing(out, BASS[e.i % 4], when, 0.1);
          else if (e.type === 'tick') tick(out, when, 0.025);
          else if (e.type === 'chirp') chirp(out, when, 659.25, 990, 0.12, 0.05);
        }
        idx++;
        if (idx >= events.list.length) { idx = 0; loopStart += events.beats * BEAT; }
      }
    };
    S.timers.push(setInterval(schedule, 130));

    return { out, stop() { S.stopped = true; S.timers.forEach(clearInterval); } };
  }

  function buildAmbient() {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    const S = { timers: [], stopped: false, beds: [] };

    S.beds.push(noiseBed(out, 'bandpass', 380, 0.6, 0.06, 0.07, 160));   // wind
    S.beds.push(noiseBed(out, 'highpass', 4200, 0.4, 0.012, 0.13, 250)); // faint shimmer

    const BEAT = 1.2;
    const events = (() => {
      const ev = [{ t: 0, type: 'bell' }];
      const spots = [2.5, 6, 10.5, 14, 18.5, 21.5];
      spots.forEach((t, i) => ev.push({ t, type: 'bird', i }));
      return { list: ev, beats: 24 };
    })();

    let idx = 0, loopStart = now() + 0.1;
    const schedule = () => {
      if (S.stopped) return;
      const ahead = now() + 1.0;
      while (true) {
        const e = events.list[idx];
        const when = loopStart + e.t * BEAT;
        if (when > ahead) break;
        if (when > now() - 0.05) {
          if (e.type === 'bell') bell(out, when);
          else if (e.type === 'bird') birdCall(out, when + Math.random() * 0.3, e.i);
        }
        idx++;
        if (idx >= events.list.length) { idx = 0; loopStart += events.beats * BEAT; }
      }
    };
    S.timers.push(setInterval(schedule, 200));

    return { out, stop() {
      S.stopped = true;
      S.timers.forEach(clearInterval);
      S.beds.forEach(({ src, lfo }) => {
        try { src.stop(now() + FADE + 0.3); lfo.stop(now() + FADE + 0.3); } catch (e) {}
      });
    } };
  }

  const BUILDERS = { court: buildCourt, whimsy: buildWhimsy, ambient: buildAmbient };

  // ------------------------------------------------------------ engine
  function switchTo(id) {
    if (!ctx || currentId === id) return;
    const t = now();
    if (current) {
      const old = current;
      old.out.gain.setTargetAtTime(0, t, FADE / 3);
      setTimeout(() => old.stop(), FADE * 1000 + 400);
    }
    const next = BUILDERS[id]();
    next.out.gain.setValueAtTime(0.0001, t);
    next.out.gain.setTargetAtTime(TRIM[id], t, FADE / 3);
    current = next;
    currentId = id;
  }

  return {
    TRACKS,
    start() {
      if (started) return;
      started = true;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { return; }
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_VOL;
      master.connect(ctx.destination);
      switchTo(resolve());
    },
    toggle() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime, 0.15);
      return muted;
    },
    setPref(id) {
      if (!TRACKS.some(t => t.id === id)) return;
      pref = id;
      if (started) switchTo(resolve());
    },
    sceneChanged(sceneId) {
      if (started && pref === 'auto') switchTo(SCENE_TRACK[sceneId] || 'court');
    },
    status() { return { pref, current: currentId, muted }; },
  };
})();
