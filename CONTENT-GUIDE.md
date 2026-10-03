# Content guide — how the game's content is structured

The engine (canvas rendering, camera, dialogue, music, inventory) is code.
Everything *creative* — who lives in the fort, what they look like, what they
say, what items exist, how the music feels — is (and should be) **data**.

To add or change content you fill in a **spec** (the templates below) and hand
it over; the engine renders it. This file is the contract between "the idea"
and "the code".

---

## 1. Character spec

One block per character. Copy it, fill it, done.

```md
### Character: <name>

Identity
- role:          (gatekeeper / cook / wandering singer / monkey ...)
- scene + spot:  (garden, near the flowerbeds / gate, left of the arch)
- personality:   3 adjectives          e.g. proud, sleepy, secretly romantic
- one-line soul: who they are in one sentence

Look (anything you can describe, I translate it to the drawing spec)
- build:         slim / average / stocky / heavy
- height:        shorter / same / taller than the prince
- age:           child / young / adult / elder
- skin tone:     (word or hex)
- hair:          style + color        e.g. silver braid, black topknot, bald
- headwear:      turban / cap / hood / none (+ colors, feather or jewel?)
- outfit:        top + bottom + colors e.g. green kurta, white pajama, red sash
- accessory:     one prop they hold or wear (staff, teapot, parrot, necklaces)

Voice (drives the sound of their speech blips + line pacing)
- pitch:         deep / medium / high
- texture:       warm / wheezy / sing-song / clipped
- speed:         slow / normal / chattering

Dialogue (the heart — give me real sentences, not summaries)
- greeting:      what they say when you first walk up
- topics:        2–4 things they love to talk about (each with 1–2 lines)
- wants:         what they desire (quest hook)
- can give:      item / information / access they provide
- catchphrase:   1 signature line
```

**Why it's structured this way:** build/palette/accessory map to the parametric
character renderer (one drawing engine, many characters); voice maps to the
audio engine; dialogue maps to the dialogue-tree system; scene+spot maps to the
prop placement system. A filled spec is *directly* renderable — no new drawing
code per character.

### Example (already in the game)

```md
### Character: Chacha Bagh
role: gardener · garden, beside the flowerbeds
personality: patient, earthy, quietly witty
build: average, elder · height: same · skin: weathered brown
hair: white beard · headwear: small white cap · outfit: white kurta, brown shawl
accessory: metal watering can
voice: medium, warm, slow
greeting: "Ah, Prince! Come to admire the marigolds? They admire you back."
wants: a proper cup of cardamom tea · can give: a mango (monkey-approved)
catchphrase: "We understand each other, the weeds and I."
```

---

## 2. Artifact (item) spec

```md
### Item: <name>
- id:            short-kebab-id         e.g. rose-garland
- found:         where it lives         e.g. garden flowerbeds, after rain
- look lines:    2–3 lines when examined (warm + a little funny)
- pickup line:   said when taken
- icon:          shape + 2–3 colors     e.g. orange circlet, gold dots
- used on:       (optional) which character/hotspot accepts it, and what happens
- given by:      (optional) which character hands it over and why
```

---

## 3. Music track spec

```md
### Track: <name>
- mood:          3 words                e.g. calm, golden, unhurried
- instruments:   from the engine's set: flute, pluck, boing-bass, tick,
                 shaker, thump, chirp, bell, wind, birds
- tempo:         slow / steady / bouncy (or beats-per-second)
- scale/key:     optional — pentatonic (default), major, raga-flavored
- loop length:   short (10–15s) / medium (25–40s)
- scenes:        which scene(s) it belongs to in Auto mode
```

Existing mapping: `gate → Courtyard Raga · garden → Monkey Business ·
terrace → Fort at Rest`.

---

## 4. Scene spec

```md
### Scene: <name>
- time of day:   dawn / noon / dusk / night (drives palette + sky)
- palette words: 3–4 color words       e.g. sandstone gold, marble cream
- landmarks:     3–5 big painted props (gate arch, fountain, domed pavilion)
- walkable:      where the prince can stand (band / courtyard / path)
- exits:         which edges/doors lead to which scenes
- hotspots:      4–6 examinable things, each with 1–3 look lines
- characters:    who stands here
- track:         which music belongs here (Auto mode)
```

---

## How a spec becomes pixels

1. **Look** → parameters for the shared drawing engine (body, wardrobe,
   accessories are composable pieces; new hair/clothes are small additions).
2. **Dialogue** → a dialogue-tree node file; options can check inventory and
   quest flags (`Game.flags`).
3. **Voice** → pitch/texture values for the speech-blip synth (planned).
4. **Items** → an entry in the inventory registry (icon is drawn from the spec).
5. **Music** → a track builder (patterns + instrument list from the spec).
6. **Scene** → a scene object: painter function + prop list + hotspots + exits.

Later, any of these can be upgraded (e.g. hand-painted sprite sheets replacing
procedural characters) without changing the specs — the specs are the contract.
