"""Build compact data for the Galaxy Above app from d3-celestial + geonamescache."""
import json, math, base64, io, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

D = sys.argv[1]          # d3-celestial data dir
G = sys.argv[2]          # geonamescache data dir
OUT = sys.argv[3]

T = np.array([[-0.0548755604, -0.8734370902, -0.4838350155],
              [ 0.4941094279, -0.4448296300,  0.7469822445],
              [-0.8676661490, -0.1980763734,  0.4559837762]])

def eq_vec(ra, dec):
    ra, dec = np.radians(ra), np.radians(dec)
    return np.stack([np.cos(dec)*np.cos(ra), np.cos(dec)*np.sin(ra), np.sin(dec)], -1)

def gal_to_eq(l, b):
    g = eq_vec(l, b)
    e = g @ T            # inverse of orthogonal T is T^T: e = T^T g  -> row-vector g @ T
    ra = math.degrees(math.atan2(e[1], e[0])) % 360
    dec = math.degrees(math.asin(max(-1, min(1, e[2]))))
    return ra, dec

def eq_to_gal(ra, dec):
    g = T @ eq_vec(ra, dec)
    return math.degrees(math.atan2(g[1], g[0])) % 360, math.degrees(math.asin(g[2]))

# ---------- stars ----------
STAR_DIST = {'Sirius': '8.6', 'Canopus': '310', 'Arcturus': '37', 'Rigil Kentaurus': '4.4', 'Vega': '25',
 'Capella': '43', 'Rigel': '~860', 'Procyon': '11.5', 'Achernar': '140', 'Betelgeuse': '~550', 'Hadar': '~390',
 'Altair': '17', 'Acrux': '~320', 'Aldebaran': '65', 'Spica': '250', 'Antares': '~550', 'Pollux': '34',
 'Fomalhaut': '25', 'Deneb': '~2,600', 'Mimosa': '~280', 'Regulus': '79', 'Castor': '51', 'Gacrux': '88',
 'Bellatrix': '250', 'Polaris': '~430', 'Alnilam': '~2,000', 'Mirfak': '~510', 'Dubhe': '123'}
stars = json.load(open(f'{D}/stars.6.json'))['features']
names = json.load(open(f'{D}/starnames.json'))
EXTRA = {'Albireo', 'Sadr', 'Mizar', 'Alcor', 'Thuban', 'Algol', 'Eltanin', 'Sabik'}
st = []
star_names = []
for f in sorted(stars, key=lambda f: f['properties']['mag']):
    m = f['properties']['mag']
    if m > 5.5: continue
    ra, dec = f['geometry']['coordinates']
    try: bv = float(f['properties']['bv'])
    except: bv = 0.6
    idx = len(st)
    st.append([round(ra % 360, 3), round(dec, 3), round(m, 2), round(bv, 2)])
    n = names.get(str(f['id']), {}).get('name', '')
    if n and (m <= 3.0 or n in EXTRA) and n != 'Toliman':
        star_names.append([idx, n, None, STAR_DIST.get(n)])
print('stars', len(st), 'named', len(star_names))

# ---------- constellation lines + names ----------
lines = json.load(open(f'{D}/constellations.lines.json'))['features']
cl = []
for f in lines:
    for seg in f['geometry']['coordinates']:
        cl.append([v for p in seg for v in (round(p[0] % 360, 2), round(p[1], 2))])
cons = json.load(open(f'{D}/constellations.json'))['features']
cn = [[f['properties']['name'], round(f['geometry']['coordinates'][0] % 360, 2),
       round(f['geometry']['coordinates'][1], 2), int(f['properties']['rank'])] for f in cons]

# ---------- constellation lookup (planar test on unwrapped rings) ----------
bounds = json.load(open(f'{D}/constellations.bounds.json'))['features']
cname = {f['id']: f['properties']['name'] for f in cons}
rings = []
for f in bounds:
    for ring in f['geometry']['coordinates']:
        lon = [ring[0][0]]
        for p in ring[1:]:
            d = p[0] - lon[-1]
            d -= 360 * round(d / 360)
            lon.append(lon[-1] + d)
        if abs(lon[-1] - lon[0]) > 1: continue          # pole-enclosing ring: skip
        rings.append((f['id'], np.array(lon), np.array([p[1] for p in ring])))

def pip(x, y, xs, ys):
    inside = False
    j = len(xs) - 1
    for i in range(len(xs)):
        if (ys[i] > y) != (ys[j] > y):
            if x < (xs[j] - xs[i]) * (y - ys[i]) / (ys[j] - ys[i]) + xs[i]:
                inside = not inside
        j = i
    return inside

def constellation(ra, dec):
    lon = ((ra + 180) % 360) - 180
    for cid, xs, ys in rings:
        for off in (0, 360, -360):
            if pip(lon + off, dec, xs, ys):
                return cname.get(cid, cid)
    return None

for e in star_names:
    e[2] = constellation(st[e[0]][0], st[e[0]][1])
plane = []
for l in range(0, 360, 5):
    ra, dec = gal_to_eq(l, 0)
    plane.append(constellation(ra, dec))
print('plane', list(zip(range(0, 360, 5), plane)))

# ---------- curated objects ----------
# kind: core | pole | dir | neb | clus | dust | glob | gal
# pos: ('eq', ra, dec) or ('gal', l, b); dist in light-years (None = n/a)
OBJ = [
 ('gc', 'Galactic Center', 'core', ('eq', 266.4168, -29.0078), 26700,
  "The Milky Way's core and its black hole, Sagittarius A*, about 4 million times the Sun's mass. Dust hides it in visible light. The bright star clouds here are stars in front of it and the bulge, seen through gaps in the dust."),
 ('anti', 'Galactic Anticenter', 'dir', ('gal', 180, 0), None,
  "Directly away from the core. You look out through the Perseus and Outer arms toward the thin edge of the disk, so the Milky Way is fainter here."),
 ('fwd', 'Our orbital direction', 'dir', ('gal', 90, 0), None,
  "The Sun orbits the galaxy toward this point at about 230 km/s. One lap takes roughly 230 million years. Looking here, you look along our own Local Arm."),
 ('back', 'Trailing direction', 'dir', ('gal', 270, 0), None,
  "The point we are moving away from as the Sun orbits the galaxy."),
 ('ngp', 'North Galactic Pole', 'pole', ('gal', 0, 90), None,
  "Straight up out of the galactic disk. There are few stars and little dust this way, so you see deep into intergalactic space. The Virgo and Coma galaxy clusters lie near here."),
 ('sgp', 'South Galactic Pole', 'pole', ('gal', 0, -90), None,
  "Straight down out of the galactic disk, in Sculptor. The view this way is clear of the Milky Way's dust and stars."),
 ('apex', 'Solar apex', 'dir', ('eq', 271.0, 30.0), None,
  "The direction the Sun is moving relative to the stars around it, at about 20 km/s. It lies near Vega."),
 ('m8', 'Lagoon Nebula (M8)', 'neb', ('eq', 270.92, -24.38), 4100,
  "A star-forming cloud in the Sagittarius Arm, the next spiral arm inward from ours. Visible to the eye from a dark site."),
 ('m16', 'Eagle Nebula (M16)', 'neb', ('eq', 274.70, -13.81), 5700,
  "Home of the Pillars of Creation, in the Sagittarius Arm."),
 ('m24', 'Sagittarius Star Cloud (M24)', 'clus', ('eq', 274.20, -18.50), 10000,
  "A gap in the dust lets you see a dense patch of stars about 10,000 light-years away, on the inner side of the Sagittarius Arm."),
 ('baade', "Baade's Window", 'dust', ('gal', 1.02, -3.92), 26000,
  "A rare clear patch close to the core. Light from the galactic bulge, about 26,000 light-years away, reaches us through here."),
 ('rift', 'Great Rift', 'dust', ('gal', 40, 1.5), None,
  "Dark lanes of dust that split the Milky Way's glow from Cygnus down to Sagittarius. They are nearby clouds, mostly within a few thousand light-years, blocking the light from behind."),
 ('cygx', 'Cygnus X', 'neb', ('gal', 80, 0.8), 4600,
  "One of the largest star-forming regions known. Here you look straight along our own Local Arm, so its stars and gas pile up in the line of sight."),
 ('h_chi', 'Double Cluster', 'clus', ('eq', 34.75, 57.13), 7500,
  "Two young star clusters in the Perseus Arm, the next spiral arm outward from ours. A fuzzy patch to the eye."),
 ('m1', 'Crab Nebula (M1)', 'neb', ('eq', 83.63, 22.01), 6500,
  "The remains of a star that exploded in 1054, recorded by Chinese astronomers. It sits in the Perseus Arm, close to the anticenter."),
 ('m42', 'Orion Nebula (M42)', 'neb', ('eq', 83.82, -5.39), 1340,
  "The nearest large star-forming region, in our own Local (Orion) Arm. Easy to see as the fuzzy middle 'star' of Orion's sword."),
 ('m45', 'Pleiades (M45)', 'clus', ('eq', 56.75, 24.12), 440,
  "A young star cluster in our local neighborhood. Most people see six or seven stars."),
 ('carina', 'Carina Nebula', 'neb', ('eq', 161.27, -59.87), 7500,
  "A huge star-forming region in the Carina Arm, the far end of the Sagittarius Arm. It holds Eta Carinae, one of the most massive stars known."),
 ('coal', 'Coalsack', 'dust', ('eq', 192.5, -62.5), 600,
  "A dark dust cloud about 600 light-years away, silhouetted against the Milky Way beside the Southern Cross."),
 ('rhooph', 'Rho Ophiuchi clouds', 'dust', ('eq', 246.8, -24.5), 450,
  "The nearest star-forming clouds. Their dark dust lanes stretch from here toward the galactic center."),
 ('ocen', 'Omega Centauri', 'glob', ('eq', 201.70, -47.48), 17000,
  "The Milky Way's largest globular cluster, about 10 million stars. It is probably the core of a small galaxy the Milky Way swallowed."),
 ('m13', 'Hercules Cluster (M13)', 'glob', ('eq', 250.42, 36.46), 22000,
  "An old globular cluster of several hundred thousand stars, orbiting in the galaxy's halo."),
 ('tuc47', '47 Tucanae', 'glob', ('eq', 6.02, -72.08), 15000,
  "A big globular cluster in the halo. On the sky it sits beside the Small Magellanic Cloud, which is 13 times farther away."),
 ('m31', 'Andromeda Galaxy (M31)', 'gal', ('eq', 10.68, 41.27), 2500000,
  "The nearest large spiral galaxy, and the most distant thing most people can see with their eyes. It may merge with the Milky Way in several billion years."),
 ('m33', 'Triangulum Galaxy (M33)', 'gal', ('eq', 23.46, 30.66), 2700000,
  "A smaller spiral in our Local Group. Visible to the eye only under very dark skies."),
 ('lmc', 'Large Magellanic Cloud', 'gal', ('eq', 80.89, -69.76), 160000,
  "The Milky Way's biggest satellite galaxy. It looks like a detached piece of the Milky Way."),
 ('smc', 'Small Magellanic Cloud', 'gal', ('eq', 13.19, -72.83), 200000,
  "A smaller satellite galaxy, being pulled apart by the LMC and the Milky Way."),
 ('virgo', 'Virgo Cluster', 'gal', ('eq', 187.71, 12.39), 54000000,
  "The nearest large galaxy cluster, over a thousand galaxies. You see it through the clear view near the north galactic pole."),
]
objs = []
for oid, name, kind, pos, dist, text in OBJ:
    ra, dec = pos[1:] if pos[0] == 'eq' else gal_to_eq(*pos[1:])
    l, b = eq_to_gal(ra, dec)
    objs.append(dict(id=oid, n=name, k=kind, ra=round(ra, 3), dec=round(dec, 3), l=round(l, 2), b=round(b, 2),
                     d=dist, t=text, c=constellation(ra, dec)))
    print(f'{oid:8s} l={l:7.2f} b={b:6.2f} {constellation(ra, dec)}')

# ---------- Milky Way texture ----------
mw = json.load(open(f'{D}/mw.json'))['features']
S, EXT = 4096, 6.0
def to_plane(ra, dec):
    g = (T @ eq_vec(np.asarray(ra), np.asarray(dec)).T).T
    k = 1.0 / (1.0 - np.clip(g[:, 2], -1, 0.999))
    return g[:, 0] * k, g[:, 1] * k
total = np.zeros((S, S), np.float32)
for lvl, f in enumerate(mw):
    acc = np.zeros((S, S), bool)
    for poly in f['geometry']['coordinates']:
        for ring in poly:
            r = np.array(ring)
            x, y = to_plane(r[:, 0], r[:, 1])
            px = (x + EXT) / (2 * EXT) * S; py = (y + EXT) / (2 * EXT) * S
            im = Image.new('1', (S, S), 0)
            ImageDraw.Draw(im).polygon(list(zip(px.tolist(), py.tolist())), fill=1)
            acc ^= np.array(im, bool)
    total += acc
    print('level', f['id'], acc.mean())
W, H = 1024, 512
lg = (np.arange(W) + 0.5) / W * 360
bg = (np.arange(H) + 0.5) / H * 180 - 90
L, B = np.meshgrid(np.radians(lg), np.radians(bg))
gx, gy, gz = np.cos(B) * np.cos(L), np.cos(B) * np.sin(L), np.sin(B)
k = 1 / (1 - np.clip(gz, -1, 0.999))
px = ((gx * k + EXT) / (2 * EXT) * S).astype(int)
py = ((gy * k + EXT) / (2 * EXT) * S).astype(int)
ok = (px >= 0) & (px < S) & (py >= 0) & (py < S)
tex = np.zeros((H, W), np.float32)
tex[ok] = total[py[ok], px[ok]]
# wrap-aware blur
pad = 64
wide = np.concatenate([tex[:, -pad:], tex, tex[:, :pad]], 1)
im = Image.fromarray((wide / 5 * 255).astype(np.uint8))
a1 = np.array(im.filter(ImageFilter.GaussianBlur(2.5)), np.float32)
a2 = np.array(im.filter(ImageFilter.GaussianBlur(9)), np.float32)
arr = (0.7 * a1 + 0.45 * a2)[:, pad:-pad] / 255
arr = arr ** 0.85
out = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
out.save(f'{OUT}/mw.png', optimize=True)
buf = io.BytesIO(); out.save(buf, 'PNG', optimize=True)
mw_b64 = base64.b64encode(buf.getvalue()).decode()
print('mw png bytes', len(buf.getvalue()))

# ---------- cities ----------
cities = json.load(open(f'{G}/cities15000.json')).values()
countries = {c['iso']: c['name'] for c in json.load(open(f'{G}/countries.json')).values()}
tzs, tzi = [], {}
ct = []
for c in sorted(cities, key=lambda c: -c['population']):
    if c['population'] < 100000: continue
    tz = c['timezone']
    if tz not in tzi: tzi[tz] = len(tzs); tzs.append(tz)
    a1 = c['admin1code'] if c['countrycode'] in ('US', 'CA', 'AU') else ''
    ct.append([c['name'], c['countrycode'] + ('-' + a1 if a1 else ''), round(c['latitude'], 2),
               round(c['longitude'], 2), tzi[tz]])
used_cc = {c[1][:2] for c in ct}
zone_xy = {}
for line in open('/usr/share/zoneinfo/zone1970.tab'):
    if line.startswith('#'): continue
    p = line.split('\t')
    s = p[1]
    i = max(s.rfind('+'), s.rfind('-'))
    def dms(v):
        sg = -1 if v[0] == '-' else 1; v = v[1:]
        dd = 2 if len(v) in (4, 6) and s.index(v) < i else 3
        return v
    la, lo = s[:i], s[i:]
    def conv(v, degdigits):
        sg = -1 if v[0] == '-' else 1; v = v[1:]
        d = int(v[:degdigits]); m = int(v[degdigits:degdigits + 2]); sec = int(v[degdigits + 2:] or 0)
        return sg * (d + m / 60 + sec / 3600)
    zone_xy[p[2]] = [round(conv(la, 2), 2), round(conv(lo, 3), 2)]
print('cities', len(ct), 'tz', len(tzs), 'zones', len(zone_xy))

data = dict(stars=st, starNames=star_names, lines=cl, cons=cn, objs=objs,
            plane=plane, cities=ct, tzs=tzs, countries={k: v for k, v in countries.items() if k in used_cc},
            zones=zone_xy)
js = 'const DATA=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\nconst MW_PNG="data:image/png;base64,' + mw_b64 + '";\n'
open(f'{OUT}/data.js', 'w').write(js)
print('data.js bytes', len(js))
