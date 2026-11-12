#!/usr/bin/env python3
"""Genera los mapas en formato JSON de Tiled a partir de pantallas en ASCII.

Cada pantalla mide 20 x 12 tiles. El script resuelve los autotiles (bordes de
camino, agua y bosque; cara frontal de los muros), rellena la capa 'solid'
con bloqueos invisibles y crea la capa de objetos con sus propiedades.

    python3 tools/gen_maps.py            -> assets/maps/*.json
    python3 tools/gen_maps.py --preview  -> además tools/preview_*.png

Los JSON resultantes se pueden abrir y editar con Tiled.
"""
import json, os, random, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.join(HERE, '..', 'assets', 'maps')
META = json.load(open(os.path.join(HERE, 'tiles_index.json')))
IDX = META['index']
TS, SW, SH = 64, 20, 12
BITS = dict(N=1, E=2, S=4, W=8, NE=16, SE=32, SW=64, NW=128)
NB = dict(N=(0, -1), E=(1, 0), S=(0, 1), W=(-1, 0), NE=(1, -1), SE=(1, 1), SW=(-1, 1), NW=(-1, -1))


def canon(m):
    for dg, a, b in (('NE', 'N', 'E'), ('SE', 'S', 'E'), ('SW', 'S', 'W'), ('NW', 'N', 'W')):
        if m & BITS[dg] and (m & BITS[a] or m & BITS[b]):
            m &= ~BITS[dg]
    return m


# ------------------------------------------------------------------ leyenda
TERRAIN = {'.': 'base', ',': 'fgrass', ':': 'path', '~': 'water', '_': 'flag', '#': 'wall', 'X': 'cwall',
           '>': 'stairs_down', '<': 'stairs_up', 'r': 'dred', 'p': 'pit', 'x': 'pit', 'G': 'cwall', 'A': 'flag'}
WALK = {'grass', 'fgrass', 'path', 'flag', 'dfloor', 'dred'}
# objetos de escenario: (tipo, sprite, sólido)
SCENERY = {'R': 'rock', 'S': 'stump', 'F': 'fence', 'W': 'well', 'C': 'column', 'j': 'column_broken'}
SOLID_CHARS = set('TtRSFWCjUHhGAa')
SIMPLE = {'b': 'bush', 'z': 'bramble', 'f': 'fog', 'o': 'pot', 'B': 'block', 'L': 'plate', 'Y': 'crystal',
          'c': 'chest', 's': 'sign'}
ENEMY = {'m': 'slime', 'v': 'bat', 'K': 'knight'}


# ------------------------------------------------------------------ SUPRAMUNDO
OVERWORLD = dict(
    name='overworld', kind='overworld', cols=3, rows=3,
    screens={
        (0, 0): dict(base='grass', trees=('tree_oak', 'tree_dark'), rows=[
            "TTTTTTTTTTTTTTTTTTTT",
            "T..................T",
            "T...C....aa....C...T",
            "T........c.........T",
            "T...U....__....U...T",
            "T.......____.......T",
            "T...C...____...C...T",
            "T........__........T",
            "T..T.....::.....T..T",
            "T........::........T",
            "T....b...::...b....T",
            "TTTTTTTTT::TTTTTTTTT"],
            props={'c': dict(id='egida', item='egida', ox=32)}),
        (1, 0): dict(base='grass', trees=('tree_oak', 'tree_dead'), rows=[
            "XXXXXXXXXXXXXXXXXXXX",
            "XXXXXXXXXXXXXXXXXXXX",
            "XXXXXXXXXXXXXXXXXXXX",
            "XXXXXXXXGGGGXXXXXXXX",
            "t..U____________U..t",
            "t...____________...t",
            "t.t.__K______K__.t.t",
            "t...____________...t",
            "t.....t..::..t.....t",
            "t..t.....::.....t..t",
            "t........::........t",
            "ttttttttt::ttttttttt"]),
        (2, 0): dict(base='fgrass', trees=('tree_dark', 'tree_pine'), rows=[
            "TTTTTTTTTTTTTTTTTTTT",
            "T,,#####AAA######,,T",
            "T,,_j___AAA____C_,,T",
            "T,,C____A>A_____j,,T",
            "T,,______Q_______,,T",
            "T,,__K________K__,,T",
            "T,,j_____::_____C,,T",
            "T,,,,,___::___,,,,,T",
            "T,t,,,,,,::,,,,,,t,T",
            "T,,,,b,,,::,,,U,,,,T",
            "T,,,,,,,,::,,,,,,,,T",
            "TTTTTTTTT::TTTTTTTTT"],
            props={'Q': dict(name='from_cripta')}),
        (0, 1): dict(base='grass', trees=('tree_oak', 'tree_dead'), rows=[
            "ttttttttt::ttttttttt",
            "t.......tfft.......t",
            "t..t.....::....t...t",
            "t........::........t",
            "t....m...::....K...t",
            "t........:::::::::::",
            "t..R.....:::::::::::",
            "t........::........t",
            "t.t..m...::...t....t",
            "t........::....b...t",
            "t...t....::........t",
            "TTTTTTTTT::TTTTTTTTT"]),
        (1, 1): dict(base='grass', trees=('tree_oak', 'tree_dark'), rows=[
            "TTTTTTTTT::TTTTTTTTT",
            "T........::....T...T",
            "T..T.....::........T",
            "T........::...R....T",
            "T.....s..::5.......T",
            ":::::::::::........T",
            ":::::::::::..m.....T",
            "T........::......T.T",
            "T..b..m..::........T",
            "T........::..b.....T",
            "T.T......::........T",
            "TTTTTTTTT::TTTTTTTTT"],
            props={'s': dict(text='sign_cruce'), '5': dict(type='npc', who='tobias', ground='grass')}),
        (2, 1): dict(base='fgrass', trees=('tree_dark', 'tree_pine'), rows=[
            "TTTTTTTTT::TTTTTTTTT",
            "T,,,,,,,,::,,,,t,,,T",
            "T,t,,v,,,::,,,,,,,,T",
            "T,,,,,,,,::,,,S4,,,T",
            "T,,T,,,,,::,,,,,,t,T",
            "T,,,,,,t,::,,,,,,,,T",
            "T,m,,,,,,::,,T,,,,,T",
            "T,,,,t,,,::,,,,,m,,T",
            "T,,,,,,,,::,,,,,,,,T",
            "T,T,,,b,,::,b,,,t,,T",
            "T,,,,,,,,::,,,,,,,,T",
            "TTTTTTTTT::TTTTTTTTT"],
            props={'4': dict(type='npc', who='oswin')}),
        (0, 2): dict(base='grass', trees=('tree_oak', 'tree_dark'), rows=[
            "TTTTTTTTT::TTTTTTTTT",
            "T........::........T",
            "T.~~~~~~.::...T....T",
            "T~~~~~~~~::........T",
            "T~~~7~~~~::....m...T",
            "T~~~.~~~~:::::::::::",
            "T~~~.~~~~:::::::::::",
            "T.~~.~~~.....s.....T",
            "T........b.........T",
            "T..m.........T..b..T",
            "T........T.........T",
            "TTTTTTTTTTTTTTTTTTTT"],
            props={'7': dict(type='chest', id='lago', item='heart', hidden=True, ground='grass'),
                   's': dict(text='sign_lago')}),
        (1, 2): dict(base='grass', trees=('tree_oak', 'tree_oak'), rows=[
            "TTTTTTTTT::TTTTTTTTT",
            "T........::........T",
            "T........::........T",
            "T.Hhhh...::..Hhhh..T",
            "T.hhhh...::..hhhh..T",
            "::::1:::::::::2:::z:",
            "::::::::::::::::::z:",
            "T.....W..::...3....T",
            "T........P:.FFFFFF.T",
            "T.Hhhh...::...bb.F.T",
            "T.hhhh.s.::.FFFFFF.T",
            "TTTTTTTTTTTTTTTTTTTT"],
            props={'1': dict(type='npc', who='maelis'), '2': dict(type='npc', who='bruna'),
                   '3': dict(type='npc', who='lina'), 's': dict(text='sign_brezal'), 'P': dict(name='start')}),
        (2, 2): dict(base='fgrass', trees=('tree_dark', 'tree_pine'), rows=[
            "TTTTTTTTT::TTTTTTTTT",
            "T,,,t,,,,::,,,,T,,,T",
            "T,T,,,m,,::,,,,,,t,T",
            "T,,,,T,,,::,,t,,,,,T",
            "T,,,,,,,,::,,,,,m,,T",
            "::::::::::::,,,,,T,T",
            ":::::::::::,,,b,,,,T",
            "T,,t,,,,,,,,,,,T,,,T",
            "T,,,,,m,,S,,,t,,,,,T",
            "T,T,,,,,,,,b,,,,,,,T",
            "T,,,,t,,T,,,,,,T,,,T",
            "TTTTTTTTTTTTTTTTTTTT"]),
    })

# ------------------------------------------------------------------ CRIPTA
W20 = "#" * 20
CRIPTA = dict(
    name='cripta', kind='dungeon', cols=3, rows=3,
    screens={
        (0, 0): dict(base='dfloor', rows=[
            W20,
            "#..I.....c......I..#",
            "#..................#",
            "#pppppppppppppxxppp#",
            "#pppppppppppppxxppp#",
            "#pppppppppppppxxppp#",
            "#pppppppppppppxxppp#",
            "#..................#",
            "#....o........o....#",
            "#..................#",
            "#..................#",
            "#########..#########"],
            props={'c': dict(id='bosskey', item='bossKey'), 'x': dict(id='b_abismo', hidden=True)}),
        (1, 0): dict(base='dred', rows=[
            W20,
            "#rrrrrrrrrrrrrrrrrr#",
            "#rIrrrrrrrrrrrrrrIr#",
            "#rrrrrrrrrrrrrrrrrr#",
            "#rrrrrrrrrZrrrrrrrr#",
            "#rrrrrrrrrrrrrrrrrr#",
            "#rrrrrrrrrrrrrrrrrr#",
            "#rrrrrrrrrrrrrrrrrr#",
            "#rrrrrrrrrrrrrrrrrr#",
            "#rIrrrrrrrrrrrrrrIr#",
            "#rrrrrrrrrrrrrrrrrr#",
            "#########66#########"],
            props={'6': dict(type='door', kind='bars', ambush=True)}),
        (2, 0): dict(base='dfloor', rows=[
            W20,
            "#..................#",
            "#.I......c.......I.#",
            "#..................#",
            "#....K........v....#",
            "#..................#",
            "#.......v..........#",
            "#..............m...#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#########55#########"],
            props={'c': dict(id='vendaval', item='vendaval', appears_on='clear:2,0'),
                   '5': dict(type='door', kind='bars', ambush=True)}),
        (0, 1): dict(base='dfloor', rows=[
            "#########..#########",
            "#........ff........#",
            "#..................#",
            "#..####............#",
            "#..#c.4......L.....#",
            "#..####.............",
            "#.........B.........",
            "#..................#",
            "#....o.......o.....#",
            "#..................#",
            "#..................#",
            W20],
            props={'c': dict(id='key1', item='key'), 'L': dict(id='p1'),
                   '4': dict(type='door', kind='bars', opens_on='plate:p1')}),
        (1, 1): dict(base='dfloor', rows=[
            "#########22#########",
            "#..................#",
            "#..I...U........I..#",
            "#..................#",
            "#..................#",
            "...................3",
            "...................3",
            "#.......K..........#",
            "#..................#",
            "#..o............o..#",
            "#..................#",
            "#########..#########"],
            props={'2': dict(type='door', kind='boss'), '3': dict(type='door', kind='lock'),
                   'U': dict(text='edric')}),
        (2, 1): dict(base='dfloor', rows=[
            "#########..#########",
            "#..............Y...#",
            "#ppppppppxxpppppppp#",
            "#ppppppppxxpppppppp#",
            "#..................#",
            "...................#",
            "...................#",
            "#....o.............#",
            "#..........m.......#",
            "#..I............I..#",
            "#..................#",
            W20],
            props={'Y': dict(id='c1'), 'x': dict(id='b_cristal', opens_on='crystal:c1')}),
        (0, 2): dict(base='dfloor', rows=[
            W20,
            "#..................#",
            "#.I......c.......I.#",
            "#..................#",
            "#....m.......v.....#",
            "#...................",
            "#...................",
            "#.......m..........#",
            "#..v...........o...#",
            "#..................#",
            "#..o...............#",
            W20],
            props={'c': dict(id='map', item='map')}),
        (1, 2): dict(base='dfloor', rows=[
            "#########11#########",
            "#..................#",
            "#.I..............I.#",
            "#.....i......i.....#",
            "#..................#",
            "...................#",
            "...................#",
            "#..................#",
            "#..o............o..#",
            "#........P.........#",
            "#........<<........#",
            W20],
            props={'1': dict(type='door', kind='bars', opens_on='torches:vest'), 'i': dict(group='vest'),
                   'P': dict(name='entry')}),
        (2, 2): dict(base='dwall', rows=[W20] * 12),
    })


# ------------------------------------------------------------------ construcción
def build(spec):
    rng = random.Random(hash(spec['name']) & 0xffff if False else len(spec['name']) * 97)
    W, H = spec['cols'] * SW, spec['rows'] * SH
    dungeon = spec['kind'] == 'dungeon'
    ch = [[' '] * W for _ in range(H)]
    scr = {}
    for (sc, sr), s in spec['screens'].items():
        assert len(s['rows']) == SH, (spec['name'], sc, sr, len(s['rows']))
        for j, row in enumerate(s['rows']):
            assert len(row) == SW, (spec['name'], sc, sr, j, len(row), row)
            for i, c in enumerate(row):
                ch[sr * SH + j][sc * SW + i] = c
    def S(x, y):
        return spec['screens'][(x // SW, y // SH)]

    def inb(x, y):
        return 0 <= x < W and 0 <= y < H

    # --- terreno por celda
    ter = [[None] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            c, s = ch[y][x], S(x, y)
            t = TERRAIN.get(c)
            if t == 'base': t = s['base']
            if t == 'wall' and dungeon: t = 'dwall'
            ter[y][x] = t
    for y in range(H):
        for x in range(W):
            if ter[y][x] is not None: continue
            c, s = ch[y][x], S(x, y)
            pr = s.get('props', {}).get(c, {})
            if 'ground' in pr:
                ter[y][x] = pr['ground']
            elif c in SOLID_CHARS:
                ter[y][x] = s['base']
            else:
                cnt = Counter()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if inb(x + dx, y + dy) and ter[y + dy][x + dx] in WALK:
                        cnt[ter[y + dy][x + dx]] += 1
                ter[y][x] = cnt.most_common(1)[0][0] if cnt else s['base']

    def mask(x, y, other):
        m = 0
        for k, (dx, dy) in NB.items():
            if inb(x + dx, y + dy) and other(ter[y + dy][x + dx]):
                m |= BITS[k]
        return canon(m)

    ground = [0] * (W * H)
    for y in range(H):
        for x in range(W):
            t = ter[y][x]
            if t == 'grass':
                name = rng.choices(['grass0', 'grass1', 'grass2', 'grass3'], [5, 4, 4, 1])[0]
            elif t == 'fgrass':
                m = mask(x, y, lambda o: o == 'grass')
                name = f'fgrass_g:{m}' if m else rng.choice(['fgrass0', 'fgrass1', 'fgrass2'])
            elif t == 'path':
                m = mask(x, y, lambda o: o in ('grass', 'fgrass', 'water'))
                nf = sum(1 for dx, dy in NB.values() if inb(x + dx, y + dy) and ter[y + dy][x + dx] == 'fgrass')
                ng = sum(1 for dx, dy in NB.values() if inb(x + dx, y + dy) and ter[y + dy][x + dx] == 'grass')
                name = f"path_{'f' if nf > ng else 'g'}:{m}"
            elif t == 'water':
                name = f"water_g:{mask(x, y, lambda o: o != 'water')}"
            elif t == 'flag':
                name = rng.choices(['flag0', 'flag1', 'flag2'], [5, 3, 2])[0]
            elif t in ('wall', 'cwall', 'dwall'):
                below = ter[y + 1][x] if inb(x, y + 1) else t
                pre = {'wall': 'wall', 'cwall': 'cwall', 'dwall': 'dwall'}[t]
                name = pre + ('_top' if below == t else '_front')
            elif t == 'dfloor':
                name = rng.choices(['dfloor0', 'dfloor1', 'dfloor2'], [5, 4, 1])[0]
            elif t == 'dred':
                name = 'dfloor3'
            elif t == 'pit':
                name = 'pit' if (inb(x, y - 1) and ter[y - 1][x] == 'pit') else 'pit_edge'
            else:
                name = t   # stairs_down / stairs_up
            ground[y * W + x] = IDX[name] + 1

    # --- objetos y capa sólida
    solid = [0] * (W * H)
    objs = []
    BL = IDX['blocker'] + 1

    def add(typ, x, y, w=1, h=1, name='', **props):
        o = dict(id=len(objs) + 1, name=name, type=typ, x=x * TS, y=y * TS, width=w * TS, height=h * TS,
                 rotation=0, visible=True)
        pl = []
        for k, v in props.items():
            if v is None: continue
            pt = 'bool' if isinstance(v, bool) else 'int' if isinstance(v, int) else 'float' if isinstance(v, float) else 'string'
            pl.append(dict(name=k, type=pt, value=v))
        if pl: o['properties'] = pl
        objs.append(o)

    seen = set()

    def group(x, y, c):
        """Celdas contiguas con el mismo carácter -> rectángulo."""
        x1 = x
        while inb(x1 + 1, y) and ch[y][x1 + 1] == c and (x1 + 1) // SW == x // SW: x1 += 1
        y1 = y
        while inb(x, y1 + 1) and ch[y1 + 1][x] == c and (y1 + 1) // SH == y // SH: y1 += 1
        for yy in range(y, y1 + 1):
            for xx in range(x, x1 + 1):
                seen.add((xx, yy))
        return x1 - x + 1, y1 - y + 1

    for y in range(H):
        for x in range(W):
            c, s = ch[y][x], S(x, y)
            if c in SOLID_CHARS: solid[y * W + x] = BL
            if (x, y) in seen or c in TERRAIN and c not in '><xGA': continue
            pr = dict(s.get('props', {}).get(c, {}))
            pr.pop('ground', None)
            uid = f"{spec['name']}:{x},{y}"
            if c in 'Tt':
                add('tree', x, y, sprite=s['trees'][0 if c == 'T' else 1])
            elif c in SCENERY:
                add('deco', x, y, sprite=SCENERY[c])
            elif c == 'U':
                if 'text' in pr: add('sign', x, y, sprite='statue', text=pr['text'])
                else: add('deco', x, y, sprite='statue')
            elif c == 'H':
                add('house', x, y, 4, 2, sprite='house_a' if (x + y) % 2 == 0 else 'house_b')
            elif c == 'G':
                w, h = group(x, y, 'G')
                add('gate', x, y, w, h, sprite='gate', text='gate')
            elif c == 'a':
                w, h = group(x, y, 'a')
                add('deco', x, y, w, h, sprite='altar')
            elif c == '>':
                add('arch', x - 1, y - 2, 3, 3, sprite='arch')
                add('warp', x, y, to='cripta', spawn='entry')
            elif c == '<':
                w, h = group(x, y, '<')
                add('warp', x, y, w, h, to='overworld', spawn='from_cripta')
            elif c == 'x':
                w, h = group(x, y, 'x')
                add('bridge', x, y, w, h, **pr)
            elif c in 'PQ':
                add('spawn', x, y, name=pr.get('name', 'start'))
            elif c in ENEMY:
                add('enemy', x, y, kind=ENEMY[c])
            elif c == 'Z':
                add('boss', x, y)
            elif c in 'iI':
                add('torch', x, y, id=uid, lit=(c == 'I'), group=pr.get('group'))
            elif c in SIMPLE:
                pr.setdefault('id', uid)
                add(SIMPLE[c], x, y, **pr)
            elif c.isdigit():
                typ = pr.pop('type')
                w, h = group(x, y, c) if typ == 'door' else (1, 1)
                pr.setdefault('id', uid)
                add(typ, x, y, w, h, **pr)
            elif c in 'hA':
                pass
            else:
                raise SystemExit(f'carácter desconocido {c!r} en {uid}')

    tiles = [dict(id=int(k), properties=[dict(name=n, type='bool', value=v) for n, v in pr.items()])
             for k, pr in META['props'].items()]
    def layer(i, name, data):
        return dict(id=i, name=name, type='tilelayer', width=W, height=H, x=0, y=0, opacity=1, visible=True, data=data)

    m = dict(type='map', version='1.10', tiledversion='1.10.2', orientation='orthogonal', renderorder='right-down',
             width=W, height=H, tilewidth=TS, tileheight=TS, infinite=False, compressionlevel=-1,
             nextlayerid=4, nextobjectid=len(objs) + 1,
             properties=[dict(name='kind', type='string', value=spec['kind']),
                         dict(name='screen_w', type='int', value=SW), dict(name='screen_h', type='int', value=SH)],
             tilesets=[dict(firstgid=1, name='tiles', image='../tilesets/tiles.png', imagewidth=META['width'],
                            imageheight=META['height'], tilewidth=TS, tileheight=TS, margin=META['margin'],
                            spacing=META['spacing'], columns=META['columns'], tilecount=META['count'], tiles=tiles)],
             layers=[layer(1, 'ground', ground), layer(2, 'solid', solid),
                     dict(id=3, name='objects', type='objectgroup', draworder='topdown', x=0, y=0, opacity=1,
                          visible=True, objects=objs)])
    os.makedirs(MAPS, exist_ok=True)
    with open(os.path.join(MAPS, spec['name'] + '.json'), 'w') as f:
        json.dump(m, f, separators=(',', ':'))
    print(spec['name'], f'{W}x{H}', len(objs), 'objetos')
    return m


def preview(m, name):
    from PIL import Image
    sheet = Image.open(os.path.join(HERE, '..', 'assets', 'tilesets', 'tiles.png'))
    W, H = m['width'], m['height']
    im = Image.new('RGB', (W * TS, H * TS))
    for i, g in enumerate(m['layers'][0]['data']):
        t = g - 1
        sx, sy = 1 + (t % 16) * 66, 1 + (t // 16) * 66
        im.paste(sheet.crop((sx, sy, sx + TS, sy + TS)), ((i % W) * TS, (i // W) * TS))
    spr = os.path.join(HERE, '..', 'assets', 'sprites')
    FR = dict(enemy=(64, 64), torch=(64, 96), chest=(64, 64), crystal=(64, 64), plate=(64, 64), fog=(64, 64), npc=(96, 96))
    objs = sorted(m['layers'][2]['objects'], key=lambda o: o['y'] + o['height'])
    for o in objs:
        p = {q['name']: q['value'] for q in o.get('properties', [])}
        key = p.get('sprite') or {'enemy': p.get('kind'), 'npc': 'npc_' + p.get('who', ''), 'door': {'bars': 'bars', 'lock': 'lockdoor', 'boss': 'bossdoor'}.get(p.get('kind'))}.get(o['type'], o['type'])
        fn = os.path.join(spr, f'{key}.png')
        if not os.path.exists(fn) or p.get('hidden') or o['type'] in ('bridge',): continue
        s = Image.open(fn)
        fw, fh = FR.get(o['type'], s.size)
        if o['type'] == 'torch' and p.get('lit'): s = s.crop((fw, 0, fw * 2, fh))
        else: s = s.crop((0, 0, fw, fh))
        if o['type'] == 'door':
            for yy in range(o['height'] // TS):
                for xx in range(o['width'] // TS):
                    im.paste(s, (o['x'] + xx * TS, o['y'] + yy * TS), s)
            continue
        x = o['x'] + o['width'] // 2 - fw // 2
        y = o['y'] + o['height'] - fh + (12 if o['type'] in ('tree',) else 0)
        im.paste(s, (x, y), s)
    im.save(os.path.join(HERE, f'preview_{name}.png'))


if __name__ == '__main__':
    for spec in (OVERWORLD, CRIPTA):
        m = build(spec)
        if '--preview' in sys.argv:
            preview(m, spec['name'])
