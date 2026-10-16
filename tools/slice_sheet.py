"""Slice an AI-generated sprite contact sheet into individual sprites.

The sheets arrive with a fake-transparency checkerboard *baked into the pixels*
(the model draws the checker rather than leaving real alpha). So the pipeline is:

  1. key the checker out by flood-filling from the image border, which leaves
     the enclosed white kurta / apron / cap of a figure untouched;
  2. split the resulting mask into rows by row-projection, then each row into
     columns by column-projection;
  3. crop each figure to its bounding box and write it out with real alpha;
  4. run the same edge clean-up as tools/clean_sprites.py so the silhouette has
     no fringe and anti-aliases cleanly.

    python3 tools/slice_sheet.py assets/_sheets/cook.png assets/cook
"""
import os
import sys
from collections import deque

from PIL import Image, ImageFilter

NEIGH4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
GAP = 5          # empty lines needed to call it a split
MARGIN = 2       # transparent padding kept around each crop


def is_background(p, tones, tol):
    r, g, b = p[0], p[1], p[2]
    for (tr, tg, tb) in tones:
        if abs(r - tr) <= tol and abs(g - tg) <= tol and abs(b - tb) <= tol:
            return True
    return False


def learn_tones(im, ring=10, iters=12):
    """Every sheet is the same trick — a two-tone checkerboard pretending to be
    transparency — but the exact tones differ per sheet (the grey runs from 160
    to 186), so k-means them off the border rather than hardcoding them."""
    w, h = im.size
    px = im.load()
    samples = []
    for x in range(w):
        for y in list(range(ring)) + list(range(h - ring, h)):
            samples.append(px[x, y])
    for y in range(h):
        for x in list(range(ring)) + list(range(w - ring, w)):
            samples.append(px[x, y])
    samples.sort(key=lambda p: p[0] + p[1] + p[2])
    dark = samples[max(0, len(samples) // 20)]
    light = samples[min(len(samples) - 1, len(samples) * 19 // 20)]
    cents = [list(dark), list(light)]
    for _ in range(iters):
        acc = [[0, 0, 0, 0], [0, 0, 0, 0]]
        for p in samples:
            d0 = sum((p[i] - cents[0][i]) ** 2 for i in range(3))
            d1 = sum((p[i] - cents[1][i]) ** 2 for i in range(3))
            k = 0 if d0 <= d1 else 1
            for i in range(3):
                acc[k][i] += p[i]
            acc[k][3] += 1
        for k in range(2):
            if acc[k][3]:
                cents[k] = [acc[k][i] // acc[k][3] for i in range(3)]
    cents.sort(key=lambda c: sum(c))
    return [tuple(c) for c in cents]


def key_checkerboard(im, tol=42):
    """Return a 2-D list of booleans: True where a figure pixel lives."""
    w, h = im.size
    px = im.load()
    tones = learn_tones(im)
    bg = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not bg[y][x] and is_background(px[x, y], tones, tol):
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not bg[y][x] and is_background(px[x, y], tones, tol):
                bg[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in NEIGH4:
            xx, yy = x + dx, y + dy
            if 0 <= xx < w and 0 <= yy < h and not bg[yy][xx] and is_background(px[xx, yy], tones, tol):
                bg[yy][xx] = True
                q.append((xx, yy))

    # Second pass: a sitting monkey's curled tail can enclose a patch of
    # checkerboard with no path to the border, so the flood fill above leaves
    # it opaque and it shows through the figure. Catch those on a much tighter
    # colour match, which the checkerboard passes exactly and a monkey's pale
    # belly does not.
    tight = max(10, int(tol * 0.7))
    for y in range(h):
        row = bg[y]
        for x in range(w):
            if not row[x] and is_background(px[x, y], tones, tight):
                row[x] = True
    return [[not bg[y][x] for x in range(w)] for y in range(h)]


def has_real_alpha(im):
    """True when the sheet carries genuine transparency rather than a drawn
    checkerboard. Nothing to key in that case: the alpha channel already says
    exactly where the figures are."""
    if im.mode != 'RGBA':
        return False
    return im.getchannel('A').getextrema()[0] < 250


def mask_from_alpha(im, thresh=128):
    w, h = im.size
    a = im.getchannel('A').load()
    return [[a[x, y] > thresh for x in range(w)] for y in range(h)]


def runs(flags, gap=GAP):
    """Split a boolean list into [(start, end)] runs, ignoring short gaps."""
    out, start, blanks = [], None, 0
    for i, v in enumerate(flags):
        if v:
            if start is None:
                start = i
            blanks = 0
        elif start is not None:
            blanks += 1
            if blanks >= gap:
                out.append((start, i - blanks + 1))
                start, blanks = None, 0
    if start is not None:
        out.append((start, len(flags) - blanks))
    return out


def despeckle(mask, w, h, min_px=60):
    """drop floating specks left by compression noise"""
    seen = [[False] * w for _ in range(h)]
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0][x0] or seen[y0][x0]:
                continue
            comp, q = [], deque([(x0, y0)])
            seen[y0][x0] = True
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in NEIGH4:
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and mask[yy][xx] and not seen[yy][xx]:
                        seen[yy][xx] = True
                        q.append((xx, yy))
            if len(comp) < min_px:
                for x, y in comp:
                    mask[y][x] = False
    return mask


def soften(im):
    """same treatment tools/clean_sprites.py gives the hand-made sheets"""
    w, h = im.size
    px = im.load()
    alpha = [[px[x, y][3] for x in range(w)] for y in range(h)]
    opaque = [[alpha[y][x] > 127 for x in range(w)] for y in range(h)]
    core = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if not opaque[y][x]:
                continue
            ok = True
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if not (0 <= xx < w and 0 <= yy < h) or not opaque[yy][xx]:
                        ok = False
                        break
                if not ok:
                    break
            core[y][x] = ok
    buf = [[list(px[x, y]) for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if not opaque[y][x] or core[y][x]:
                continue
            acc = [0, 0, 0]; n = 0
            for r in (2, 3, 4):
                for dy in range(-r, r + 1):
                    for dx in range(-r, r + 1):
                        if max(abs(dx), abs(dy)) != r:
                            continue
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and core[yy][xx]:
                            p = buf[yy][xx]
                            acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; n += 1
                if n >= 8:
                    break
            if n:
                buf[y][x][0] = acc[0] // n
                buf[y][x][1] = acc[1] // n
                buf[y][x][2] = acc[2] // n
    for _ in range(4):
        for y in range(h):
            for x in range(w):
                if opaque[y][x]:
                    continue
                acc = [0, 0, 0]; n = 0
                for dx, dy in ((-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and opaque[yy][xx]:
                        p = buf[yy][xx]
                        acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; n += 1
                if n:
                    buf[y][x][0] = acc[0] // n
                    buf[y][x][1] = acc[1] // n
                    buf[y][x][2] = acc[2] // n
    out = Image.new('RGBA', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            p = buf[y][x]
            op[x, y] = (p[0], p[1], p[2], 255 if opaque[y][x] else 0)
    out.putalpha(out.getchannel('A').filter(ImageFilter.GaussianBlur(0.6)))
    return out


def components(mask, w, h, min_px=900):
    """8-connected components, dropping anything smaller than min_px."""
    seen = [[False] * w for _ in range(h)]
    boxes = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy][sx] or seen[sy][sx]:
                continue
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            x0 = x1 = sx
            y0 = y1 = sy
            area = 0
            while q:
                x, y = q.popleft()
                area += 1
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and mask[yy][xx] and not seen[yy][xx]:
                            seen[yy][xx] = True
                            q.append((xx, yy))
            if area >= min_px:
                boxes.append([x0, y0, x1, y1, area])
    return boxes


def cluster(boxes, gap):
    """Merge boxes within `gap` of each other: a figure and the prop it holds
    arrive as separate components, whereas the crosshair marks do not."""
    boxes = [list(b) for b in boxes]
    changed = True
    while changed:
        changed = False
        out = []
        while boxes:
            b = boxes.pop()
            for o in out:
                if (b[0] <= o[2] + gap and b[2] >= o[0] - gap and
                        b[1] <= o[3] + gap and b[3] >= o[1] - gap):
                    o[0] = min(o[0], b[0]); o[1] = min(o[1], b[1])
                    o[2] = max(o[2], b[2]); o[3] = max(o[3], b[3])
                    o[4] += b[4]
                    changed = True
                    break
            else:
                out.append(b)
        boxes = out
    return boxes


def order_rows(boxes, min_overlap=0.35):
    """Group boxes into visual rows, each row sorted left to right."""
    rows = []
    for b in sorted(boxes, key=lambda b: b[1]):
        for row in rows:
            ry0 = min(o[1] for o in row)
            ry1 = max(o[3] for o in row)
            overlap = min(b[3], ry1) - max(b[1], ry0)
            if overlap > min_overlap * min(b[3] - b[1], ry1 - ry0):
                row.append(b)
                break
        else:
            rows.append([b])
    return [sorted(r, key=lambda b: b[0]) for r in rows]


def slice_sheet(src, out_dir, min_px=400, gap=1, comp_px=900):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if has_real_alpha(im):
        mask = mask_from_alpha(im)
    else:
        mask = key_checkerboard(im)
    # Each figure is already its own component: clustering was an active
    # liability, because a long tail makes one figure's bounding box overlap
    # its neighbour's and the merge chain then swallows the whole sheet. The
    # generator's crosshair specks are dropped by the min_px floor instead.
    boxes = components(mask, w, h, comp_px)

    os.makedirs(out_dir, exist_ok=True)
    made = []
    for r, row in enumerate(order_rows(boxes)):
        for c, (x0, y0, x1, y1, _area) in enumerate(row):
            bx0, bx1 = max(0, x0 - MARGIN), min(w, x1 + 1 + MARGIN)
            by0, by1 = max(0, y0 - MARGIN), min(h, y1 + 1 + MARGIN)
            if (bx1 - bx0) * (by1 - by0) < min_px:
                continue
            crop = im.crop((bx0, by0, bx1, by1)).convert('RGBA')
            cp = crop.load()
            cw, ch = crop.size
            for y in range(ch):
                for x in range(cw):
                    pr, pg, pb, _ = cp[x, y]
                    cp[x, y] = (pr, pg, pb, 255 if mask[by0 + y][bx0 + x] else 0)
            crop = soften(crop)
            name = f'{os.path.basename(src)[:-4]}_r{r}c{c}.png'
            crop.save(os.path.join(out_dir, name), format='PNG')
            made.append((name, crop.size))
    return made


def slice_grid(src, out_dir, cols, rows, min_px=1500):
    """Slice a sheet that is already a regular grid.

    Component hunting is the right tool for a loose contact sheet, but a
    tidy 4x4 wants nothing clever: take each cell, keep its largest opaque
    blob (which drops printed frame numbers and stray specks), and crop to it.
    """
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    mask = mask_from_alpha(im) if has_real_alpha(im) else key_checkerboard(im)
    os.makedirs(out_dir, exist_ok=True)
    made = []
    cw, ch = w / cols, h / rows
    for r in range(rows):
        for c in range(cols):
            x0, y0 = int(c * cw), int(r * ch)
            x1, y1 = int((c + 1) * cw), int((r + 1) * ch)
            sub = [[mask[y][x] for x in range(x0, x1)] for y in range(y0, y1)]
            comps = components(sub, x1 - x0, y1 - y0, min_px)
            if not comps:
                continue
            big = max(comps, key=lambda b: b[4])
            crop = im.crop((x0 + big[0], y0 + big[1], x0 + big[2] + 1, y0 + big[3] + 1))
            crop = soften(crop)
            name = f'{os.path.basename(src)[:-4]}_r{r}c{c}.png'
            crop.save(os.path.join(out_dir, name), format='PNG')
            made.append((name, crop.size))
    return made


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    if len(sys.argv) > 4 and sys.argv[3] == 'grid':
        made = slice_grid(sys.argv[1], sys.argv[2], int(sys.argv[4]),
                          int(sys.argv[5]) if len(sys.argv) > 5 else int(sys.argv[4]))
    else:
        comp_px = int(sys.argv[3]) if len(sys.argv) > 3 else 900
        made = slice_sheet(sys.argv[1], sys.argv[2], comp_px=comp_px)
    for name, size in made:
        print(f'  {name:24s} {size[0]}x{size[1]}')
    print(f'{len(made)} sprites -> {sys.argv[2]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
