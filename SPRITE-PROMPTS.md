# Sprite sheet prompts

Prompts that produce sheets the pipeline can actually use, written from the
failures this project has hit. The game renders characters at roughly 130px, so
a source figure of 250–400px is plenty; quality is lost by *enlarging*, never by
shrinking.

---

## The shared brief

Paste this **before every sheet for a given character**, filling the brackets.
Its whole job is to pin down scale, facing and background, because those are the
three things that vary silently between generations.

```text
Character: <NAME> — <one line, e.g. "a stout, jolly fort gardener in a white
turban, green waistcoat, cream kurta and red sash">.

Style: clean hand-drawn 2D animation cel, warm watercolour palette, soft dark
outline, flat shading, no rendering or 3D look.

SCALE CONTRACT — the most important part:
- In every frame, <NAME> stands exactly <300> pixels tall, measured from the
  soles of the feet to the top of the head (ignore raised arms or tools held
  above the head).
- Every figure is drawn at exactly the same scale and the same camera distance.
- The soles of the feet sit on one common horizontal baseline.

Facing: <profile facing right> in every frame.

Background: fully transparent. No backdrop, no floor, no ground plane, no
shadow, no ellipse under the feet, no painted checkerboard.

Sheet: a neat grid of <4> columns by <4> rows with generous, even spacing.
Every figure sits entirely inside its own cell, with a clear transparent gap
around it — no part of one figure may touch or overlap another.

Absolutely no text, numbers, letters, labels, captions, arrows, crosshairs,
registration marks, grid lines, borders or watermarks anywhere in the image.

Output: PNG with a real transparent background, <1536>x<1536>.
```

> **Do not ask for a checkerboard background.** Image models often *paint* a
> checkerboard rather than producing real alpha, and then it has to be keyed out
> — which is unreliable, because the grey squares can sit very close to the
> character's own fur or cloth. Ask for **transparent**; if the model can't do
> real alpha, ask for **a single flat colour used nowhere on the character**
> (a vivid green or magenta) instead. Both are trivial to work with. A painted
> checkerboard is not.

---

## Prompt A — resting poses (do this first)

You only need two or three usable poses, but asking for sixteen gives choice.
Resting poses should face the viewer; the walk is in profile.

```text
<shared brief>

Draw 16 different standing poses of <NAME>, all facing the viewer.

Same character, same outfit, same props, same height and scale in all 16. Vary
only the gesture: arms at the sides, one hand raised, both arms open, hand on
hip, arms folded, hand to chin, thumbs up, pointing to one side, shrugging,
hands clasped in front.

The character holds and wears exactly the same items in every pose. Nothing may
appear or disappear between poses — no scroll, bowl, flower or tool that is
present in one and absent in the next.
```

> **Why the last paragraph matters:** the game cross-dissolves between resting
> poses. A prop that exists in one pose and not the next visibly pops in and out
> of the character's hands.

---

## Prompt B — walk cycle

```text
<shared brief>

Draw a 16-frame looping walk cycle of <NAME>, in profile facing <right>, one
figure per cell, reading left to right and top to bottom.

Frame 1 is the first contact pose. Frame 16 is the last frame before the cycle
repeats — do not repeat frame 1 at the end.

Standing height must be identical to the resting sheet. The feet stay on one
baseline; only the legs swing and the body bobs. The whole figure must stay
inside its cell in every frame, including the leading foot and any tool.
```

**Use 8 or 16 frames, not an awkward number.** The cycle index is
`floor(phase) % frames.length`, so any count works — but a count that divides
evenly into the stride avoids a visible hitch at the loop point.

---

## Prompt C — props and actions (optional)

```text
<shared brief>

Draw 16 scenes of <NAME> at work, one per cell: <holding a watering can and
watering seedlings; hanging a basket; using a spray bottle; filling a can at a
pump; coiling a hose; potting plants; inspecting a leaf; carrying a sack>.

Same character, same scale, same height as the other sheets. Each figure keeps
its own tool entirely inside its cell.
```

> These are **not** used as walk or idle frames — a figure posed around a prop
> will not line up with anything. They are for one-off moments, so they only
> need the shared brief, not the baseline discipline.

---

## If you need several characters

Generate them **in the same session, back to back**, repeating the same scale
contract with the same pixel height. The model does not carry scale between
separate sessions, and this project has already been bitten by it: a gesture
sheet came back 20% larger than the walk sheet for the same character.

---

## Checklist before you hand the sheets over

```bash
python3 tools/check_sheet.py assets/_sheets/<sheet>.png
```

It reports the background type, the figure count, whether any figure is clipped
or fused to another, whether text or markers are left on the sheet, and whether
the figures are drawn at one scale. For the scale test it measures the width of
the top sliver of each figure — the head — because bounding-box height lies: an
arm raised over the head inflates it without the figure being any bigger. Read
that number with one caveat, which the tool prints too: a head turned to profile
is narrower than one facing you, so compare same-facing figures.

Then by eye:

- [ ] Background is **really transparent** (open it — if you can see squares,
      it is painted on and will need keying).
- [ ] Every figure is whole — no feet, hands or tools clipped by a cell edge.
- [ ] Figures are visibly the **same size** as each other, and the same size as
      the character's other sheets.
- [ ] No figure touches another.
- [ ] No text, numbers or registration marks anywhere.
- [ ] No shadow or ground ellipse baked in (the game draws its own).
- [ ] Facing is consistent within the sheet.

## What breaks if you skip this

Every one of these has happened in this project:

| Symptom in the game | Cause on the sheet |
| --- | --- |
| Character changes size between poses | poses drawn a few percent apart; or one sheet 20% larger than another |
| Legs cut off, poses collide mid-dissolve | figures taller than the row pitch, so a cell crop lops them |
| Grey squares on the character | painted checkerboard inside a pocket the keying can't reach |
| A prop pops in and out | held items differ between resting poses |
| Character shrinks when it starts walking | walk sheet drawn smaller than the resting sheet |
| Two characters fused into one sprite | figures touching, so they read as a single blob |
