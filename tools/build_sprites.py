"""Map the sliced contact-sheet frames onto the filenames the game loads.

Each figure on an AI contact sheet is drawn at a slightly different position and
size inside its cell, so frames are normalised onto a common canvas first:
scaled to a shared height, bottom-aligned on the ground, and centred on the
figure's own centre of mass (not its bounding box, which swings about with a
held prop). Without that the Prince jitters sideways as he walks.

Run after tools/slice_sheet.py has produced assets/_frames/<name>/.

    python3 tools/build_sprites.py
"""
import os
import shutil

from PIL import Image

# slot -> source frame in assets/_frames/<sheet>/
PRINCE = {
    'walk-0': 'prince_r0c0', 'walk-1': 'prince_r0c1', 'walk-2': 'prince_r0c2',
    'walk-3': 'prince_r0c3', 'walk-4': 'prince_r0c4',
    'pose-0': 'prince_r1c0',   # facing the viewer
    'pose-1': 'prince_r1c1',   # facing the viewer, other arm
    'pose-2': 'prince_r1c2',   # three-quarter, facing right
    'pose-4': 'prince_r1c4',   # back, mid-step
    'pose-6': 'prince_r1c5',   # back, standing
}
# the second (and third) frame of each set is the idle fidget the character
# dissolves into and back out of, so they must share a body type
GARDENER = {
    'g-pose-0': 'gardener-a_r0c2',   # arms open, welcoming
    'g-pose-1': 'gardener-a_r3c0',   # hand to the chin
    'g-pose-2': 'gardener-a_r0c0',   # thumbs up
}
COOK = {
    # the resting set is picked from the prop-free half of the sheet: the game
    # cross-dissolves between these, so a bowl or a spoon in one pose and not
    # the next would pop in and out of his hands
    'cook-idle': 'cook_r1c3',      # hands clasped
    'cook-idle-1': 'cook_r1c0',    # hand to his chin
    'cook-idle-2': 'cook_r3c3',    # arms open
}
MONKEY = {
    'monkey-0': 'monkey_r2c0',    # sitting
    'monkey-0b': 'monkey_r2c2',
    'monkey-1': 'monkey_r2c1',    # sitting, arms crossed
    'monkey-1b': 'monkey_r2c3',
    'monkey-2': 'monkey_r3c0',    # on all fours
    'monkey-2b': 'monkey_r3c4',
}
GARDENER_WALK = {
    'g-walk-0': 'gardener-c_r0c0',
    'g-walk-1': 'gardener-c_r0c1',
    'g-walk-2': 'gardener-c_r0c2',
    'g-walk-3': 'gardener-c_r0c3',
    'g-walk-4': 'gardener-c_r1c0',
    'g-walk-5': 'gardener-c_r1c1',
    'g-walk-6': 'gardener-c_r1c2',
    'g-walk-7': 'gardener-c_r1c3',
    'g-walk-8': 'gardener-c_r2c0',
    'g-walk-9': 'gardener-c_r2c1',
    'g-walk-10': 'gardener-c_r2c2',
    'g-walk-11': 'gardener-c_r2c3',
    'g-walk-12': 'gardener-c_r3c0',
    'g-walk-13': 'gardener-c_r3c1',
    'g-walk-14': 'gardener-c_r3c2',
    'g-walk-15': 'gardener-c_r3c3'
}
COOK_WALK = {
    'cook-walk-0': 'cook-walk_r0c0',
    'cook-walk-1': 'cook-walk_r0c1',
    'cook-walk-2': 'cook-walk_r0c2',
    'cook-walk-3': 'cook-walk_r0c3',
    'cook-walk-4': 'cook-walk_r1c0',
    'cook-walk-5': 'cook-walk_r1c1',
    'cook-walk-6': 'cook-walk_r1c2',
    'cook-walk-7': 'cook-walk_r1c3',
    'cook-walk-8': 'cook-walk_r2c0',
    'cook-walk-9': 'cook-walk_r2c1',
    'cook-walk-10': 'cook-walk_r2c2',
    'cook-walk-11': 'cook-walk_r2c3',
    'cook-walk-12': 'cook-walk_r3c0',
    'cook-walk-13': 'cook-walk_r3c1',
    'cook-walk-14': 'cook-walk_r3c2',
    'cook-walk-15': 'cook-walk_r3c3'
}
MONKEY_WALK = {
    'monkey-walk-0': 'monkey_r0c0', 'monkey-walk-1': 'monkey_r0c1',
    'monkey-walk-2': 'monkey_r0c2', 'monkey-walk-3': 'monkey_r0c3',
    'monkey-walk-4': 'monkey_r0c6',
}
PEACOCK_WALK = {
    'peacock-walk-0': 'peacock_r0c0', 'peacock-walk-1': 'peacock_r0c1',
    'peacock-walk-2': 'peacock_r0c2', 'peacock-walk-3': 'peacock_r0c3',
    'peacock-walk-4': 'peacock_r0c4',
}
PEACOCK = {
    'peacock-side': 'peacock_r0c0',      # before he is distracted
    'peacock-side-2': 'peacock_r2c1',    # ...and the preen
    'peacock-display': 'peacock_r1c0',   # after: tail up, showing off
    'peacock-display-2': 'peacock_r2c0',
}


def bbox_and_centroid(im):
    mask = im.getchannel('A').point(lambda v: 255 if v > 127 else 0)
    bb = mask.getbbox()
    if not bb:
        return None, None
    px = mask.load()
    sx = sy = n = 0
    for y in range(bb[1], bb[3]):
        for x in range(bb[0], bb[2]):
            if px[x, y]:
                sx += x; sy += y; n += 1
    return bb, (sx / n, sy / n)


def normalise(paths, pad=2, scale=1.0, fit=None):
    """Bottom-align and centre each frame, optionally rescaling it.

    `scale` multiplies every frame in the group equally, which keeps whatever
    variation the artist drew (a walk cycle's bob, a seated monkey being
    shorter). `fit` instead forces each frame to one height, for a set of poses
    that are all the same figure standing and must not change size between
    them — these sheets do draw some poses a few percent small.
    """
    out = {}
    for p in paths:
        im = Image.open(p).convert('RGBA')
        bb, (cx, _cy) = bbox_and_centroid(im)
        if bb is None:
            raise SystemExit(f'{p} is empty')
        crop = im.crop(bb)
        factor = scale
        if fit:
            factor = fit / crop.size[1]
        if abs(factor - 1.0) > 1e-3:
            nw = max(1, round(crop.size[0] * factor))
            nh = max(1, round(crop.size[1] * factor))
            crop = crop.resize((nw, nh), Image.LANCZOS)
            cx = cx * factor
        off = cx - bb[0] * factor
        half = max(off, crop.size[0] - off) + pad
        w = int(round(half * 2))
        canvas = Image.new('RGBA', (w, crop.size[1]), (0, 0, 0, 0))
        canvas.alpha_composite(crop, (int(round(half - off)), 0))
        out[p] = canvas
    return out


def heights(paths):
    hs = []
    for p in paths:
        bb, _ = bbox_and_centroid(Image.open(p).convert('RGBA'))
        if bb:
            hs.append(bb[3] - bb[1])
    hs.sort()
    return hs


def median_height(paths):
    hs = heights(paths)
    return hs[len(hs) // 2] if hs else 0


def place(sheet, mapping, out_dir, scale=1.0, fit=None):
    os.makedirs(out_dir, exist_ok=True)
    srcs = {dest: f'assets/_frames/{sheet}/{frame}.png' for dest, frame in mapping.items()}
    for dest, src in srcs.items():
        if not os.path.exists(src):
            raise SystemExit(f'missing source frame: {src}')
    norm = normalise(list(srcs.values()), scale=scale, fit=fit)
    for dest, src in srcs.items():
        norm[src].save(os.path.join(out_dir, dest + '.png'), format='PNG')
        print(f'  {dest:16s} <- {os.path.basename(src):20s} {norm[src].size[0]}x{norm[src].size[1]}')


def character(out_dir, idle, walk=None, pose=None, same_body=True):
    """Lay out one character's sprite sets at a common scale.

    The sheets draw the same character at different sizes -- the gesture sheet
    is about 20% larger than the walk sheet -- so each set is normalised against
    the *smallest* set's median height. Scaling down rather than up: the figures
    render at around 130px, so there is resolution to spare, and shrinking
    cannot introduce the softness that enlarging would.
    """
    pi = [f'assets/_frames/{idle[0]}/{f}.png' for f in idle[1].values()]
    meds = [median_height(pi)]
    if walk:
        pw = [f'assets/_frames/{walk[0]}/{f}.png' for f in walk[1].values()]
        meds.append(median_height(pw))
    if pose:
        pp = [f'assets/_frames/{pose[0]}/{f}.png' for f in pose[1].values()]
        meds.append(median_height(pp))
    target = min(m for m in meds if m)

    # The resting set is usually forced to one height, so a character cannot
    # change size between poses that are all the same figure standing. A set
    # that deliberately includes sitting poses opts out and is scaled as a
    # group instead, which keeps a seated monkey shorter than a standing one.
    if same_body:
        place(idle[0], idle[1], out_dir, fit=target)
    else:
        pi2 = [f'assets/_frames/{idle[0]}/{f}.png' for f in idle[1].values()]
        place(idle[0], idle[1], out_dir, scale=target / median_height(pi2))
    if walk:
        pw = [f'assets/_frames/{walk[0]}/{f}.png' for f in walk[1].values()]
        place(walk[0], walk[1], out_dir, scale=target / median_height(pw))
    if pose:
        pp = [f'assets/_frames/{pose[0]}/{f}.png' for f in pose[1].values()]
        place(pose[0], pose[1], out_dir, scale=target / median_height(pp))


def main():
    print('prince   -> assets/prince')
    place('prince', PRINCE, 'assets/prince')
    # the art only faces one way, so idle-left is the mirror of idle-right
    src = 'assets/_frames/prince/prince_r1c2.png'
    mirror = normalise([src])[src].transpose(Image.FLIP_LEFT_RIGHT)
    mirror.save('assets/prince/pose-3.png', format='PNG')
    print(f'  {"pose-3":16s} <- mirrored prince_r1c2   {mirror.size[0]}x{mirror.size[1]}')

    print('gardener -> assets/gardener')
    # the previous gardener sheet left frames behind under the same names
    for old in __import__('glob').glob('assets/gardener/*.png'):
        __import__('os').remove(old)
    character('assets/gardener', ('gardener-a', GARDENER), ('gardener-c', GARDENER_WALK))
    print('cook     -> assets/cook')
    character('assets/cook', ('cook', COOK), ('cook-walk', COOK_WALK))
    print('monkey   -> assets/monkey')
    # the monkey's resting poses include sitting down, so they are NOT forced
    # to a single height: a seated monkey is supposed to be shorter
    character('assets/monkey', ('monkey', MONKEY), ('monkey', MONKEY_WALK), same_body=False)
    print('peacock  -> assets/peacock')
    place('peacock', PEACOCK, 'assets/peacock')
    place('peacock', PEACOCK_WALK, 'assets/peacock')

    for stale in ['g-pose-3', 'g-pose-4', 'g-pose-5']:
        p = f'assets/gardener/{stale}.png'
        if os.path.exists(p):
            os.remove(p)
            print(f'  removed stale {p}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
