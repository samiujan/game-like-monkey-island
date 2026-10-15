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
| **Run** | **Double-click** — he sets off at twice the speed |
| Leave the scene | Click **anywhere along the left or right edge** |
| Examine something | Hover (see the label), then click the hotspot |
| Talk to someone | Click the character |
| Pick something up | Click the pick-up hotspot |
| **Inspect** an item | Click its icon in the satchel (bottom-right) |
| **Use an item on something** | Click the item to pick it up, then click whatever you want to use it on |
| Put an item back down | Click it again, or press `Esc` |
| Choose a dialogue line | Click it, or press the number `1`–`9` |
| Close the dialogue | `Esc` |
| Music on/off | `M`, or the ♪ button top-right |
| Pick a music track | The **Auto ▾** menu top-right |

An item in hand sits proud of the others with a gold border, and **the item
itself becomes the pointer** — ringed in gold when the thing under it will
accept it, with an arrow when that thing is an exit. Clicking the wrong thing on
the wrong thing is allowed, and answered.

A whole exchange is printed at once rather than a line at a time, so you can
read a three-line mime in one go.

The cursor tells you what will happen:

- a small **ring** — walk here
- a **sparkling dot** — look / talk / pick up (or *use* whatever is in hand)
- an **arrow** — a doorway to another scene

---

## The four scenes

The fort is four scenes. Walk to the glowing doorway on either edge to move
between them — or, at the gate, through the shut wooden doors on the left.

Each scene is staged in **perspective**: the walkable floor is a trapezoid that
recedes toward a vanishing point at the back wall, and characters scale with
distance — small by the wall, large up close. They can walk *behind* mid-ground
props (the fountain, the tea table, the cook's long table) and are occluded
correctly.

### 1. The Alamgiri Gate — *dawn*
A courtyard of converging paving running back to the sandstone wall, with shut
outer doors to the left and the great gate arch to the right. Exit **right** to
the gardens, **left** through the doors into the kitchens.

### 2. Hazuri Bagh — *the garden, midday*
An open lawn receding to a hedge line, with mowing stripes fanning from the
vanishing point, a marble fountain mid-ground, a mango tree with three monkeys
milling about on the grass, butterflies, and **Chacha Bagh**, the old gardener —
who potters between his beds, waters, and now and then wipes his brow. Exit
**left** to the gate, **right** to the terrace.

### 3. The Marble Terrace — *dusk*
The hall of mirrors along the back, its colonnade meeting a marble floor laid
with a rose carpet in perspective, the early moon, a standing lantern, the
palace peacock strutting up and down it (he judges you, kindly), and a tea table
set for two. Exit **left** to the garden.

### 4. The Shahi Bawarchi Khana — *the fort kitchens*
A great hearth, copper pots hanging from the beams, two shelves of spice jars,
a long scrubbed prep table with **the big copper teapot** on it, and **Ustad
Bawarchi**, who is not pleased to see you. Exit **right** to the gate.

---

## The puzzle *(spoilers — read only if you're stuck)*

One job, a chain of swaps, and one trick worth knowing.

1. **Hazuri Bagh.** Talk to **Chacha Bagh** and ask *"Is everything well,
   chacha?"* He longs for cardamom tea and has neither a pot nor the spice: the
   great copper teapot lives in the kitchens, and the cardamom belongs to the
   cook.
2. **The kitchens.** The **teapot** is on the long prep table — take it. Then
   talk to **Ustad Bawarchi**, who will not part with the cardamom for coin:
   *"Coin does not sweeten a dish, Prince. Fruit does."* He wants a ripe mango.
3. **The monkeys.** The only ripe mango in the fort is guarded by the monkeys of
   Hazuri Bagh. They do not sell. They **trade** — and what they want is a
   peacock's tail feather.
4. **The terrace, and the trick — two steps, not one.** The peacock will not
   give up a feather while he is watching. Holding the mirror-polished teapot up
   to him is *not enough on its own*: vanity is not curiosity, and he has never
   once needed to look at himself. **Talk to him first and plant the doubt** —
   ask *"Have you looked at yourself lately?"* Now he wants to see, and has
   nothing to see himself in. *Then* use the teapot on him: he catches his own
   reflection, turns to check the hall of mirrors, and a feather drifts loose
   while he is busy.

Then follow the chain back: **feather → monkeys → mango → cook → cardamom**,
and finally take the pot and the spice to the gardener. Choose *"Both. Shall I
put the water on?"*

There are no fail states and no dead ends. Wrong combinations are answered with
a line rather than silence, so you can poke at everything.

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
  js/actors.js      — sprite sets, idle blending, and the wandering NPCs
  js/dialogue.js    — inventory (satchel) + every character's dialogue tree
  js/scenes.js      — the four scenes: perspective floors, props, NPCs, hotspots
  js/input.js       — mouse/keyboard: hover, click-to-walk, dialogue keys
  js/main.js        — boot, title screen, game loop, scene transitions
  assets/           — sprite sheets (prince, gardener, cook, monkey, peacock)
  assets/_sheets/   — the AI contact sheets the sprites were cut from
  tools/            — sheet slicing + cleanup scripts (see "Art pipeline" below)
  server.py         — optional no-cache static dev server (port 8000)
  CONTENT-GUIDE.md  — how to add characters, items, music, and scenes as *data*
```

The engine (rendering, camera, dialogue, music, inventory) is code. Everything
*creative* — who lives here, what they say, what items exist, how the music
feels — is data. See **CONTENT-GUIDE.md** for the exact templates.

---

## Art pipeline

There are two kinds of sprite source, and a tool for each.

### Contact sheets → individual sprites

New characters arrive as AI-generated contact sheets in `assets/_sheets/`. They
have a **fake-transparency checkerboard baked into the pixels** — the model draws
the checker rather than leaving real alpha — plus stray crosshair registration
marks between the figures. `tools/slice_sheet.py` handles all of that:

```bash
python3 tools/slice_sheet.py assets/_sheets/cook.png assets/_frames/cook
```

1. **Keys the checkerboard out** by flood-filling from the border. Doing it by
   connectivity rather than by colour is what keeps a figure's enclosed white
   kurta, apron or cap intact.
2. **Learns the two checker tones per sheet** with k-means on the border pixels —
   the grey varies from 160 to 186 between sheets, so hardcoding it fails.
3. **Finds each figure as a connected component**, dropping specks and the
   crosshair marks by area, then groups them into rows. Deliberately *not*
   clustered: a long tail makes one figure's bounding box overlap its
   neighbour's, and the merge chain then swallows the whole sheet.
4. **Sweeps up enclosed background.** The flood fill cannot reach a pocket of
   checkerboard sealed off by, say, a sitting monkey's curled tail, so those
   patches stay opaque and show through the figure. A second pass keys them on
   a much tighter colour match — which the checkerboard passes exactly and a
   monkey's pale belly does not.
5. **Crops, keys and cleans** each one: the same fringe-removal and alpha
   softening as below.

Sheets differ: some carry a checkerboard, some a single flat colour, and the
tolerance that suits one is wrong for another (the monkey's warm grey is close
enough to its own fur that a small change collapses the sheet into one blob).
`slice_sheet.py` therefore takes an optional tolerance — `python3
tools/slice_sheet.py assets/_sheets/monkey.png assets/_frames/monkey 38`.

### Actors: idle sets and walking

`js/actors.js` owns the painted characters. Each has an ordered set of
same-body poses and, where the sheet provides one, a five-frame walk cycle.

An **actor** carries a position, a facing, a walk phase and a *home patch*. It
stands still for a few seconds, picks a spot inside the patch, walks to it, and
repeats. There is deliberately no pathfinding: each patch is chosen clear of
props, so every hop is a straight line — cheap, and it cannot fail.

The hotspot and the depth-sorted prop that stand for an actor are dragged along
with it, so a wandering character stays clickable and still sorts correctly
against the Prince. Clicking someone holds them still for ten seconds, so they
are not halfway across the lawn by the time he arrives.

The cook is deliberately not an actor — he never leaves his table, so he only
needs the idle blender.

### Idle sets

Most characters are given an ordered **set** of same-body poses rather than one
frame: the first is the resting pose, the rest are fidgets. `drawIdle` holds a
pose for several seconds, then dissolves to the next over a fraction of a
second, which is enough to make a handful of static sheets read as someone
shifting about. So the cook works through apron → stir → taste, the gardener
waters and then wipes his brow, the monkeys shift between sitting poses.

Because the blend is derived from the clock rather than stored per character,
there is no animation state to keep in sync — and every pose in a set must share
a body type, or the dissolve looks like a costume change.

`tools/build_sprites.py` then maps those frames onto the filenames the game
loads, bottom-aligning each one and centring it on its own **centre of mass** —
not its bounding box, which swings about with a held prop and makes the Prince
jitter sideways as he walks. It deliberately does *not* rescale: within a sheet
the generator already draws every figure at one scale, and forcing a common
height would blow a seated monkey up to the size of a walking one.

```bash
python3 tools/build_sprites.py
```

### Hand-made sheets → cleaned

The original sheets arrive as flat RGBA PNGs with a hard binary alpha and a fringe
of leftover background pixels clinging to the dark line art — which shows up as
a pale, ragged outline around every character. `tools/clean_sprites.py` fixes
them in place:

```bash
python3 tools/clean_sprites.py
```

It works through each sheet like this:

1. **Recolours the silhouette** — every edge pixel takes the average colour of
   the interior pixels near it, so a light fringe becomes the character's own
   outline colour (self-adjusting: a white sleeve edge stays white).
2. **Bleeds colour outward** into the transparent pixels, so filtering never
   drags black into the edge.
3. **Softens the alpha edge** slightly, so the silhouette anti-aliases cleanly.

The originals are tracked in git, so `git checkout assets` restores them.
`assets/_frames/` is derived and gitignored — regenerate it from `_sheets`.

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

**In the game today:** four connected scenes staged in Monkey Island-style
perspective — a trapezoid floor receding to a vanishing point, characters that
scale with distance, correct occlusion behind mid-ground props, and foreground
framing that crops the corners. Plus click-to-walk with **A\* pathfinding**
(the Prince routes himself around props), double-click to run, a whole-edge
doorway on each side, a
**"use X on Y" verb** with item selection, a two-item satchel, **three NPCs with
branching dialogue**, and one complete puzzle with a real trick in it: *A Feather
for a Mango*. Five characters are fully sprite-based — the Prince, Chacha Bagh,
the cook, the monkeys and the peacock — and the peacock even changes pose when he
catches his own reflection. Three procedural music tracks auto-switch by scene.

**Known rough edges**

- NPCs wander on straight lines inside a fixed patch rather than navigating:
  they will not path around a prop, so their patches are picked to be clear.
- The pathfinder plans around the props but does not *understand* them — a prop
  the Prince should walk behind rather than around has to be left unblocked.
- The four scenes are hand-painted backgrounds, so moving a prop means repainting
  its surroundings rather than moving a sprite.

**Also on the list:**

- walk cycles for the NPCs (the frames are already sliced and waiting)
- per-character speech-blip voices (the voice specs are ready, the synth is planned)
- more characters (a gatekeeper, a wandering singer…)
- hand-painted sprite sheets replacing the procedural props over time

The specs in `CONTENT-GUIDE.md` are the contract — any of those upgrades can
land without rewriting the content.
