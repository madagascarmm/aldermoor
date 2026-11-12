#!/usr/bin/env python3
"""Genera todas las hojas de sprites e iconos (assets/sprites y assets/ui).

Estilo: formas vectoriales con contorno, dibujadas a 4x y reducidas con
Lanczos para obtener bordes suaves. Todo es paramétrico: cambiar un color
de una paleta o el número de frames regenera la hoja completa.
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(HERE, '..', 'assets', 'sprites')
UI = os.path.join(HERE, '..', 'assets', 'ui')
OUTL = (34, 26, 40)
cos = lambda a: math.cos(math.radians(a))
sin = lambda a: math.sin(math.radians(a))


def sh(c, k):
    return tuple(int(max(0, min(255, v * k))) for v in c[:3])


class C:
    """Lienzo con supermuestreo. Coordenadas en 'unidades' (unit px finales)."""

    def __init__(s, w, h, unit=1.0, ss=4):
        s.w, s.h, s.ss, s.unit = w, h, ss, unit
        s.k = ss * unit
        s.ls, s.px, s.py = 1.0, 0.0, 0.0
        s.im = Image.new('RGBA', (w * ss, h * ss), (0, 0, 0, 0))
        s.d = ImageDraw.Draw(s.im)

    def P(s, x, y):
        return ((s.px + (x - s.px) * s.ls) * s.k, (s.py + (y - s.py) * s.ls) * s.k)

    def L(s, v):
        return v * s.ls * s.k

    def W(s, w):
        return max(1, int(round(s.L(w))))

    def box(s, cx, cy, rx, ry):
        x0, y0 = s.P(cx - rx, cy - ry)
        x1, y1 = s.P(cx + rx, cy + ry)
        return [x0, y0, x1, y1]

    def ell(s, cx, cy, rx, ry, fill, ol=OUTL, w=1.5):
        if ol: s.d.ellipse(s.box(cx, cy, rx, ry), fill=fill, outline=ol, width=s.W(w))
        else: s.d.ellipse(s.box(cx, cy, rx, ry), fill=fill)

    def chord(s, cx, cy, rx, ry, a0, a1, fill, ol=OUTL, w=1.5):
        if ol: s.d.chord(s.box(cx, cy, rx, ry), a0, a1, fill=fill, outline=ol, width=s.W(w))
        else: s.d.chord(s.box(cx, cy, rx, ry), a0, a1, fill=fill)

    def arc(s, cx, cy, rx, ry, a0, a1, col=OUTL, w=1.5):
        s.d.arc(s.box(cx, cy, rx, ry), a0, a1, fill=col, width=s.W(w))

    def poly(s, pts, fill, ol=OUTL, w=1.5):
        p = [s.P(x, y) for x, y in pts]
        if fill: s.d.polygon(p, fill=fill)
        if ol: s.d.line(p + [p[0], p[1]], fill=ol, width=s.W(w), joint='curve')

    def rr(s, x0, y0, x1, y1, r, fill, ol=OUTL, w=1.5):
        a, b = s.P(x0, y0), s.P(x1, y1)
        if ol: s.d.rounded_rectangle([a[0], a[1], b[0], b[1]], s.L(r), fill=fill, outline=ol, width=s.W(w))
        else: s.d.rounded_rectangle([a[0], a[1], b[0], b[1]], s.L(r), fill=fill)

    def line(s, pts, col=OUTL, w=1.5, round_=True):
        p = [s.P(x, y) for x, y in pts]
        s.d.line(p, fill=col, width=s.W(w), joint='curve')
        if round_:
            r = s.W(w) / 2
            for x, y in (p[0], p[-1]):
                s.d.ellipse([x - r, y - r, x + r, y + r], fill=col)

    def oline(s, pts, col, w, ow=1.5):
        s.line(pts, OUTL, w + ow * 2)
        s.line(pts, col, w)

    def sub(s):
        n = C(s.w, s.h, s.unit, s.ss)
        n.ls, n.px, n.py = s.ls, s.px, s.py
        return n

    def merge(s, o, blur=0, op=1.0):
        im = o.im
        if blur: im = im.filter(ImageFilter.GaussianBlur(blur * s.k))
        if op < 1:
            im = im.copy()
            im.putalpha(im.getchannel('A').point(lambda v: int(v * op)))
        s.im.alpha_composite(im)

    def glow(s, cx, cy, r, col, op=0.8, blur=None):
        g = s.sub()
        g.ell(cx, cy, r, r, col, None)
        s.merge(g, blur if blur is not None else r * 0.45, op)

    def hl(s, cx, cy, rx, ry, a=60):
        g = s.sub()
        g.ell(cx, cy, rx, ry, (255, 255, 255, a), None)
        s.merge(g)

    def out(s):
        return s.im.resize((s.w, s.h), Image.LANCZOS)


def sheet(frames, cols=None):
    cols = cols or len(frames)
    w, h = frames[0].size
    rows = math.ceil(len(frames) / cols)
    im = Image.new('RGBA', (cols * w, rows * h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f, ((i % cols) * w, (i // cols) * h))
    return im


def save(im, name, folder=SPR):
    os.makedirs(folder, exist_ok=True)
    im.save(os.path.join(folder, name + '.png'), optimize=True)


# =============================================================== HUMANOIDES
def draw_sword(c, hx, hy, a, L=30, blade=(226, 232, 240), guard=(196, 160, 72)):
    ca, sa = cos(a), sin(a)
    px, py = -sa, ca
    b = (hx + ca * 5, hy + sa * 5)
    m = (hx + ca * (L - 6), hy + sa * (L - 6))
    tip = (hx + ca * L, hy + sa * L)
    c.oline([(hx - ca * 3, hy - sa * 3), b], (110, 74, 50), 2.4, 1.2)
    c.poly([(b[0] + px * 2.8, b[1] + py * 2.8), (m[0] + px * 2.4, m[1] + py * 2.4), tip,
            (m[0] - px * 2.4, m[1] - py * 2.4), (b[0] - px * 2.8, b[1] - py * 2.8)], blade, w=1.3)
    c.line([b, m], (250, 252, 255), 0.9, False)
    c.oline([(b[0] + px * 6, b[1] + py * 6), (b[0] - px * 6, b[1] - py * 6)], guard, 2.2, 1.2)


def draw_kite(c, x, y, w, h, col, emb):
    c.poly([(x - w, y - h), (x + w, y - h), (x + w, y + h * 0.25), (x, y + h), (x - w, y + h * 0.25)], col)
    c.poly([(x, y - h * 0.45), (x + w * 0.5, y), (x, y + h * 0.45), (x - w * 0.5, y)], emb, None)


def humanoid(c, d, pose, t, P):
    sk = P['skin']
    f = {'down': 90, 'up': -90, 'side': 0}[d]
    s, bob = 0.0, 0.0
    if pose == 'idle': bob = 0.9 if t == 1 else 0
    if pose == 'walk':
        ph = math.tau * t / 6
        s = math.sin(ph)
        bob = 0.8 - abs(math.cos(ph)) * 1.7
    lx = ly = 0.0
    if pose == 'attack': lx, ly = cos(f) * 2.5, sin(f) * 2.5
    if pose == 'hurt': bob = 1.6
    if pose == 'guard': bob = 1.0
    cx, by = 48 + lx, bob + ly
    armored, robe = P.get('armored'), P.get('robe')
    steel = P.get('steel', (120, 126, 140))
    sleeve = P.get('sleeve', P['tunic'])
    glove = P.get('glove', sk)

    c.ell(48, 83, 19, 6.5, (0, 0, 0, 70), None)

    def feet():
        col = P['boots']
        if d == 'side':
            for sx, lift in ((46 + 7 * s, max(0, -s) * 2.5), (50 - 7 * s, max(0, s) * 2.5)):
                c.ell(sx + lx, 79 - lift, 7, 4.6, col)
        else:
            c.ell(41 + lx, 79 + 3.2 * s, 6.2, 4.8, col)
            c.ell(55 + lx, 79 - 3.2 * s, 6.2, 4.8, col)

    def cape(stage):
        col = P.get('cape')
        if not col: return
        if d == 'down' and stage == 'back':
            c.poly([(cx - 14, 52 + by), (cx + 14, 52 + by), (cx + 18.5 + s, 77), (cx - 18.5 + s, 77)], col)
        if d == 'side' and stage == 'back':
            c.poly([(cx - 9, 51 + by), (cx - 1, 51 + by), (cx - 5, 76), (cx - 18 - 2.5 * s, 74)], col)
        if d == 'up' and stage == 'front':
            c.poly([(cx - 13.5, 51 + by), (cx + 13.5, 51 + by), (cx + 16.5 + 1.5 * s, 77), (cx - 16.5 + 1.5 * s, 77)], col)
            c.line([(cx - 5, 56 + by), (cx - 6.5 + s, 74)], sh(col, 0.78), 1.2)
            c.line([(cx + 5, 56 + by), (cx + 6.5 + s, 74)], sh(col, 0.78), 1.2)

    def body():
        x0, x1 = (38.5, 57.5) if d == 'side' else (34.5, 61.5)
        x0 += lx; x1 += lx
        y1 = 81 if robe else 75
        c.rr(x0, 50 + by, x1, y1 + by * 0.4, 7, P['tunic'])
        c.hl((x0 + x1) / 2 - 4, 56 + by, (x1 - x0) * 0.26, 4.5, 46)
        if robe:
            c.line([(x0 + 2.5, 78.5), (x1 - 2.5, 78.5)], sh(P['tunic'], 0.72), 1.6)
        c.rr(x0, 64 + by, x1, 68.5 + by, 2, P['belt'], w=1.2)
        if d == 'down':
            c.rr(cx - 2.6, 64.2 + by, cx + 2.6, 68.3 + by, 1, (214, 176, 86), w=1.0)
        if P.get('apron'):
            if d == 'down': c.rr(cx - 8, 55 + by, cx + 8, 76, 3, P['apron'], w=1.2)
        if armored:
            if d != 'side':
                c.ell(x0 + 1, 54 + by, 7, 5.4, sh(steel, 1.12))
                c.ell(x1 - 1, 54 + by, 7, 5.4, sh(steel, 1.12))
            else:
                c.ell(cx, 54.5 + by, 7.5, 5.6, sh(steel, 1.12))
            if P.get('cracks'):
                gl = P['glowc']
                c.line([(cx - 6, 57 + by), (cx - 2, 62 + by), (cx - 5, 67 + by)], gl, 1.3)
                c.line([(cx + 5, 56 + by), (cx + 3, 61 + by), (cx + 7, 72 + by)], gl, 1.3)

    def arm(x, y, up=False):
        if up:
            c.ell(x, y - 6, 4.6, 8, sleeve)
            c.ell(x, y - 14, 3.6, 3.6, glove)
        else:
            c.ell(x, y, 4.6, 8, sleeve)
            c.ell(x, y + 7.6, 3.6, 3.6, glove)

    def arms():
        ay = 59 + by
        if pose in ('hurt', 'item'):
            return
        if d == 'side':
            if pose not in ('attack', 'cast', 'guard'):
                arm(cx - 1 - 5 * s, ay + 1)
        else:
            sw = 2.5 * s
            left, right = (32.5 + lx, ay + sw), (63.5 + lx, ay - sw)
            # brazo de la espada / hechizo: izquierda en 'down', derecha en 'up'
            act = pose in ('attack', 'cast')
            if not (act and d == 'down'): arm(*left)
            if not (act and d == 'up'): arm(*right)

    def raised_arms():
        if pose == 'hurt' and d != 'side':
            arm(31 + lx, 58 + by, True); arm(65 + lx, 58 + by, True)
        if pose == 'hurt' and d == 'side':
            arm(cx - 4, 58 + by, True)
        if pose == 'item':
            arm(36, 50, True); arm(60, 50, True)

    def scarf():
        col = P.get('scarf')
        if not col: return
        if d == 'down': c.ell(cx, 51.5 + by, 10.5, 4.2, col, w=1.2)
        if d == 'side':
            c.poly([(cx - 5, 50 + by), (cx - 15 - 2 * s, 53 + by - s), (cx - 13 - 2 * s, 58 + by)], col, w=1.2)
            c.ell(cx + 1, 51.5 + by, 7.5, 4, col, w=1.2)

    def eye(ex, ey):
        if pose == 'hurt':
            c.line([(ex - 2.4, ey - 1), (ex + 2.4, ey + 1)], (40, 30, 44), 1.3)
        else:
            c.ell(ex, ey, 2.2, 3.3, (40, 30, 44), None)
            c.ell(ex - 0.6, ey - 1.3, 0.9, 0.9, (255, 255, 255), None)

    def head():
        hx, hy = cx, 36 + by
        hair = P['hair']
        style = P.get('style', 'short')
        if armored:
            if P.get('horns'):
                bone = (214, 204, 180)
                for sg in (-1, 1):
                    c.poly([(hx + sg * 11, hy - 8), (hx + sg * 25, hy - 23), (hx + sg * 16, hy - 4)], bone)
            if d != 'down' or True:
                pl = P.get('plume')
                if pl:
                    if d == 'side': c.poly([(hx - 4, hy - 14), (hx - 16, hy - 21), (hx - 17, hy - 6), (hx - 9, hy - 9)], pl)
                    else: c.poly([(hx - 4, hy - 13), (hx, hy - 25), (hx + 4, hy - 13)], pl)
            c.ell(hx, hy, 17.5, 16.5, steel)
            c.hl(hx - 5, hy - 7, 8, 5, 70)
            gl = P.get('glowc', (255, 120, 50))
            if d == 'down':
                c.rr(hx - 11.5, hy + 0.5, hx + 11.5, hy + 7.5, 2.5, (22, 16, 26), w=1.2)
                c.glow(hx - 5, hy + 4, 3.4, gl, 0.9, 1.4); c.glow(hx + 5, hy + 4, 3.4, gl, 0.9, 1.4)
                c.ell(hx - 5, hy + 4, 2.2, 1.7, (255, 236, 190), None); c.ell(hx + 5, hy + 4, 2.2, 1.7, (255, 236, 190), None)
                c.line([(hx, hy - 14), (hx, hy + 0.5)], sh(steel, 0.7), 1.4)
            elif d == 'side':
                c.rr(hx + 2, hy + 0.5, hx + 17, hy + 7.5, 2.5, (22, 16, 26), w=1.2)
                c.glow(hx + 11, hy + 4, 3.4, gl, 0.9, 1.4)
                c.ell(hx + 11, hy + 4, 2.2, 1.7, (255, 236, 190), None)
            else:
                c.arc(hx, hy + 2, 15, 9, 20, 160, sh(steel, 0.65), 1.4)
            return
        if style == 'long' and d != 'up':
            c.rr(hx - 17.5, hy - 4, hx + (8 if d == 'side' else 17.5), hy + 21, 7, hair)
        if style == 'tails':
            if d == 'side': c.ell(hx - 17, hy + 5, 5.5, 7, hair)
            else:
                c.ell(hx - 19, hy + 5, 5.5, 7, hair); c.ell(hx + 19, hy + 5, 5.5, 7, hair)
        if style == 'bun':
            c.ell(hx - (6 if d == 'side' else 0), hy - 16.5, 6.5, 6, hair)
        if d == 'up':
            c.ell(hx, hy - 0.5, 18, 16.8, hair)
            if style == 'long': c.rr(hx - 17.5, hy - 2, hx + 17.5, hy + 21, 7, hair)
            c.hl(hx - 5, hy - 8, 9, 5, 50)
            return
        c.ell(hx, hy, 16.5, 15.5, sk)
        if d == 'down':
            c.ell(hx - 9.5, hy + 8, 2.6, 1.7, (236, 150, 130, 110), None)
            c.ell(hx + 9.5, hy + 8, 2.6, 1.7, (236, 150, 130, 110), None)
            eye(hx - 6.2, hy + 4.6); eye(hx + 6.2, hy + 4.6)
            if P.get('beard'):
                c.chord(hx, hy + 3, 14.5, 15.5, 15, 165, P['beard'], w=1.3)
            c.chord(hx, hy - 1.7, 18, 16.8, 186, 354, hair)
            if style != 'hood':
                c.poly([(hx - 15, hy - 4.5), (hx - 9, hy + 1.8), (hx - 4, hy - 4.5)], hair, None)
                c.poly([(hx - 5, hy - 4.5), (hx + 1, hy + 2.6), (hx + 6, hy - 4.5)], hair, None)
                c.poly([(hx + 5, hy - 4.5), (hx + 11, hy + 1.2), (hx + 15, hy - 4.5)], hair, None)
            c.hl(hx - 5, hy - 10, 8, 4, 50)
        else:
            eye(hx + 9.5, hy + 4.2)
            if P.get('beard'):
                c.chord(hx + 3, hy + 3.5, 12.5, 15, 10, 120, P['beard'], w=1.3)
            c.chord(hx - 1, hy - 1.5, 18, 17, 118, 338, hair)
            c.hl(hx - 6, hy - 9, 8, 4, 50)

    def sword_arm(a, front=True):
        hx, hy = cx + cos(a) * 12, 60 + by + sin(a) * 12
        shx = cx + (0 if d == 'side' else (-11 if d == 'down' else 11))
        c.oline([(shx, 56 + by), (hx, hy)], sleeve, 7.2, 1.3)
        draw_sword(c, hx, hy, a, P.get('blade_len', 30), P.get('blade', (226, 232, 240)))
        c.ell(hx, hy, 3.7, 3.7, glove)

    def trail(a):
        col = P.get('trail')
        if not col or t == 0: return
        g = c.sub()
        a0 = f - 78
        pts = [(cx + cos(a0 + (a - a0) * i / 10) * 47, 60 + by + sin(a0 + (a - a0) * i / 10) * 47) for i in range(11)]
        pts += [(cx + cos(a0 + (a - a0) * i / 10) * (30 + i * 0.8), 60 + by + sin(a0 + (a - a0) * i / 10) * (30 + i * 0.8)) for i in range(10, -1, -1)]
        g.poly(pts, col, None)
        c.merge(g, 0.7)

    def weapon_idle():
        if not P.get('weapon_out') or pose in ('attack', 'hurt'): return
        hx, hy, a = {'down': (31.5 + lx, 66 + by, 102), 'up': (64.5, 64 + by, -82), 'side': (53, 66 + by, 14)}[d]
        draw_sword(c, hx, hy, a, P.get('blade_len', 30), P.get('blade', (226, 232, 240)))
        if d == 'side': c.ell(hx, hy, 3.7, 3.7, glove)

    def kite(stage):
        if not P.get('kite'): return
        col, emb = P['kite']
        if d == 'down' and stage == 'front': draw_kite(c, 62.5 + lx, 63 + by, 8.5, 11.5, col, emb)
        if d == 'up' and stage == 'back': draw_kite(c, 33.5, 62 + by, 8.5, 11.5, col, emb)
        if d == 'side' and stage == 'front': draw_kite(c, 60 + lx, 62 + by, 5.5, 11.5, col, emb)

    def round_shield():
        wood, rim = (150, 104, 62), (150, 156, 170)
        if d == 'down':
            c.ell(cx + 2, 64 + by, 13, 14, rim); c.ell(cx + 2, 64 + by, 10, 11, wood, w=1.2)
            c.ell(cx + 2, 64 + by, 3.4, 3.6, rim, w=1.2); c.hl(cx - 2, 58 + by, 5, 3, 60)
        elif d == 'side':
            c.ell(cx + 14, 62 + by, 6, 13.5, rim); c.ell(cx + 14.6, 62 + by, 3.6, 10.5, wood, w=1.2)
        else:
            c.ell(cx, 53 + by, 17, 9, rim)

    # ---- orden de dibujo
    atk = pose == 'attack'
    a = f + (-75 + 50 * t) if atk else 0
    if d == 'up':
        if atk:
            trail(a); sword_arm(a)
        weapon_idle()
        kite('back')
        if pose == 'guard': round_shield()
    cape('back')
    feet()
    body()
    kite('back') if d != 'up' else None
    arms()
    cape('front')
    scarf()
    if d == 'down' and pose == 'cast':
        c.oline([(cx - 11, 56 + by), (cx - 4, 70 + by + 3 * t)], sleeve, 7.2, 1.3)
        c.ell(cx - 4, 70 + by + 3 * t, 3.7, 3.7, glove)
    head()
    raised_arms()
    if d == 'side' and pose == 'cast':
        c.oline([(cx, 57 + by), (cx + 12 + 5 * t, 59 + by)], sleeve, 7.2, 1.3)
        c.ell(cx + 12 + 5 * t, 59 + by, 3.7, 3.7, glove)
    if d == 'up' and pose == 'cast':
        c.oline([(cx + 12, 54 + by), (cx + 15, 40 + by - 4 * t)], sleeve, 7.2, 1.3)
        c.ell(cx + 15, 40 + by - 4 * t, 3.7, 3.7, glove)
    if d != 'up':
        weapon_idle()
        kite('front')
        if pose == 'guard': round_shield()
        if atk:
            trail(a); sword_arm(a)
    if pose == 'cast':
        gx, gy = {'down': (cx - 4, 77 + 3 * t), 'side': (cx + 20 + 5 * t, 59), 'up': (cx + 15, 31 - 4 * t)}[d]
        c.glow(gx, gy + by, 6 + 2.5 * t, P.get('castc', (255, 226, 170)), 0.95)
        c.ell(gx, gy + by, 2.2 + t, 2.2 + t, (255, 255, 240), None)
    if pose == 'item':
        c.glow(48, 22, 9, (255, 236, 170), 0.8)


POSES = [('idle', 2), ('walk', 6), ('attack', 4), ('cast', 2), ('guard', 1), ('hurt', 1)]


def human_sheet(P, size=96, cols=16, extra=False):
    frames = []
    unit = size / 96
    for d in ('down', 'up', 'side'):
        n = 0
        for pose, cnt in POSES:
            for t in range(cnt):
                if n >= cols: break
                c = C(size, size, unit)
                if P.get('scale'):
                    c.ls, c.px, c.py = P['scale'], 48, 83
                humanoid(c, d, pose, t, P)
                frames.append(c.out()); n += 1
    if extra:
        c = C(size, size, unit)
        humanoid(c, 'down', 'item', 0, P)
        frames.append(c.out())
    return sheet(frames, cols)


SKIN = (240, 200, 164)
HERO = dict(skin=SKIN, hair=(92, 58, 44), tunic=(44, 120, 124), sleeve=(226, 220, 204), belt=(104, 70, 46),
            boots=(98, 66, 46), cape=(196, 96, 44), scarf=(214, 112, 50), trail=(255, 255, 255, 150))
KNIGHT = dict(skin=SKIN, hair=(0, 0, 0), tunic=(62, 64, 84), sleeve=(74, 78, 98), belt=(40, 36, 48), boots=(46, 46, 60),
              cape=(96, 30, 40), armored=True, steel=(96, 102, 122), plume=(150, 40, 46), glowc=(255, 110, 40),
              glove=(52, 54, 70), weapon_out=True, kite=((70, 74, 96), (176, 50, 46)), blade=(170, 176, 196))
BOSS = dict(skin=SKIN, hair=(0, 0, 0), tunic=(44, 36, 44), sleeve=(56, 44, 50), belt=(110, 50, 30), boots=(34, 28, 36),
            cape=(120, 44, 24), armored=True, steel=(66, 58, 66), glowc=(255, 140, 40), glove=(40, 32, 40),
            weapon_out=True, kite=((60, 50, 58), (255, 150, 50)), blade=(255, 190, 110), blade_len=36,
            horns=True, cracks=True)
NPCS = dict(
    maelis=dict(skin=(232, 196, 170), hair=(200, 200, 210), style='bun', tunic=(98, 76, 124), sleeve=(98, 76, 124),
                belt=(196, 160, 72), boots=(70, 54, 60), robe=True, scarf=(214, 112, 50)),
    bruna=dict(skin=(214, 164, 128), hair=(176, 70, 46), style='short', tunic=(150, 140, 120), sleeve=(214, 164, 128),
               belt=(70, 50, 40), boots=(70, 50, 40), apron=(104, 74, 52)),
    lina=dict(skin=SKIN, hair=(214, 170, 86), style='tails', tunic=(210, 170, 70), sleeve=(240, 232, 214),
              belt=(170, 90, 70), boots=(120, 80, 60), scale=0.8),
    tobias=dict(skin=(226, 184, 150), hair=(120, 126, 140), style='short', tunic=(60, 84, 140), sleeve=(120, 126, 140),
                belt=(60, 44, 36), boots=(60, 50, 50), beard=(110, 80, 60), cape=(44, 60, 104)),
    oswin=dict(skin=(226, 190, 160), hair=(110, 88, 62), style='hood', tunic=(110, 88, 62), sleeve=(110, 88, 62),
               belt=(70, 54, 40), boots=(60, 46, 36), robe=True, beard=(232, 230, 224)),
)


# =============================================================== ENEMIGOS
def gen_slime():
    fr = []
    for t in range(4):
        q = math.sin(math.tau * t / 4)
        c = C(64, 64)
        w, h = 22 + 3 * q, 17 - 3 * q
        c.ell(32, 54, 20, 6, (0, 0, 0, 70), None)
        c.chord(32, 52 - h * 0.1, w, h * 1.75, 180, 360, (122, 112, 136))
        c.rr(32 - w, 50 - h * 0.1, 32 + w, 56, 5, (122, 112, 136))
        c.rr(32 - w + 1.5, 44 - h * 0.1, 32 + w - 1.5, 54.5, 4, (122, 112, 136), None)
        c.glow(32, 46, 9, (255, 130, 50), 0.85)
        c.hl(24, 36 + 2 * q, 6, 4, 80)
        for ex in (25, 39):
            c.ell(ex, 44 + q, 2.6, 3.2, (255, 220, 150), None)
            c.ell(ex, 44.6 + q, 1.3, 1.9, (60, 26, 20), None)
        fr.append(c.out())
    save(sheet(fr), 'slime')


def gen_bat():
    fr = []
    for t in range(4):
        up = [-22, -8, 14, -4][t]
        c = C(64, 64)
        c.ell(32, 56, 12, 4, (0, 0, 0, 60), None)
        col = (62, 46, 78)
        for sg in (-1, 1):
            c.poly([(32 + sg * 5, 30), (32 + sg * 18, 30 + up * 0.5), (32 + sg * 29, 30 + up),
                    (32 + sg * 24, 36 + up * 0.55), (32 + sg * 18, 33 + up * 0.5), (32 + sg * 13, 39 + up * 0.25),
                    (32 + sg * 7, 36)], col)
            c.poly([(32 + sg * 4, 22), (32 + sg * 9, 14), (32 + sg * 9, 24)], col)
        c.ell(32, 31, 9, 10, (78, 58, 96))
        c.hl(29, 26, 4, 3, 60)
        for ex in (28, 36):
            c.glow(ex, 29, 2.6, (255, 80, 60), 0.9, 1.0)
            c.ell(ex, 29, 1.6, 1.6, (255, 210, 190), None)
        c.poly([(29.5, 34), (31, 37.5), (32.5, 34)], (240, 236, 230), None)
        fr.append(c.out())
    save(sheet(fr), 'bat')


# =============================================================== OBJETOS
def flame(c, x, y, s, t, cols=((255, 120, 40), (255, 190, 70), (255, 244, 200))):
    r = random.Random(t * 7 + 1)
    c.glow(x, y - 8 * s, 15 * s, cols[0], 0.55)
    for i, col in enumerate(cols):
        k = 1 - i * 0.3
        j = r.uniform(-2, 2) * s
        h = (20 + r.uniform(-3, 4)) * s * k
        w = 8.5 * s * k
        c.poly([(x - w, y - 2 * s), (x - w * 0.8, y - h * 0.45), (x + j, y - h), (x + w * 0.8, y - h * 0.5), (x + w, y - 2 * s),
                (x, y + 3 * s * k)], col, None)


def gen_torch():
    fr = []
    for t in range(5):
        c = C(64, 96)
        c.ell(32, 86, 15, 5, (0, 0, 0, 70), None)
        c.ell(32, 84, 11, 4.5, (72, 68, 84))
        c.rr(28.5, 44, 35.5, 84, 2, (92, 86, 104))
        c.poly([(18, 34), (46, 34), (40, 47), (24, 47)], (110, 104, 122))
        c.ell(32, 34, 14, 4.5, (40, 34, 40))
        if t == 0:
            c.ell(28, 34, 3, 1.6, (70, 60, 62), None); c.ell(36, 34.5, 3, 1.5, (60, 52, 56), None)
        else:
            flame(c, 32, 34, 1.15, t)
        fr.append(c.out())
    save(sheet(fr), 'torch')


def gen_objects():
    # cristal (apagado / activo)
    fr = []
    for on in (0, 1):
        c = C(64, 64)
        c.ell(32, 54, 18, 6, (0, 0, 0, 70), None)
        c.rr(16, 44, 48, 58, 4, (84, 80, 100))
        col = (255, 176, 70) if on else (96, 128, 176)
        if on: c.glow(32, 28, 22, (255, 150, 50), 0.7)
        c.poly([(32, 6), (46, 28), (32, 50), (18, 28)], col)
        c.poly([(32, 6), (32, 50), (18, 28)], sh(col, 0.78), None)
        c.line([(32, 6), (32, 50)], sh(col, 1.2), 1.2, False)
        c.poly([(32, 6), (46, 28), (32, 50), (18, 28)], None)
        c.hl(37, 20, 3, 6, 110)
        fr.append(c.out())
    save(sheet(fr), 'crystal')
    # placa
    fr = []
    for dn in (0, 1):
        c = C(64, 64)
        c.rr(8, 8, 56, 56, 6, (50, 46, 62))
        if dn: c.rr(11, 12, 53, 54, 5, (104, 96, 84), w=1.2)
        else:
            c.rr(11, 9, 53, 51, 5, (176, 160, 120), w=1.2)
            c.hl(32, 16, 16, 3, 70)
        y = 33 if dn else 30
        c.poly([(32, y - 9), (40, y), (32, y + 9), (24, y)], None, sh((176, 160, 120), 0.6 if not dn else 0.45), 1.6)
        fr.append(c.out())
    save(sheet(fr), 'plate')
    # cofre
    fr = []
    for op in (0, 1):
        c = C(64, 64)
        c.ell(32, 56, 22, 6, (0, 0, 0, 70), None)
        wood, iron = (134, 88, 52), (196, 164, 84)
        c.rr(10, 30, 54, 56, 4, wood)
        if op:
            c.rr(10, 8, 54, 30, 5, sh(wood, 0.8))
            c.rr(14, 12, 50, 28, 3, (36, 26, 28), w=1.2)
            c.glow(32, 26, 12, (255, 226, 140), 0.8)
        else:
            c.rr(10, 16, 54, 34, 7, sh(wood, 1.12))
            c.hl(26, 21, 12, 2.6, 60)
        for x in (17, 47): c.rr(x - 2.6, 30 if op else 16, x + 2.6, 56, 1, iron, w=1.1)
        c.rr(27.5, 28, 36.5, 40, 2, iron, w=1.2)
        c.ell(32, 34, 1.8, 2.4, (50, 36, 30), None)
        fr.append(c.out())
    save(sheet(fr), 'chest')
    # bloque empujable
    c = C(64, 64)
    c.rr(3, 3, 61, 61, 7, (86, 82, 104))
    c.rr(5.5, 5, 58.5, 49, 6, (146, 140, 164), w=1.2)
    c.hl(30, 11, 20, 3, 70)
    c.poly([(32, 14), (44, 27), (32, 40), (20, 27)], None, (92, 86, 112), 2.2)
    c.ell(32, 27, 3, 3, (92, 86, 112), None)
    save(c.out(), 'block')
    # reja
    c = C(64, 64)
    c.rr(1, 2, 63, 62, 3, (30, 26, 38, 150), None)
    for x in (8, 24, 40, 56):
        c.rr(x - 3.4, 2, x + 3.4, 62, 3, (128, 132, 150))
        c.line([(x - 1.2, 6), (x - 1.2, 58)], (176, 180, 196), 1.1, False)
    for y in (16, 46): c.rr(1, y - 3, 63, y + 3, 2.5, (104, 108, 128))
    save(c.out(), 'bars')
    # puertas con cerradura
    for name, wood, gold, big in (('lockdoor', (124, 84, 52), (214, 176, 86), False), ('bossdoor', (64, 50, 60), (255, 150, 60), True)):
        c = C(64, 64)
        c.rr(1, 1, 63, 63, 4, wood)
        for x in (17, 32, 47): c.line([(x, 4), (x, 60)], sh(wood, 0.72), 1.3, False)
        for y in (13, 51): c.rr(1, y - 4, 63, y + 4, 2, (88, 90, 108), w=1.2)
        r = 11 if big else 8
        if big: c.glow(32, 32, 16, gold, 0.6)
        c.ell(32, 32, r, r, gold)
        c.ell(32, 29.5, r * 0.3, r * 0.3, (30, 22, 26), None)
        c.poly([(30.3, 30), (33.7, 30), (35, 38), (29, 38)], (30, 22, 26), None)
        save(c.out(), name)
    # zarza
    c = C(64, 64)
    r = random.Random(4)
    c.ell(32, 54, 26, 8, (0, 0, 0, 70), None)
    for i in range(9):
        x0, x1 = r.uniform(4, 22), r.uniform(42, 60)
        y0, y1 = r.uniform(34, 58), r.uniform(30, 58)
        mx, my = r.uniform(20, 44), r.uniform(4, 30)
        pts = [(x0 + (mx - x0) * 2 * k * (1 - k) * 2 + (x1 - x0) * k * k, y0 + (my - y0) * 2 * k * (1 - k) * 2 + (y1 - y0) * k * k) for k in [j / 10 for j in range(11)]]
        col = r.choice([(70, 86, 58), (58, 72, 52), (88, 70, 76)])
        c.oline(pts, col, 3.4, 1.2)
        for px, py in pts[2:-1:2]:
            a = r.uniform(0, 360)
            c.poly([(px - 1.6, py), (px + cos(a) * 6, py + sin(a) * 6), (px + 1.6, py)], (190, 180, 150), OUTL, 0.8)
    for _ in range(5):
        x, y = r.uniform(12, 52), r.uniform(14, 48)
        c.ell(x, y, 2.6, 2.6, (176, 50, 70), w=1.0)
    save(c.out(), 'bramble')
    # niebla de ceniza
    fr = []
    for t in range(2):
        r = random.Random(20 + t)
        c = C(64, 64)
        for _ in range(9):
            x, y, q = r.uniform(12, 52), r.uniform(12, 52), r.uniform(10, 18)
            g = c.sub(); g.ell(x, y, q, q * 0.8, r.choice([(150, 140, 160, 150), (110, 100, 124, 150), (190, 180, 190, 120)]), None)
            c.merge(g, 4.5)
        for _ in range(6):
            x, y = r.uniform(10, 54), r.uniform(10, 54)
            c.ell(x, y, 1.3, 1.3, (255, 150, 80, 200), None)
        fr.append(c.out())
    save(sheet(fr), 'fog')
    # arbusto
    c = C(64, 64)
    c.ell(32, 54, 24, 7, (0, 0, 0, 70), None)
    c.ell(32, 36, 25, 21, (48, 92, 60))
    r = random.Random(3)
    for _ in range(10):
        x, y = 32 + r.uniform(-15, 13), 34 + r.uniform(-12, 10)
        c.ell(x, y, 7, 5.5, (72, 124, 70), None)
    for _ in range(8):
        x, y = 30 + r.uniform(-14, 10), 30 + r.uniform(-11, 6)
        c.ell(x, y, 4, 3, (112, 160, 88), None)
    save(c.out(), 'bush')
    # roca
    c = C(64, 64)
    c.ell(32, 54, 26, 7, (0, 0, 0, 70), None)
    c.poly([(8, 46), (12, 24), (26, 12), (44, 14), (56, 30), (54, 50), (30, 56)], (116, 114, 126))
    c.poly([(14, 26), (26, 14), (42, 16), (36, 30), (20, 34)], (150, 148, 160), None)
    c.line([(36, 30), (54, 34)], (84, 82, 96), 1.3); c.line([(20, 34), (26, 54)], (84, 82, 96), 1.3)
    save(c.out(), 'rock')
    # tocón
    c = C(64, 64)
    c.ell(32, 54, 22, 7, (0, 0, 0, 70), None)
    c.rr(14, 28, 50, 56, 7, (110, 78, 52))
    c.ell(32, 30, 18, 9, (190, 156, 110)); c.ell(32, 30, 11, 5.5, None, (150, 116, 78), 1.2); c.ell(32, 30, 5, 2.5, None, (150, 116, 78), 1.2)
    save(c.out(), 'stump')
    # cartel
    c = C(64, 64)
    c.ell(32, 58, 12, 4, (0, 0, 0, 70), None)
    c.rr(29, 28, 35, 58, 1.5, (104, 72, 48))
    c.rr(8, 10, 56, 38, 4, (176, 136, 88))
    for y in (18, 24, 30): c.line([(15, y), (49, y)], (110, 78, 50), 1.6)
    save(c.out(), 'sign')
    # vasija
    c = C(64, 64)
    c.ell(32, 56, 16, 5, (0, 0, 0, 70), None)
    c.ell(32, 38, 17, 18, (166, 104, 70))
    c.rr(22, 12, 42, 22, 4, (184, 120, 82))
    c.ell(32, 13, 8, 3, (60, 36, 30))
    c.arc(32, 38, 17, 9, 10, 170, (214, 176, 110), 2.0)
    c.hl(25, 30, 4, 7, 70)
    save(c.out(), 'pot')
    # valla
    c = C(64, 64)
    for x in (10, 54): c.rr(x - 4, 14, x + 4, 58, 2, (120, 86, 56))
    for y in (26, 42): c.rr(0, y - 3.5, 64, y + 3.5, 2, (150, 110, 72))
    save(c.out(), 'fence')
    # pozo
    c = C(64, 96)
    c.ell(32, 86, 26, 8, (0, 0, 0, 70), None)
    c.rr(8, 54, 56, 88, 8, (128, 124, 134))
    c.ell(32, 56, 24, 10, (150, 146, 156)); c.ell(32, 56, 17, 6.5, (26, 40, 60))
    for x in (10, 54): c.rr(x - 3, 18, x + 3, 58, 1.5, (110, 78, 50))
    c.poly([(2, 22), (32, 2), (62, 22)], (140, 70, 52))
    c.line([(32, 20), (32, 44)], (200, 190, 160), 1.2); c.rr(27, 42, 37, 52, 2, (120, 86, 56))
    save(c.out(), 'well')


def gen_trees():
    def canopy(c, cx, cy, rx, ry, cols, seed):
        r = random.Random(seed)
        c.ell(cx, cy, rx, ry, cols[0])
        for i in range(7):
            a = i * 51 + 20
            c.ell(cx + cos(a) * rx * 0.72, cy + sin(a) * ry * 0.72, rx * 0.42, ry * 0.42, cols[0])
        c.ell(cx, cy, rx * 0.95, ry * 0.95, cols[0], None)
        for i in range(7):
            a = i * 51 + 20
            c.ell(cx + cos(a) * rx * 0.72, cy + sin(a) * ry * 0.72, rx * 0.40, ry * 0.40, cols[0], None)
        for _ in range(16):
            a, q = r.uniform(0, 360), r.uniform(0, 0.7)
            c.ell(cx + cos(a) * rx * q - rx * 0.1, cy + sin(a) * ry * q - ry * 0.12, rx * 0.2, ry * 0.17, cols[1], None)
        for _ in range(12):
            a, q = r.uniform(0, 360), r.uniform(0, 0.5)
            c.ell(cx + cos(a) * rx * q - rx * 0.22, cy + sin(a) * ry * q - ry * 0.28, rx * 0.11, ry * 0.09, cols[2], None)
        for _ in range(10):
            a, q = r.uniform(20, 160), r.uniform(0.4, 0.8)
            c.arc(cx + cos(a) * rx * q, cy + sin(a) * ry * q, 6, 4, 20, 160, sh(cols[0], 0.7), 1.3)

    for name, cols, seed in (('tree_oak', ((44, 92, 60), (66, 124, 70), (110, 162, 88)), 1),
                             ('tree_dark', ((34, 70, 62), (48, 96, 76), (80, 130, 96)), 2)):
        c = C(128, 176)
        c.ell(64, 164, 40, 10, (0, 0, 0, 80), None)
        c.poly([(52, 166), (56, 118), (72, 118), (76, 166), (86, 170), (64, 168), (42, 170)], (104, 74, 52))
        c.line([(62, 124), (60, 160)], (78, 54, 40), 1.6)
        canopy(c, 64, 72, 54, 58, cols, seed)
        save(c.out(), name)
    # pino
    c = C(128, 176)
    c.ell(64, 164, 34, 9, (0, 0, 0, 80), None)
    c.rr(57, 132, 71, 168, 3, (96, 68, 50))
    for i, (y, w) in enumerate(((150, 50), (112, 42), (76, 32))):
        col = (36, 76, 70)
        c.poly([(64, y - 70 + i * 6), (64 + w, y), (64 + w * 0.5, y - 5), (64, y + 3), (64 - w * 0.5, y - 5), (64 - w, y)], col)
        c.poly([(64, y - 66 + i * 6), (64 - w * 0.86, y - 3), (64 - w * 0.45, y - 8), (64 - 4, y - 2)], (56, 108, 90), None)
    save(c.out(), 'tree_pine')
    # árbol muerto
    c = C(128, 176)
    c.ell(64, 164, 30, 8, (0, 0, 0, 80), None)
    col = (86, 76, 84)
    c.poly([(52, 166), (58, 90), (70, 90), (76, 166), (86, 170), (64, 168), (42, 170)], col)
    for pts in ([(62, 96), (40, 62), (26, 56)], [(40, 62), (38, 36)], [(66, 96), (86, 58), (104, 50)],
                [(86, 58), (88, 30)], [(64, 92), (64, 40), (56, 18)], [(64, 50), (76, 30)]):
        c.oline(pts, col, 5.5, 1.4)
    save(c.out(), 'tree_dead')


def gen_buildings():
    for name, roof, wall in (('house_a', (150, 70, 56), (204, 188, 158)), ('house_b', (70, 92, 120), (196, 186, 170))):
        c = C(256, 256)
        c.ell(128, 240, 116, 14, (0, 0, 0, 80), None)
        c.rr(22, 112, 234, 242, 5, wall)
        beam = (104, 72, 52)
        for x in (22, 76, 180, 229): c.rr(x, 112, x + 5, 242, 1, beam, None)
        c.rr(22, 176, 234, 181, 1, beam, None)
        c.rr(20, 232, 236, 244, 3, (128, 124, 134))
        # puerta
        c.rr(108, 176, 148, 242, 16, (110, 76, 50)); c.line([(128, 182), (128, 240)], (80, 54, 38), 1.5)
        c.ell(140, 214, 2.6, 2.6, (214, 176, 86))
        # ventanas
        for x in (36, 190):
            c.rr(x, 190, x + 30, 220, 3, (255, 214, 130))
            c.glow(x + 15, 205, 14, (255, 200, 110), 0.35)
            c.line([(x + 15, 190), (x + 15, 220)], beam, 2); c.line([(x, 205), (x + 30, 205)], beam, 2)
            c.rr(x, 190, x + 30, 220, 3, None)
        # chimenea y tejado
        c.rr(176, 14, 200, 60, 2, (128, 124, 134))
        c.poly([(4, 132), (252, 132), (214, 26), (42, 26)], roof)
        r = random.Random(5)
        for row in range(5):
            y = 46 + row * 20
            xl = 42 - (y - 26) * 38 / 106; xr = 214 + (y - 26) * 38 / 106
            c.line([(xl + 2, y), (xr - 2, y)], sh(roof, 0.74), 1.6, False)
            n = int((xr - xl) / 22)
            for i in range(n):
                x = xl + (i + (0.5 if row % 2 else 0)) * (xr - xl) / n
                c.line([(x, y - 19), (x, y)], sh(roof, 0.82), 1.3, False)
        c.poly([(42, 26), (214, 26), (210, 16), (46, 16)], sh(roof, 1.16))
        c.hl(100, 60, 50, 10, 30)
        save(c.out(), name)

    # puerta del castillo (256x256)
    c = C(256, 256)
    st, dk = (84, 80, 98), (52, 48, 64)
    for x0 in (4, 196):
        c.rr(x0, 20, x0 + 56, 254, 4, st)
        for i in range(3): c.rr(x0 + 2 + i * 19, 6, x0 + 16 + i * 19, 26, 2, st)
        c.rr(x0 + 21, 70, x0 + 35, 104, 6, (20, 16, 26))
        for y in range(60, 250, 26): c.line([(x0 + 3, y), (x0 + 53, y)], dk, 1.3, False)
    c.rr(58, 50, 198, 254, 3, sh(st, 0.92))
    for i in range(6): c.rr(62 + i * 23, 36, 78 + i * 23, 56, 2, sh(st, 0.92))
    c.rr(84, 110, 172, 254, 44, (20, 16, 26))
    for x in range(94, 170, 14): c.line([(x, 122), (x, 252)], (90, 94, 112), 3.2, False)
    for y in (160, 200, 240): c.line([(88, y), (168, y)], (90, 94, 112), 3.2, False)
    c.glow(128, 182, 34, (255, 226, 150), 0.5)
    c.ell(128, 182, 27, 27, (214, 200, 160))
    c.ell(128, 182, 21, 21, (60, 52, 66), w=1.3)
    for a in (-90, 30, 150):
        c.ell(128 + cos(a) * 11, 182 + sin(a) * 11, 6.5, 6.5, (30, 24, 36), w=1.2)
    save(c.out(), 'gate')

    # arco de entrada a la cripta (192x192)
    c = C(192, 192)
    st = (150, 146, 140)
    c.ell(96, 184, 90, 8, (0, 0, 0, 70), None)
    c.rr(64, 60, 128, 132, 3, (16, 12, 22))
    for x0 in (10, 128):
        c.rr(x0, 44, x0 + 54, 188, 4, st)
        for y in range(70, 186, 28): c.line([(x0 + 3, y), (x0 + 51, y)], sh(st, 0.7), 1.4, False)
        c.rr(x0 - 4, 176, x0 + 58, 190, 3, sh(st, 0.86))
        c.hl(x0 + 16, 110, 8, 50, 26)
    c.poly([(6, 60), (30, 10), (162, 10), (186, 60)], sh(st, 1.05))
    c.poly([(64, 60), (76, 34), (116, 34), (128, 60)], (16, 12, 22))
    c.glow(96, 26, 10, (255, 150, 60), 0.8)
    c.poly([(96, 14), (104, 24), (96, 34), (88, 24)], (255, 176, 80))
    r = random.Random(8)
    for _ in range(14):
        x, y = r.uniform(12, 180), r.uniform(14, 180)
        if 62 < x < 130 and y > 34: continue
        c.ell(x, y, 4, 2.6, (86, 116, 76), None)
    save(c.out(), 'arch')

    # columnas, estatua, altar
    c = C(64, 128)
    c.ell(32, 118, 22, 7, (0, 0, 0, 70), None)
    st = (164, 160, 152)
    c.rr(12, 104, 52, 122, 3, sh(st, 0.9)); c.rr(18, 22, 46, 108, 3, st); c.rr(12, 8, 52, 26, 3, sh(st, 1.06))
    for x in (25, 32, 39): c.line([(x, 28), (x, 102)], sh(st, 0.76), 1.4, False)
    c.hl(23, 60, 3, 34, 40)
    save(c.out(), 'column')
    c = C(64, 64)
    c.ell(32, 54, 22, 7, (0, 0, 0, 70), None)
    c.rr(12, 40, 52, 58, 3, sh(st, 0.9)); c.poly([(18, 44), (18, 22), (26, 14), (34, 24), (40, 12), (46, 20), (46, 44)], st)
    for x in (25, 32, 39): c.line([(x, 28), (x, 42)], sh(st, 0.76), 1.4, False)
    save(c.out(), 'column_broken')
    c = C(64, 128)
    c.ell(32, 118, 22, 7, (0, 0, 0, 70), None)
    st = (138, 142, 150)
    c.rr(10, 98, 54, 122, 3, sh(st, 0.82))
    c.poly([(18, 100), (20, 52), (44, 52), (46, 100)], st)
    c.ell(32, 40, 13, 14, st); c.chord(32, 40, 15, 16, 180, 360, sh(st, 0.9))
    c.ell(32, 43, 7, 8, (40, 38, 50))
    c.rr(29.5, 50, 34.5, 100, 1, sh(st, 1.15)); c.rr(22, 60, 42, 64, 1, sh(st, 1.15))
    save(c.out(), 'statue')
    c = C(128, 96)
    c.ell(64, 86, 56, 8, (0, 0, 0, 70), None)
    st = (168, 164, 170)
    c.rr(8, 44, 120, 90, 4, sh(st, 0.84)); c.rr(4, 30, 124, 50, 4, st)
    c.glow(64, 30, 24, (255, 220, 130), 0.5)
    c.poly([(64, 56), (74, 68), (64, 80), (54, 68)], (255, 220, 130))
    save(c.out(), 'altar')


# =============================================================== MAGIA / FX
def gen_fx():
    for name, cols in (('fire', ((255, 110, 36), (255, 186, 64), (255, 246, 210))),
                       ('bossfire', ((200, 50, 60), (255, 120, 60), (255, 230, 190)))):
        fr = []
        for t in range(4):
            r = random.Random(t)
            c = C(48, 48)
            c.glow(26, 24, 15, cols[0], 0.6)
            for i, col in enumerate(cols):
                k = 1 - i * 0.28
                j = r.uniform(-3, 3)
                c.poly([(4 + i * 7 + r.uniform(0, 4), 24 + j), (22, 24 - 9 * k - r.uniform(0, 2)), (31, 24 - 10 * k),
                        (31 + 10 * k, 24), (31, 24 + 10 * k), (22, 24 + 9 * k + r.uniform(0, 2))], col, None)
                c.ell(31, 24, 10 * k, 10 * k, col, None)
            fr.append(c.out())
        save(sheet(fr), name)
    fr = []
    for t in range(4):
        c = C(64, 64)
        g = c.sub()
        for i, (rx, w, al) in enumerate(((26, 5, 150), (19, 4, 190), (12, 3.4, 230))):
            off = (t * 5 + i * 9) % 20 - 10
            g.arc(24 + i * 6, 32, rx, rx * 1.02, -62 + off, 62 + off, (150 + i * 30, 240, 232, al), w)
        c.merge(g, 0.5)
        c.glow(40, 32, 8, (200, 255, 248), 0.5)
        fr.append(c.out())
    save(sheet(fr), 'wind')
    fr = []
    for t in range(5):
        r = random.Random(t + 40)
        c = C(64, 64)
        q = t / 4
        c.glow(32, 32, 10 + 16 * q, (255, 200, 120), 0.8 * (1 - q * 0.8))
        g = c.sub()
        for i in range(7):
            a = i * 51 + t * 12
            d = 6 + 18 * q
            g.ell(32 + cos(a) * d, 32 + sin(a) * d, 8 - 5.5 * q, 8 - 5.5 * q, (255, 236 - int(90 * q), 190 - int(120 * q), int(255 * (1 - q * 0.75))), None)
        g.arc(32, 32, 8 + 20 * q, 8 + 20 * q, 0, 360, (255, 255, 255, int(200 * (1 - q))), 2.5)
        c.merge(g, 0.4)
        fr.append(c.out())
    save(sheet(fr), 'boom')
    # punto suave para partículas y luz
    for name, size in (('dot', 32), ('glow', 256)):
        im = Image.new('RGBA', (size, size), (255, 255, 255, 0))
        px = im.load()
        for y in range(size):
            for x in range(size):
                d = math.hypot(x - size / 2 + .5, y - size / 2 + .5) / (size / 2)
                a = max(0, 1 - d)
                px[x, y] = (255, 255, 255, int(255 * a * a))
        save(im, name)


# =============================================================== INTERFAZ
def heart(c, x, y, s, col, ol=OUTL):
    pts = []
    for i in range(41):
        a = math.tau * i / 40
        hx = 16 * math.sin(a) ** 3
        hy = -(13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))
        pts.append((x + hx * s, y + hy * s))
    c.poly(pts, col, ol, 1.8)


def gen_ui():
    fr = []
    for kind in ('full', 'half', 'empty'):
        c = C(40, 40)
        heart(c, 20, 19, 1.0, (60, 40, 54))
        if kind != 'empty':
            g = c.sub()
            heart(g, 20, 19, 1.0, (214, 56, 66))
            if kind == 'half':
                g.d.rectangle([20 * g.k, 0, 40 * g.k, 40 * g.k], fill=(0, 0, 0, 0))
            c.merge(g)
            heart(c, 20, 19, 1.0, None)
            c.hl(13, 12, 4, 3, 130)
        fr.append(c.out())
    save(sheet(fr), 'hearts', UI)

    fr = []
    for i in range(4):
        c = C(48, 48)
        c.rr(2, 2, 46, 46, 9, (34, 30, 44)); c.rr(5, 5, 43, 43, 7, None, (96, 88, 116), 1.2)
        if i == 0:
            flame(c, 24, 36, 1.25, 2)
        elif i == 1:
            g = c.sub()
            for rx, a0 in ((15, 200), (10, 20), (5, 200)):
                g.arc(24, 24, rx, rx, a0, a0 + 250, (150, 240, 232), 3.2)
            c.merge(g); c.glow(24, 24, 10, (150, 240, 232), 0.35)
        elif i == 2:
            c.glow(24, 24, 15, (190, 130, 255), 0.5)
            c.poly([(6, 24), (24, 12), (42, 24), (24, 36)], (236, 226, 250))
            c.ell(24, 24, 8, 8, (150, 96, 220)); c.ell(24, 24, 3.4, 3.4, (30, 20, 44), None)
            c.ell(22, 22, 1.4, 1.4, (255, 255, 255), None)
        else:
            c.glow(24, 24, 16, (255, 214, 110), 0.5)
            c.poly([(10, 10), (38, 10), (38, 25), (24, 40), (10, 25)], (240, 200, 96))
            c.poly([(24, 14), (24, 35), (14, 24), (14, 14)], (255, 232, 160), None)
            c.poly([(10, 10), (38, 10), (38, 25), (24, 40), (10, 25)], None)
        fr.append(c.out())
    save(sheet(fr), 'spells', UI)

    fr = []
    def key(c, col, big=False):
        c.ell(13, 14, 8, 8, col); c.ell(13, 14, 3.2, 3.2, (0, 0, 0, 0), OUTL, 1.4)
        c.oline([(19, 19), (32, 32)], col, 3.4, 1.4)
        c.oline([(27, 27), (31, 23)], col, 2.8, 1.3); c.oline([(31, 31), (35, 27)], col, 2.8, 1.3)
        if big: c.ell(13, 14, 2.6, 2.6, (220, 60, 50), None)
    c = C(40, 40); key(c, (214, 190, 120)); fr.append(c.out())
    c = C(40, 40); c.glow(20, 20, 14, (255, 150, 60), 0.5); key(c, (255, 170, 70), True); fr.append(c.out())
    c = C(40, 40)
    c.rr(6, 8, 34, 32, 3, (226, 206, 160)); c.line([(11, 14), (18, 20), (24, 15), (29, 24)], (150, 90, 60), 1.4)
    c.line([(26, 25), (30, 21)], (190, 50, 50), 1.6); c.line([(26, 21), (30, 25)], (190, 50, 50), 1.6)
    fr.append(c.out())
    c = C(40, 40); c.glow(20, 20, 16, (255, 190, 90), 0.7)
    c.poly([(20, 4), (33, 30), (9, 34)], (255, 214, 120)); c.poly([(20, 4), (20, 31), (9, 34)], (255, 240, 190), None)
    c.poly([(20, 4), (33, 30), (9, 34)], None); fr.append(c.out())
    c = C(40, 40); c.glow(20, 20, 15, (255, 220, 130), 0.6); heart(c, 20, 19, 1.0, (240, 200, 96)); heart(c, 20, 19.5, 0.68, (214, 56, 66), OUTL)
    c.hl(15, 14, 3, 2, 140); fr.append(c.out())
    c = C(40, 40); c.glow(20, 24, 12, (90, 160, 255), 0.5)
    c.ell(20, 25, 10, 10, (70, 140, 236)); c.rr(16, 8, 24, 17, 2, (190, 220, 246)); c.rr(15, 5, 25, 10, 2, (150, 110, 70))
    c.hl(16, 22, 3, 4, 130); fr.append(c.out())
    c = C(40, 40); heart(c, 20, 19, 0.8, (214, 56, 66)); c.hl(15, 14, 3, 2, 130); fr.append(c.out())
    save(sheet(fr), 'items', UI)
    save(fr[3].resize((64, 64), Image.LANCZOS), 'favicon', UI)

    # viñeta
    w, h = 320, 192
    im = Image.new('RGBA', (w, h), (8, 6, 14, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            d = math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2))
            a = max(0, min(1, (d - 0.62) / 0.75))
            px[x, y] = (8, 6, 14, int(210 * a * a))
    save(im.resize((1280, 768), Image.BICUBIC), 'vignette', UI)

    # fondo del título
    W, H = 1280, 832
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(18 + 70 * t ** 2), int(16 + 34 * t ** 1.5), int(40 + 36 * t)))
    c = C(W, H, 1, 2)
    c.im.paste(im.resize((W * 2, H * 2)))
    r = random.Random(11)
    for _ in range(140):
        x, y = r.uniform(0, W), r.uniform(0, H * 0.55)
        c.ell(x, y, r.uniform(0.6, 1.6), r.uniform(0.6, 1.6), (230, 226, 250, r.randint(90, 220)), None)
    c.glow(1130, 120, 140, (255, 196, 130), 0.35)
    moon = c.sub()
    moon.ell(1130, 120, 56, 56, (250, 232, 200), None)
    moon.ell(1152, 106, 50, 50, (0, 0, 0, 0), None)     # recorte: luna creciente transparente
    c.merge(moon)
    far = (40, 34, 66)
    c.poly([(0, 560), (160, 470), (330, 540), (520, 450), (700, 530), (900, 440), (1100, 520), (1280, 460), (1280, 832), (0, 832)], far, None)
    ck = (20, 16, 34)
    c.poly([(470, 600), (470, 380), (500, 380), (500, 330), (520, 330), (520, 300), (535, 260), (550, 300), (550, 330), (570, 330),
            (570, 400), (620, 400), (620, 280), (636, 280), (636, 240), (652, 190), (668, 240), (668, 280), (684, 280), (684, 400),
            (740, 400), (740, 350), (756, 350), (756, 320), (770, 285), (784, 320), (784, 350), (800, 350), (800, 600)], ck, None)
    for x, y in ((644, 300), (530, 350), (764, 372), (652, 360)):
        c.glow(x, y, 9, (255, 150, 60), 0.9); c.rr(x - 3, y - 6, x + 3, y + 6, 2, (255, 200, 110), None)
    c.poly([(0, 640), (200, 580), (420, 610), (640, 585), (860, 615), (1080, 575), (1280, 620), (1280, 832), (0, 832)], (14, 12, 26), None)
    for _ in range(26):
        x = r.uniform(0, W); y = r.uniform(600, 650); hh = r.uniform(40, 90)
        c.poly([(x, y - hh), (x + hh * 0.3, y + 10), (x - hh * 0.3, y + 10)], (10, 9, 20), None)
    for _ in range(9):
        g = c.sub(); g.ell(r.uniform(0, W), r.uniform(560, 700), r.uniform(160, 320), r.uniform(14, 30), (150, 130, 170, 60), None)
        c.merge(g, 18)
    save(c.out().convert('RGB'), 'title', UI)


def main():
    save(human_sheet(HERO, extra=True), 'hero')
    save(human_sheet(KNIGHT), 'knight')
    save(human_sheet(BOSS, size=160), 'boss')
    for k, p in NPCS.items():
        save(human_sheet(p, cols=8), 'npc_' + k)
    gen_slime(); gen_bat(); gen_torch(); gen_objects(); gen_trees(); gen_buildings(); gen_fx(); gen_ui()
    print('sprites ok')


if __name__ == '__main__':
    main()
