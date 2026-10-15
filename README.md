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

Each scene is staged in **perspective**: the walkable floor is a trapezoid that
recedes toward a vanishing point at the back wall, and the Prince scales with
distance — small by the wall, large up close. He can walk *behind* mid-ground
props (the fountain, the tea table) and is occluded by them correctly.

### 1. The Alamgiri Gate — *dawn*
A courtyard of converging paving running back to the sandstone wall, with shut
outer doors to the left and the great gate arch to the right. Exit **right** to
the gardens.

### 2. Hazuri Bagh — *the garden, midday*
An open lawn receding to a hedge line, with mowing stripes fanning from the
vanishing point, a marble fountain mid-ground, a not-yet-ripe mango tree,
butterflies, and **Chacha Bagh**, the old gardener. Exit **left** to the gate,
**right** to the terrace.

### 3. The Marble Terrace — *dusk*
The hall of mirrors along the back, its colonnade meeting a marble floor laid
with a rose carpet in perspective, the early moon, a standing lantern, the
palace peacock (he judges you, kindly), and a tea table set for two. Exit
**left** to the garden.

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
  js/player.js      — the Prince: sprites, depth-scaled walking, idle animation
  js/speech.js      — bottom-bar speech ("Speaker: …" lines) + rounded-rect helper
  js/dialogue.js    — inventory (satchel) + the gardener's dialogue tree
  js/scenes.js      — the three scenes: perspective floors, props, hotspots, exits
  js/input.js       — mouse/keyboard: hover, click-to-walk, dialogue keys
  js/main.js        — boot, title screen, game loop, scene transitions
  assets/           — hand-made sprite sheets for the Prince and the gardener
  tools/            — sprite-sheet cleanup script (see "Art pipeline" below)
  server.py         — optional no-cache static dev server (port 8000)
  CONTENT-GUIDE.md  — how to add characters, items, music, and scenes as *data*
```

The engine (rendering, camera, dialogue, music, inventory) is code. Everything
*creative* — who lives here, what they say, what items exist, how the music
feels — is data. See **CONTENT-GUIDE.md** for the exact templates.

---

## Art pipeline

The sprite sheets arrive as flat RGBA PNGs with a hard binary alpha and a fringe
of leftover background pixels clinging to the dark line art — which shows up as
a pale, ragged outline around every character. `tools/clean_sprites.py` fixes
them in place:

```bash
python3 tools/clean_sprites.py
```

It does three things per sheet:

1. **Recolours the silhouette** — every edge pixel takes the average colour of
   the interior pixels near it, so a light fringe becomes the character's own
   outline colour (self-adjusting: a white sleeve edge stays white).
2. **Bleeds colour outward** into the transparent pixels, so filtering never
   drags black into the edge.
3. **Softens the alpha edge** slightly, so the silhouette anti-aliases cleanly.

The originals are tracked in git, so `git checkout assets` restores them.

Characters are drawn at Monkey Island proportions — the Prince is 150px tall at
depth scale 1, about a third of the 480px frame, ranging 108px (back of the
floor) to 180px (front).

---

## Adding content

To add a character, item, music track, or scene, fill in the matching spec from
[`CONTENT-GUIDE.md`](CONTENT-GUIDE.md) — no new drawing code required for a
character; the parametric renderer and dialogue/audio systems do the rest.

---

## Deployment

The site is configured for **Netlify** by a tracked root `netlify.toml`
(`publish = "."`). There's no build step, so deploying this folder just works.
The CLI's local state lives in the gitignored `.netlify/`.

---

## Status & roadmap

**In the game today:** three connected scenes staged in Monkey Island-style
perspective — a trapezoid floor receding to a vanishing point, characters that
scale with distance, correct occlusion behind mid-ground props, and foreground
framing that crops the corners. Plus click-to-walk, look/talk/pickup hotspots, a
two-item inventory, one NPC with a branching dialogue tree, a complete (if tiny)
quest, three procedural music tracks with auto-switching, and a title screen.

**Next up — one real puzzle:** *"A Feather for a Mango."* The teapot is only the
opening move; the gardener has no cardamom, the cook will trade cardamom only for
a ripe mango, and the monkeys who hoard the mangoes will trade only for the
peacock's tail feather — which you get by angling the standing lantern so the
peacock falls in love with his reflection in the hall of mirrors. This needs:

- a **"use X on Y"** verb (today the Prince can only look, talk and pick up)
- **multi-NPC dialogue** (`Dialogue.open()` currently always opens the gardener)
- a **fourth scene** — the fort kitchen — for the cook
- a general NPC renderer (the gardener is currently a one-off)

**Also on the list:**

- per-character speech-blip voices (the voice specs are ready, the synth is planned)
- more characters (the gatekeeper, a wandering singer…)
- walk cycles for NPCs (the gardener is still a single static pose)
- hand-painted sprite sheets replacing the procedural props over time

The specs in `CONTENT-GUIDE.md` are the contract — any of those upgrades can
land without rewriting the content.
