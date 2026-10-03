# Prince of Lahore

*A small, comfortable adventure in the Lahore Fort — a Monkey Island-style
point-and-click, set in the golden Mughal era.*

You play the young Prince of Lahore. There is no great war and no ticking clock:
there is a fort to wander, a garden to admire, a gardener who longs for a proper
cup of cardamom tea, and a teapot on the marble terrace that never runs dry.

Everything is drawn with canvas paths and rendered at a crisp 640×480, the music
is generated live with WebAudio, and there is no framework, no build step, and
no server requirement — you can run it straight from `index.html`.

---

## Quick start

**Option A — just open it**

Open `index.html` in any modern browser. That's it. The game is plain scripts
(no ES modules), so it runs from `file://`.

**Option B — tiny dev server**

```bash
python3 server.py
# then visit http://localhost:8000
```

`server.py` is a no-cache static server, handy while you iterate.

> **Note:** music is **off by default** (browsers gate audio behind a user
> gesture). Press `M` or click the ♪ button once to hear it.

---

## How to play

| Action | Input |
| --- | --- |
| Walk | Click anywhere on the ground |
| Examine something | Hover (see the label), then click the hotspot |
| Talk to someone | Click the character |
| Pick something up | Click the pick-up hotspot |
| Use / inspect an item | Click its icon in the satchel (bottom-right) |
| Choose a dialogue line | Click it, or press the number `1`–`9` |
| Close the dialogue | `Esc` |
| Music on/off | `M`, or the ♪ button top-right |
| Pick a music track | The **Auto ▾** menu top-right |

The cursor tells you what will happen:

- a small **ring** — walk here
- a **sparkling dot** — look / talk / pick up
- an **arrow** — a doorway to another scene

---

## The three scenes

The fort is three scenes along a single east–west path. Walk to the glowing
doorway on either edge to move between them.

### 1. The Alamgiri Gate — *dawn*
Golden sandstone, the great wooden doors, a marble pavilion, and the royal
pennant. Exit **right** to the gardens.

### 2. Hazuri Bagh — *the garden, midday*
Marigolds and roses, a dancing fountain, a not-yet-ripe mango tree, butterflies,
and **Chacha Bagh**, the old gardener. Exit **left** to the gate, **right** to
the terrace.

### 3. The Marble Terrace — *dusk*
The hall of mirrors with its five hundred candles, the early moon, a standing
lantern, the palace peacock (he judges you, kindly), and a tea table set for two.
Exit **left** to the garden.

---

## The quest *(spoilers — read only if you're stuck)*

The whole adventure is one small, gentle errand:

1. At the **Alamgiri Gate**, walk right into **Hazuri Bagh**.
2. Talk to **the old gardener** and ask *"Is everything well, chacha?"*
   He aches for cardamom tea, but the kettle is gone — and the teapot of the
   marble terrace never runs dry.
3. Exit right to the **Marble Terrace** and click the **teapot** on the tea
   table. It joins your satchel.
4. Walk back to the garden and talk to the gardener again. Choose
   *"It is yours, chacha."*
5. He accepts the teapot and rewards you with a **mango** — a historic day,
   the fort monkeys voted on it.

There are no fail states, no dead ends, and no wrong order. Click the mango in
your satchel afterward if you'd like the prince's opinion of it.

---

## Music

Three procedural loops, crossfaded in and out, with an **Auto** mode that follows
the scene:

| Track | Scene |
| --- | --- |
| **Courtyard Raga** — flute and tanpura drone | The Alamgiri Gate |
| **Monkey Business** — bouncy plucks and chirps | Hazuri Bagh |
| **Fort at Rest** — wind, distant birds, a far-off bell | The Marble Terrace |

Use the **Auto ▾** menu (top-right) to pin a specific track, or press `M` to
mute. Music starts on the title-screen click; it's off until you turn it on.

---

## Project structure

```
mi6/
  index.html        — canvas, title overlay, music UI; loads scripts in order
  css/style.css     — page styling, 4:3 letterbox, music menu
  js/audio.js       — WebAudio music engine (three procedural loops + crossfade)
  js/player.js      — the Prince: sprite loading, walking, idle animation
  js/speech.js      — bottom-bar speech ("Speaker: …" lines) + rounded-rect helper
  js/dialogue.js    — inventory (satchel) + the gardener's dialogue tree
  js/scenes.js      — the three scenes: backgrounds, props, hotspots, exits
  js/input.js       — mouse/keyboard: hover, click-to-walk, dialogue keys
  js/main.js        — boot, title screen, game loop, scene transitions
  assets/           — hand-made sprite sheets for the Prince and the gardener
  server.py         — optional no-cache static dev server (port 8000)
  CONTENT-GUIDE.md  — how to add characters, items, music, and scenes as *data*
```

The engine (rendering, camera, dialogue, music, inventory) is code. Everything
*creative* — who lives here, what they say, what items exist, how the music
feels — is data. See **CONTENT-GUIDE.md** for the exact templates.

---

## Adding content

To add a character, item, music track, or scene, fill in the matching spec from
[`CONTENT-GUIDE.md`](CONTENT-GUIDE.md) — no new drawing code required for a
character; the parametric renderer and dialogue/audio systems do the rest.

---

## Deployment

The site is configured for **Netlify** (`.netlify/netlify.toml` publishes the
project root). There's no build step, so any Netlify deploy of this folder just
works.

---

## Status & roadmap

**In the game today:** three connected scenes, click-to-walk, look/talk/pickup
hotspots, a two-item inventory, one NPC with a branching dialogue tree, a
complete (if tiny) quest, three procedural music tracks with auto-switching, and
a title screen.

**Natural next steps** (already specced in `CONTENT-GUIDE.md`):

- per-character speech-blip voices (the voice specs are ready, the synth is planned)
- more characters (the gatekeeper, a cook, a wandering singer, a monkey…)
- more items and puzzles that check `Game.flags` and inventory
- hand-painted sprite sheets replacing the procedural props over time

The specs in `CONTENT-GUIDE.md` are the contract — any of those upgrades can
land without rewriting the content.
