"""Baja un archivo gratis de itch.io (mismo paso que el botón «No thanks»). Uso: itch.py URL_PAGINA [texto_en_nombre] salida"""
import sys, re, json, urllib.request, urllib.parse, http.cookiejar, shutil
page = sys.argv[1].rstrip('/'); filtro = sys.argv[2] if len(sys.argv) > 3 else ""; out = sys.argv[-1]
cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)); op.addheaders = [('User-Agent', 'Mozilla/5.0')]
html = op.open(page, timeout=30).read().decode('utf8', 'ignore')
csrf = re.search(r'csrf_token" (?:content|value)="([^"]+)"', html).group(1)
def post(u): return json.loads(op.open(urllib.request.Request(u, data=urllib.parse.urlencode({'csrf_token': csrf}).encode()), timeout=30).read())
src = html; ups = re.findall(r'data-upload_id="(\d+)"', html)
if not ups:
    dl = post(page + '/download_url')['url']; src = op.open(dl, timeout=30).read().decode('utf8', 'ignore'); ups = re.findall(r'data-upload_id="(\d+)"', src)
names = re.findall(r'title="([^"]+)" class="name"', src) or re.findall(r'class="name" title="([^"]+)"', src)
sizes = re.findall(r'class="file_size"><span>([^<]+)<', src)
lista = list(zip(dict.fromkeys(ups), names, sizes)); print(lista)
uid = next((u for u, n, s in lista if filtro.lower() in n.lower()), lista[0][0])
cdn = post(page + f'/file/{uid}?source=game_download&after_download_lightbox=1&as_props=1')['url']
with op.open(cdn, timeout=600) as r, open(out, 'wb') as f: shutil.copyfileobj(r, f)
print("ok", out)
