"""Génère les illustrations de couverture des articles du blog (SVG, couleurs de la charte).
Pictogrammes : Font Awesome Free (CC BY 4.0), extraits de la police fournie dans public/assets/vendor.
Usage : python3 scripts/blog-couvertures.py   (nécessite : pip install fonttools brotli)"""
import re, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

RACINE = pathlib.Path(__file__).resolve().parent.parent
CSS = (RACINE / 'public/assets/vendor/fontawesome/css/all.min.css').read_text()
FONT = TTFont(RACINE / 'public/assets/vendor/fontawesome/webfonts/fa-solid-900.woff2')
CMAP = FONT.getBestCmap()
GLYPHS = FONT.getGlyphSet()

def code(nom):
    m = re.search(r'\.fa-' + re.escape(nom) + r'(?::before|\{)[^}]*?(?:content:"\\\\?|--fa:"\\\\?)([0-9a-f]{4,5})', CSS)
    if not m:
        m = re.search(r'\.fa-' + re.escape(nom) + r'[:,{][^}]*?\\\\?"?\\\\([0-9a-f]{4,5})', CSS)
    if not m:
        raise SystemExit(f'icône introuvable : {nom}')
    return int(m.group(1), 16)

def icone(nom, x, y, taille, couleur, opacite=1.0):
    g = CMAP[code(nom)]
    glyph = GLYPHS[g]
    em = FONT['head'].unitsPerEm
    s = taille / em
    pen = SVGPathPen(GLYPHS)
    # Repère de police (y vers le haut) → SVG (y vers le bas), glyphe centré sur (x, y)
    w = glyph.width
    tp = TransformPen(pen, (s, 0, 0, -s, x - w * s / 2, y + taille * 0.43))
    glyph.draw(tp)
    return f'<path d="{pen.getCommands()}" fill="{couleur}" fill-opacity="{opacite}"/>'

PALETTES = {
    'bleu': ('#1F5FAD', '#0E2236'), 'vert': ('#23913F', '#0E2236'), 'turquoise': ('#0E9F9A', '#0E2236'),
    'nuit': ('#1A3550', '#0E2236'), 'mixte': ('#1F5FAD', '#0E9F9A'),
}
DECOR = ['stethoscope', 'heart-pulse', 'user-nurse', 'syringe', 'kit-medical', 'notes-medical', 'hospital', 'briefcase-medical']

ARTICLES = [
    ('01-reussir-entretien-embauche', 'handshake', 'bleu', 'Conseils carrière'),
    ('02-portrait-sage-femme', 'baby', 'turquoise', 'Portraits'),
    ('03-marche-emploi-tunisie', 'chart-line', 'nuit', "Marché de l'emploi"),
    ('04-travailler-etranger', 'earth-europe', 'mixte', 'International'),
    ('05-cv-paramedical', 'file-lines', 'bleu', 'Conseils carrière'),
    ('06-stress-burn-out', 'spa', 'vert', 'Bien-être au travail'),
    ('07-travail-de-nuit', 'moon', 'nuit', 'Bien-être au travail'),
    ('08-jeunes-diplomes', 'user-graduate', 'turquoise', 'Conseils carrière'),
    ('09-hygiene-des-mains', 'hands-bubbles', 'vert', 'Pratique professionnelle'),
    ('10-communication-patient', 'comments', 'mixte', 'Pratique professionnelle'),
    ('11-salaire-negociation', 'money-bill-wave', 'vert', 'Conseils carrière'),
    ('12-fideliser-equipes', 'hospital', 'bleu', 'Recruteurs'),
    ('13-evoluer-carriere', 'stairs', 'turquoise', 'Conseils carrière'),
]

W, H = 1200, 675
for i, (slug, ic, pal, cat) in enumerate(ARTICLES):
    c1, c2 = PALETTES[pal]
    deco = []
    positions = [(150, 140, 90), (1060, 120, 70), (120, 560, 70), (1080, 545, 95), (640, 80, 50), (330, 610, 45)]
    for k, (x, y, t) in enumerate(positions):
        deco.append(icone(DECOR[(i + k) % len(DECOR)], x, y, t, '#ffffff', 0.10))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{cat}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
  <radialGradient id="h" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#g)"/>
<circle cx="{W/2}" cy="{H*0.45}" r="330" fill="url(#h)"/>
<circle cx="980" cy="-40" r="220" fill="#ffffff" fill-opacity=".05"/>
<circle cx="120" cy="720" r="260" fill="#ffffff" fill-opacity=".05"/>
{''.join(deco)}
<circle cx="{W/2}" cy="{H*0.45}" r="165" fill="#ffffff" fill-opacity=".14"/>
<circle cx="{W/2}" cy="{H*0.45}" r="128" fill="#ffffff"/>
{icone(ic, W/2, H*0.45, 140, c1)}
<rect y="{H-10}" width="{W*0.28}" height="10" fill="#2BA84A"/><rect x="{W*0.28}" y="{H-10}" width="{W*0.44}" height="10" fill="#1F5FAD"/><rect x="{W*0.72}" y="{H-10}" width="{W*0.28}" height="10" fill="#14B8B0"/>
</svg>'''
    (RACINE / f'public/assets/img/blog/{slug}.svg').write_text(svg)
    print('✓', slug)
