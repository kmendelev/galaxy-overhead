import sys, pathlib
root = pathlib.Path(__file__).parent
data = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / 'data/data.js').read_text()
app = (root / 'src/lore.js').read_text() + '\n' + (root / 'src/app.js').read_text()
html = (root / 'src/app.html').read_text()
assert '</script' not in data.lower() and '</script' not in app.lower()
out = html.replace('/*__DATA__*/', data).replace('/*__APP__*/', app)

# claude.ai artifact: page content only; the viewer adds the document skeleton
(root / 'artifact.html').write_text(out)
print('artifact.html', len(out))

# GitHub Pages: a complete document with the same reset the artifact skeleton provides
cut = out.index('</style>') + len('</style>')
head, body = out[:cut], out[cut:]
site = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0e18">
<meta name="description" content="A live sky map that draws the Milky Way's structure over your night sky and shows which part of the galaxy you're looking at.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%230a0e18'/%3E%3Cpath d='M4 20 28 11' stroke='%23f2b35e' stroke-width='2.5'/%3E%3Ccircle cx='16' cy='15.5' r='3' fill='%23f2b35e'/%3E%3C/svg%3E">
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
:root {{ padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
body {{ margin: 0; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }}
img {{ max-width: 100%; }}
[hidden] {{ display: none !important; }}
</style>
{head}
</head>
<body>
{body}
</body>
</html>
'''
(root / 'index.html').write_text(site)
print('index.html', len(site))
