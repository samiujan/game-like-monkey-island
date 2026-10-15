"""Clean sprite sheets: remove the leftover light background fringe, bleed the
sprite's own colours outward into transparent pixels, and give the silhouette a
soft anti-aliased edge.

Originals are in git (assets/**), so `git checkout assets` restores them.

    python3 tools/clean_sprites.py
"""
import glob
import os
import sys

from PIL import Image, ImageFilter

NEIGH8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def clean(path, out_path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    src = im.load()

    alpha = [[src[x, y][3] for x in range(w)] for y in range(h)]
    opaque = [[alpha[y][x] > 127 for x in range(w)] for y in range(h)]

    # core = opaque with every 8-neighbour also opaque (i.e. not on the silhouette)
    core = [[False] * w for _ in range(h)]
    for y in range(h):
        row, crow = opaque[y], core[y]
        for x in range(w):
            if not row[x]:
                continue
            ok = True
            for dx, dy in NEIGH8:
                xx, yy = x + dx, y + dy
                if not (0 <= xx < w and 0 <= yy < h) or not opaque[yy][xx]:
                    ok = False
                    break
            crow[x] = ok

    buf = [[list(src[x, y]) for x in range(w)] for y in range(h)]

    # 1. boundary pixels inherit the local interior colour, killing the fringe
    fixed = 0
    for y in range(h):
        for x in range(w):
            if not opaque[y][x] or core[y][x]:
                continue
            acc = [0, 0, 0]
            n = 0
            for r in (2, 3, 4):
                for dy in range(-r, r + 1):
                    for dx in range(-r, r + 1):
                        if max(abs(dx), abs(dy)) != r:
                            continue
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and core[yy][xx]:
                            p = buf[yy][xx]
                            acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]
                            n += 1
                if n >= 8:
                    break
            if n:
                buf[y][x][0] = acc[0] // n
                buf[y][x][1] = acc[1] // n
                buf[y][x][2] = acc[2] // n
                fixed += 1

    # 2. bleed colour outward so filtering never drags black into the edge
    for _ in range(4):
        for y in range(h):
            for x in range(w):
                if opaque[y][x]:
                    continue
                acc = [0, 0, 0]
                n = 0
                for dx, dy in NEIGH8:
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and opaque[yy][xx]:
                        p = buf[yy][xx]
                        acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]
                        n += 1
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

    # 3. soften the silhouette: blur alpha only, so the colour stays crisp
    a = out.getchannel('A').filter(ImageFilter.GaussianBlur(0.7))
    out.putalpha(a)

    out.save(out_path, format='PNG')
    return fixed


def main():
    files = sorted(glob.glob('assets/*/*.png'))
    if not files:
        print('no sprites found — run from the repo root', file=sys.stderr)
        return 1
    for path in files:
        tmp = path + '.tmp'
        fixed = clean(path, tmp)
        os.replace(tmp, path)
        print(f'{path:40s} edge pixels recoloured: {fixed}')
    print(f'\ncleaned {len(files)} sprites')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
