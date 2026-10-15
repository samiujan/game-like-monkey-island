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
GARDENER = {
    'g-pose-0': 'gardener_r2c2',   # standing with the watering can
}
COOK = {
    'cook-idle': 'cook_r1c8',      # hands at the apron strings
}
MONKEY = {
    'monkey-0': 'monkey_r1c6',   # sitting
    'monkey-1': 'monkey_r1c3',   # cross-legged with a book
    'monkey-2': 'monkey_r0c0',   # walking
}
PEACOCK = {
    'peacock-side': 'peacock_r0c0',     # before he is distracted
    'peacock-display': 'peacock_r1c0',  # after: tail up, showing off
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


def normalise(paths, pad=2):
    """Bottom-align and centre each frame, keeping its native size.

    Deliberately no rescaling: within one sheet the generator already draws every
    figure at the same scale, and forcing a common height would blow a seated
    monkey up to the size of a walking one."""
    out = {}
    for p in paths:
        im = Image.open(p).convert('RGBA')
        bb, (cx, _cy) = bbox_and_centroid(im)
        if bb is None:
            raise SystemExit(f'{p} is empty')
        crop = im.crop(bb)
        off = cx - bb[0]
        half = max(off, crop.size[0] - off) + pad
        w = int(round(half * 2))
        canvas = Image.new('RGBA', (w, crop.size[1]), (0, 0, 0, 0))
        canvas.alpha_composite(crop, (int(round(half - off)), 0))
        out[p] = canvas
    return out


def place(sheet, mapping, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    srcs = {dest: f'assets/_frames/{sheet}/{frame}.png' for dest, frame in mapping.items()}
    for dest, src in srcs.items():
        if not os.path.exists(src):
            raise SystemExit(f'missing source frame: {src}')
    norm = normalise(list(srcs.values()))
    for dest, src in srcs.items():
        norm[src].save(os.path.join(out_dir, dest + '.png'), format='PNG')
        print(f'  {dest:16s} <- {os.path.basename(src):20s} {norm[src].size[0]}x{norm[src].size[1]}')


def main():
    print('prince   -> assets/prince')
    place('prince', PRINCE, 'assets/prince')
    # the art only faces one way, so idle-left is the mirror of idle-right
    src = 'assets/_frames/prince/prince_r1c2.png'
    mirror = normalise([src])[src].transpose(Image.FLIP_LEFT_RIGHT)
    mirror.save('assets/prince/pose-3.png', format='PNG')
    print(f'  {"pose-3":16s} <- mirrored prince_r1c2   {mirror.size[0]}x{mirror.size[1]}')

    print('gardener -> assets/gardener')
    place('gardener', GARDENER, 'assets/gardener')
    print('cook     -> assets/cook')
    place('cook', COOK, 'assets/cook')
    print('monkey   -> assets/monkey')
    place('monkey', MONKEY, 'assets/monkey')
    print('peacock  -> assets/peacock')
    place('peacock', PEACOCK, 'assets/peacock')

    for stale in ['g-pose-1', 'g-pose-2', 'g-pose-3', 'g-pose-4', 'g-pose-5',
                  'g-walk-0', 'g-walk-1', 'g-walk-2', 'g-walk-4', 'g-walk-5']:
        p = f'assets/gardener/{stale}.png'
        if os.path.exists(p):
            os.remove(p)
            print(f'  removed stale {p}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
