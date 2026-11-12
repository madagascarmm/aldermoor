#!/usr/bin/env python3
"""Genera assets/tilesets/tiles.png y tools/tiles_index.json.

Tiles de 64 px pintados de forma procedural (texturas sin costuras) y
autotiles de borde tipo "blob" (47 variantes por pareja de terrenos).
El tileset lleva 1 px de margen y 2 px de separación (bordes extruidos)
para que no aparezcan líneas entre tiles al escalar.
"""
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'tilesets')
TS = 64          # tamaño final del tile
SS = 2           # supermuestreo
T = TS * SS
COLS = 16


# ---------------------------------------------------------------- utilidades
def vnoise(seed, cells=3, octaves=3, size=T):
    """Ruido de valor sin costuras en [0,1]."""
    rng = np.random.default_rng(seed)
    out = np.zeros((size, size), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = cells * 2 ** o
        g = np.tile(rng.random((n, n)).astype(np.float32), (3, 3))
        im = Image.fromarray(g).resize((3 * size, 3 * size), Image.BICUBIC)
        out += np.asarray(im)[size:2 * size, size:2 * size] * amp
        tot += amp
        amp *= 0.5
    return np.clip(out / tot, 0, 1)


def wrap(fn, x, y):
    for ox in (-T, 0, T):
        for oy in (-T, 0, T):
            fn(x + ox, y + oy)


def tex(base, seed, amp=0.12, cells=3, details=None):
    n = vnoise(seed, cells)
    arr = np.zeros((T, T, 3), np.float32)
    for i in range(3):
        arr[..., i] = base[i] * (1 + amp * (n - 0.5) * 2)
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGB')
    if details:
        details(ImageDraw.Draw(im), random.Random(seed))
    return np.asarray(im).astype(np.float32)


def shade(c, k):
    return tuple(int(max(0, min(255, v * k))) for v in c)


# ---------------------------------------------------------------- detalles
def d_grass(light, dark, flowers=False, leaves=False, n=90):
    def f(d, r):
        for _ in range(n):
            x, y = r.uniform(0, T), r.uniform(0, T)
            l = r.uniform(5, 12)
            dx = r.uniform(-3, 3)
            col = r.choice([light, dark, light])
            wrap(lambda X, Y: d.line([(X, Y), (X + dx, Y - l)], fill=col, width=2), x, y)
        if leaves:
            for _ in range(9):
                x, y = r.uniform(0, T), r.uniform(0, T)
                col = r.choice([(120, 96, 52), (96, 78, 48), (70, 100, 62)])
                a, b = r.uniform(3, 5), r.uniform(1.5, 2.5)
                wrap(lambda X, Y: d.ellipse([X - a, Y - b, X + a, Y + b], fill=col), x, y)
        if flowers:
            for _ in range(7):
                x, y = r.uniform(8, T - 8), r.uniform(8, T - 8)
                col = r.choice([(236, 226, 200), (226, 190, 96), (170, 140, 210)])
                for k in range(5):
                    a = k * math.tau / 5
                    px, py = x + math.cos(a) * 3.2, y + math.sin(a) * 3.2
                    d.ellipse([px - 2.4, py - 2.4, px + 2.4, py + 2.4], fill=col)
                d.ellipse([x - 1.8, y - 1.8, x + 1.8, y + 1.8], fill=(210, 150, 60))
    return f


def d_path(d, r):
    for _ in range(60):
        x, y = r.uniform(0, T), r.uniform(0, T)
        s = r.uniform(0.8, 1.8)
        col = r.choice([(128, 102, 70), (170, 142, 100), (118, 96, 68)])
        wrap(lambda X, Y: d.ellipse([X - s, Y - s, X + s, Y + s], fill=col), x, y)
    for _ in range(7):
        x, y = r.uniform(0, T), r.uniform(0, T)
        a, b = r.uniform(3, 6), r.uniform(2, 4)
        col = r.choice([(132, 124, 112), (112, 104, 96)])
        def peb(X, Y):
            d.ellipse([X - a, Y - b + 1.5, X + a, Y + b + 1.5], fill=(104, 82, 56))
            d.ellipse([X - a, Y - b, X + a, Y + b], fill=col)
            d.ellipse([X - a * .5, Y - b * .6, X + a * .1, Y - b * .1], fill=shade(col, 1.18))
        wrap(peb, x, y)


def d_water(d, r):
    for _ in range(11):
        x, y = r.uniform(0, T), r.uniform(0, T)
        w = r.uniform(10, 26)
        col = r.choice([(92, 150, 172), (70, 128, 156), (120, 176, 190)])
        wrap(lambda X, Y: d.arc([X - w, Y - 4, X + w, Y + 4], 200, 340, fill=col, width=2), x, y)


def d_speck(cols, n=120, smax=1.6):
    def f(d, r):
        for _ in range(n):
            x, y = r.uniform(0, T), r.uniform(0, T)
            s = r.uniform(0.6, smax)
            col = r.choice(cols)
            wrap(lambda X, Y: d.ellipse([X - s, Y - s, X + s, Y + s], fill=col), x, y)
    return f


# ---------------------------------------------------------------- autotile
BITS = dict(N=1, E=2, S=4, W=8, NE=16, SE=32, SW=64, NW=128)


def canon(m):
    """Las diagonales solo cuentan si los dos lados contiguos NO son borde."""
    for dg, a, b in (('NE', 'N', 'E'), ('SE', 'S', 'E'), ('SW', 'S', 'W'), ('NW', 'N', 'W')):
        if m & BITS[dg] and (m & BITS[a] or m & BITS[b]):
            m &= ~BITS[dg]
    return m


CANON = sorted({canon(m) for m in range(256)})   # 47 variantes

yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
xx = (xx + 0.5) / T
yy = (yy + 0.5) / T


def field(m):
    INF = np.full((T, T), 9.0, np.float32)
    dn = yy if m & 1 else INF
    de = 1 - xx if m & 2 else INF
    ds = 1 - yy if m & 4 else INF
    dw = xx if m & 8 else INF
    dx, dy = np.minimum(dw, de), np.minimum(dn, ds)
    r = 0.5
    d = r - np.hypot(np.clip(r - dx, 0, None), np.clip(r - dy, 0, None))
    if m & 16: d = np.minimum(d, np.maximum(1 - xx, yy))
    if m & 32: d = np.minimum(d, np.maximum(1 - xx, 1 - yy))
    if m & 64: d = np.minimum(d, np.maximum(xx, 1 - yy))
    if m & 128: d = np.minimum(d, np.maximum(xx, yy))
    return d


def smooth(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)


WOB = vnoise(777, cells=4, octaves=2)


def blend(A, B, m, kind, e=0.17):
    """A = terreno exterior, B = terreno propio; m = máscara de bordes."""
    d = field(m) + (WOB - 0.5) * 0.11
    k = smooth((d - e) / 0.035)[..., None]
    out = A * (1 - k) + B * k
    if kind == 'path':
        rim = np.exp(-((d - e) / 0.03) ** 2)[..., None]
        out = out * (1 - 0.30 * rim)
    elif kind == 'water':
        sand = np.array([172, 156, 110], np.float32)
        band = (smooth((d - (e - 0.11)) / 0.03) * (1 - smooth((d - e) / 0.03)))[..., None]
        out = out * (1 - band) + sand * band
        dark = np.exp(-((d - (e - 0.12)) / 0.025) ** 2)[..., None]
        out = out * (1 - 0.22 * dark)
        foam = np.exp(-((d - (e + 0.035)) / 0.022) ** 2)[..., None]
        out = out * (1 - 0.75 * foam) + np.array([206, 228, 226], np.float32) * 0.75 * foam
        deep = smooth((d - e) / 0.30)[..., None]
        out = out * (1 - 0.16 * deep * k)
    elif kind == 'forest':
        rim = np.exp(-((d - e) / 0.05) ** 2)[..., None]
        out = out * (1 - 0.10 * rim)
    return out


# ---------------------------------------------------------------- piezas de piedra
def slabs(seed, base, mortar, n=2, jitter=0.10, rad=5, cracks=0):
    r = random.Random(seed)
    im = Image.new('RGB', (T, T), mortar)
    d = ImageDraw.Draw(im)
    s = T / n
    g = 2.5
    for j in range(n):
        for i in range(n):
            c = shade(base, 1 + r.uniform(-jitter, jitter))
            x0, y0 = i * s + g, j * s + g
            x1, y1 = (i + 1) * s - g, (j + 1) * s - g
            d.rounded_rectangle([x0, y0, x1, y1], rad, fill=shade(c, 0.80))
            d.rounded_rectangle([x0, y0, x1 - 2, y1 - 3], rad, fill=c)
            d.line([(x0 + rad, y0 + 1.5), (x1 - rad - 2, y0 + 1.5)], fill=shade(c, 1.16), width=2)
    for _ in range(cracks):
        x, y = r.uniform(20, T - 20), r.uniform(20, T - 20)
        pts = [(x, y)]
        for _ in range(5):
            x += r.uniform(-14, 14); y += r.uniform(4, 14)
            pts.append((x, y))
        d.line(pts, fill=shade(mortar, 0.8), width=2)
    arr = np.asarray(im).astype(np.float32)
    return arr * (0.93 + 0.14 * vnoise(seed + 5, 4)[..., None])


def bricks(seed, base, mortar, rows=3, top=None):
    r = random.Random(seed)
    im = Image.new('RGB', (T, T), mortar)
    d = ImageDraw.Draw(im)
    h = T / rows
    w = T / 2
    for j in range(rows):
        off = (w / 2) if j % 2 else 0
        for i in range(-1, 3):
            c = shade(base, 1 + r.uniform(-0.09, 0.09))
            x0, y0 = i * w + off + 2, j * h + 2
            x1, y1 = (i + 1) * w + off - 2, (j + 1) * h - 2
            d.rounded_rectangle([x0, y0, x1, y1], 4, fill=shade(c, 0.78))
            d.rounded_rectangle([x0, y0, x1 - 2, y1 - 3], 4, fill=c)
            d.line([(x0 + 4, y0 + 1.5), (x1 - 6, y0 + 1.5)], fill=shade(c, 1.15), width=2)
    arr = np.asarray(im).astype(np.float32)
    arr *= (0.94 + 0.12 * vnoise(seed + 9, 4)[..., None])
    grad = (1.08 - 0.42 * smooth((yy - 0.55) / 0.45))[..., None]   # sombra hacia el suelo
    arr *= grad
    if top:
        k = (1 - smooth((yy - 0.02) / 0.07))[..., None]
        arr = arr * (1 - k) + np.array(top, np.float32) * k
    return arr


def wall_top(seed, base):
    arr = tex(base, seed, 0.10, 4, d_speck([shade(base, 1.25), shade(base, 0.75)], 70, 2.2))
    return arr


def stairs(seed, base, down=True):
    arr = np.zeros((T, T, 3), np.float32)
    steps = 6
    for s in range(steps):
        y0, y1 = int(s * T / steps), int((s + 1) * T / steps)
        t = s / (steps - 1)
        k = (0.25 + 0.85 * t) if down else (1.1 - 0.5 * t)
        arr[y0:y1] = np.array(base, np.float32) * k
        arr[y0:y0 + 3] *= 1.25
        arr[y1 - 3:y1] *= 0.6
    arr[:, :7] *= 0.5
    arr[:, -7:] *= 0.5
    return arr * (0.95 + 0.1 * vnoise(seed, 4)[..., None])


def pit(seed, edge=False):
    arr = np.zeros((T, T, 3), np.float32)
    arr[...] = np.array([13, 11, 20], np.float32)
    arr *= (0.8 + 0.5 * vnoise(seed, 3)[..., None])
    if edge:
        rock = bricks(seed + 3, (72, 68, 90), (34, 32, 46), rows=3)
        k = (1 - smooth((yy - 0.18) / 0.34))[..., None]
        arr = arr * (1 - k) + rock * k * (1 - 0.5 * smooth(yy / 0.5))[..., None]
        arr[:5] *= 0.45
    return arr


def light_bridge(seed):
    base = slabs(seed, (120, 150, 176), (60, 84, 112), n=2, jitter=0.05, rad=6)
    glow = np.exp(-(((xx - 0.5) ** 2 + (yy - 0.5) ** 2) / 0.09))[..., None]
    out = base + np.array([40, 70, 90], np.float32) * glow
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    c = T / 2
    d.polygon([(c, c - 16), (c + 12, c), (c, c + 16), (c - 12, c)], outline=(214, 240, 250), width=3)
    d.ellipse([c - 3, c - 3, c + 3, c + 3], fill=(230, 248, 255))
    return np.asarray(im).astype(np.float32)


# ---------------------------------------------------------------- construir
def build():
    tiles = []   # (nombre, array RGBA uint8 TSxTS, props)

    def add(name, arr, **props):
        if arr.shape[2] == 3:
            im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
        else:
            im = Image.fromarray(arr)
        tiles.append((name, im.resize((TS, TS), Image.LANCZOS), props))

    G_L, G_D = (118, 158, 92), (62, 100, 62)
    grass = [tex((84, 124, 74), 10 + i, 0.13, 3, d_grass(G_L, G_D, flowers=(i == 3))) for i in range(4)]
    fgr = [tex((54, 90, 68), 30 + i, 0.15, 3, d_grass((78, 118, 84), (38, 68, 54), leaves=True, n=70)) for i in range(3)]
    path = tex((150, 122, 84), 50, 0.10, 4, d_path)
    water = tex((52, 104, 138), 60, 0.10, 2, d_water)

    add('blocker', np.zeros((T, T, 4), np.uint8), collides=True, wall=True)
    for i, g in enumerate(grass): add(f'grass{i}', g)
    for i, g in enumerate(fgr): add(f'fgrass{i}', g)
    for m in CANON:
        add(f'path_g:{m}', blend(grass[0], path, m, 'path'))
    for m in CANON:
        add(f'path_f:{m}', blend(fgr[0], path, m, 'path'))
    for m in CANON:
        add(f'water_g:{m}', blend(grass[0], water, m, 'water'), collides=True)
    for m in CANON:
        add(f'fgrass_g:{m}', blend(grass[0], fgr[0], m, 'forest', e=0.14))

    # piedra del supramundo (ruinas, castillo)
    add('flag0', slabs(70, (150, 146, 138), (92, 90, 86), n=2, jitter=0.08))
    add('flag1', slabs(71, (144, 140, 134), (92, 90, 86), n=2, jitter=0.10, cracks=2))
    add('flag2', slabs(72, (120, 128, 112), (84, 92, 80), n=2, jitter=0.10, cracks=1))
    add('wall_top', wall_top(73, (104, 104, 114)), collides=True, wall=True)
    add('wall_front', bricks(74, (146, 140, 136), (78, 74, 76), top=(176, 172, 170)), collides=True, wall=True)
    add('cwall_top', wall_top(75, (58, 56, 70)), collides=True, wall=True)
    add('cwall_front', bricks(76, (84, 80, 98), (40, 38, 52), top=(112, 108, 128)), collides=True, wall=True)
    add('stairs_down', stairs(77, (130, 126, 122), True))

    # mazmorra
    add('dfloor0', slabs(80, (84, 80, 104), (44, 42, 60), n=2, jitter=0.06))
    add('dfloor1', slabs(81, (80, 78, 100), (44, 42, 60), n=2, jitter=0.09))
    add('dfloor2', slabs(82, (82, 78, 100), (44, 42, 60), n=2, jitter=0.08, cracks=2))
    add('dfloor3', slabs(83, (104, 76, 76), (58, 40, 46), n=2, jitter=0.07))        # losas rojizas (jefe)
    add('dwall_top', wall_top(84, (40, 38, 54)), collides=True, wall=True)
    add('dwall_front', bricks(85, (98, 92, 118), (44, 40, 58), top=(134, 128, 156)), collides=True, wall=True)
    add('pit', pit(86), collides=True, pit=True)
    add('pit_edge', pit(87, True), collides=True, pit=True)
    add('bridge', light_bridge(88), bridge=True)
    add('stairs_up', stairs(89, (120, 116, 140), False))

    rows = math.ceil(len(tiles) / COLS)
    cell = TS + 2
    sheet = Image.new('RGBA', (COLS * cell, rows * cell), (0, 0, 0, 0))
    index, props = {}, {}
    for i, (name, im, pr) in enumerate(tiles):
        x, y = 1 + (i % COLS) * cell, 1 + (i // COLS) * cell
        sheet.paste(im, (x, y))
        # extrusión de 1 px
        sheet.paste(im.crop((0, 0, TS, 1)), (x, y - 1))
        sheet.paste(im.crop((0, TS - 1, TS, TS)), (x, y + TS))
        sheet.paste(im.crop((0, 0, 1, TS)), (x - 1, y))
        sheet.paste(im.crop((TS - 1, 0, TS, TS)), (x + TS, y))
        for cx, cy, px, py in ((0, 0, x - 1, y - 1), (TS - 1, 0, x + TS, y - 1),
                               (0, TS - 1, x - 1, y + TS), (TS - 1, TS - 1, x + TS, y + TS)):
            sheet.putpixel((px, py), im.getpixel((cx, cy)))
        index[name] = i
        if pr:
            props[i] = pr
    os.makedirs(OUT, exist_ok=True)
    sheet.save(os.path.join(OUT, 'tiles.png'), optimize=True)
    meta = dict(tile=TS, columns=COLS, count=len(tiles), margin=1, spacing=2,
                width=sheet.width, height=sheet.height, index=index,
                props={str(k): v for k, v in props.items()})
    with open(os.path.join(HERE, 'tiles_index.json'), 'w') as f:
        json.dump(meta, f)
    print('tiles:', len(tiles), 'sheet', sheet.size)


if __name__ == '__main__':
    build()
