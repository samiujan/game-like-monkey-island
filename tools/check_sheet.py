"""Check that a sprite sheet is actually usable before wiring it into the game.

    python3 tools/check_sheet.py assets/_sheets/gardener-c.png

Reports the things that have silently broken sheets on this project: a painted
checkerboard instead of real transparency, figures clipped or fused together,
poses drawn at different sizes, and leftover text or registration marks.
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_sheet import (components, has_real_alpha, key_checkerboard, learn_tones)  # noqa: E402

OK, WARN, BAD = 'ok  ', 'warn', 'BAD '


def head_width(mask, box):
    """Width of the topmost sliver of a figure -- a pose-independent proxy for
    how large it was drawn."""
    x0, y0, x1, y1 = box[0], box[1], box[2], box[3]
    band = max(1, int((y1 - y0) * 0.12))
    xs = [x for y in range(y0, min(y0 + band, y1)) for x in range(x0, x1 + 1) if mask[y][x]]
    return (max(xs) - min(xs) + 1) if xs else 0


def check(path):
    im = Image.open(path)
    rgb = im.convert('RGB')
    w, h = im.size
    rows = []

    # --- background ------------------------------------------------------
    if has_real_alpha(im):
        rows.append((OK, 'real transparency — nothing to key', ''))
        mask = None
    else:
        tones = learn_tones(rgb)
        spread = sum(abs(tones[0][i] - tones[1][i]) for i in range(3)) / 3
        if spread > 18:
            rows.append((WARN, 'painted checkerboard background',
                         'must be keyed; grey squares can sit close to the art'))
        else:
            rows.append((OK, 'single flat background colour',
                         f'~{tones[0]} — easy to key'))
        mask = None

    if mask is None:
        mask = key_checkerboard(rgb) if not has_real_alpha(im) else None
    if mask is None:
        from slice_sheet import mask_from_alpha
        mask = mask_from_alpha(im)

    # --- figures ---------------------------------------------------------
    comps = components(mask, w, h, 900)
    if not comps:
        rows.append((BAD, 'no figures found', 'keying probably failed'))
        return w, h, rows, comps

    hs = sorted(c[3] - c[1] for c in comps)
    med = hs[len(hs) // 2]
    lo, hi = hs[0], hs[-1]
    spread_pct = 100.0 * (hi - lo) / med if med else 0
    rows.append((OK if len(comps) > 3 else WARN, f'{len(comps)} figures found',
                 f'heights {lo}-{hi}, median {med}'))

    # Bounding-box height is a poor scale test on its own: an arm raised over
    # the head inflates it without the figure being any bigger. The width of
    # the top sliver -- the head, or the turban on a figure wearing one -- is
    # pose-independent, so it is the real tell for "drawn at a different size".
    heads = sorted(head_width(mask, c) for c in comps)
    hmed = heads[len(heads) // 2]
    hspread = 100.0 * (heads[-1] - heads[0]) / hmed if hmed else 0
    if hspread > 20:
        rows.append((WARN, f'head sizes vary {hspread:.0f}%',
                     'roughly the scale the figures were drawn at — but a head '
                     'turned to profile is also narrower than one facing you, so '
                     'compare same-facing figures before believing it'))
    elif hspread > 9:
        rows.append((WARN, f'head sizes vary {hspread:.0f}%',
                     'check same-facing figures: this is either scale drift or '
                     'just head rotation'))
    else:
        rows.append((OK, f'head sizes consistent ({hspread:.0f}% spread)',
                     'figures are drawn at one scale'))

    if spread_pct > 25:
        rows.append((WARN, f'figure heights vary {spread_pct:.0f}%',
                     'expected if the set mixes sitting and standing; otherwise '
                     'check the head spread above'))
    elif spread_pct > 8 and hspread <= 9:
        rows.append((OK, f'height varies {spread_pct:.0f}% but scale is constant',
                     'raised arms or a different pose, not a size change'))
    elif spread_pct > 8:
        rows.append((WARN, f'figure heights vary {spread_pct:.0f}%', ''))
    else:
        rows.append((OK, f'figure heights consistent ({spread_pct:.0f}% spread)', ''))

    # --- clipped or fused -------------------------------------------------
    edge = [c for c in comps if c[0] <= 1 or c[1] <= 1 or c[2] >= w - 2 or c[3] >= h - 2]
    if edge:
        rows.append((WARN, f'{len(edge)} figure(s) touch the sheet edge',
                     'they may be clipped'))
    else:
        rows.append((OK, 'no figure runs off the sheet edge', ''))

    wide = [c for c in comps
            if (c[2] - c[0]) > 2.2 * (c[3] - c[1]) and (c[3] - c[1]) > med * 0.5]
    if wide:
        rows.append((WARN, f'{len(wide)} suspiciously wide blob(s)',
                     'two figures may have merged — check for touching figures'))
    else:
        rows.append((OK, 'no merged figures detected', ''))

    # --- stray marks ------------------------------------------------------
    small = [c for c in comps if c[4] < 0.12 * (med * med * 0.25)]
    tiny = len([c for c in comps if (c[3] - c[1]) < med * 0.25])
    if tiny:
        rows.append((WARN, f'{tiny} component(s) far shorter than a figure',
                     'probably printed numbers, labels or registration marks'))
    else:
        rows.append((OK, 'no text-like or marker components', ''))
    _ = small

    return w, h, rows, comps


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    bad = 0
    for path in sys.argv[1:]:
        w, h, rows, _ = check(path)
        print(f'\n{os.path.basename(path)}  ({w}x{h})')
        for level, msg, extra in rows:
            if level == BAD:
                bad += 1
            mark = {'ok  ': '  ok  ', 'warn': ' warn ', 'BAD ': ' BAD  '}[level]
            print(f'  [{mark}] {msg}' + (f'\n           {extra}' if extra else ''))
    print('\nNOTE: this checks ONE sheet. It cannot see whether a character\'s')
    print('other sheets are drawn at the same scale — compare their median')
    print('figure heights by hand, or run this on each and compare.')
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main())
