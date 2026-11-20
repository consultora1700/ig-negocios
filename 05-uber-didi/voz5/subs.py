# Subtítulos del reel 05 v5 desde palabras.json: une las cifras dichas en palabras y las escribe con números.
import json, re, unicodedata
W = json.load(open("palabras.json"))
FIX = {"Kronos": "Cronos", "cronos": "Cronos", "cronos.": "Cronos.", "BTB,": "VTV:", "¿Manejar": "Manejar", "Uber": "Uber:", "cuánto": "¿cuánto", "arrieja.": "arriesga.", "Alquilar,": "Alquiler:", "Coméntalo.": "Comentalo.", "choquen": "choca en", "ingresos": "Ingresos", "brutos,": "Brutos:"}
U = {"cero":0,"un":1,"uno":1,"una":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,"seis":6,"siete":7,"ocho":8,"nueve":9,"diez":10,"once":11,"doce":12,"trece":13,"catorce":14,"quince":15,
     "veinte":20,"veintiuno":21,"veintidós":22,"veintitrés":23,"veinticuatro":24,"veinticinco":25,"veintiséis":26,"veintisiete":27,"veintiocho":28,"veintinueve":29,"veintiún":21,"veintiuno":21,"treinta":30,"cuarenta":40,"cincuenta":50,"sesenta":60,"setenta":70,"ochenta":80,"noventa":90,"cien":100,"ciento":100,
     "doscientos":200,"trescientos":300,"cuatrocientos":400,"quinientos":500,"seiscientos":600,"setecientos":700,"ochocientos":800,"novecientos":900}
def limpio(w): return re.sub(r"[^\wáéíóúñü]", "", w.lower())
def esnum(w):
    c = limpio(w); return c in U or c in ("mil", "millón", "millon", "millones", "y") or re.fullmatch(r"\d+", c) is not None
toks = []
i = 0
while i < len(W):
    w = W[i]["text"]
    if esnum(w) and limpio(w) != "y" and not (limpio(w) in ("un", "una", "dos", "tres", "seis", "ocho", "doce") and not (i + 1 < len(W) and esnum(W[i + 1]["text"]))):
        j = i; total = 0; cur = 0
        while j < len(W) and esnum(W[j]["text"]):
            c = limpio(W[j]["text"])
            if c == "y": j += 1; continue
            if c in ("millón", "millon", "millones"): total += max(cur, 1) * 1_000_000; cur = 0
            elif c == "mil": total += max(cur, 1) * 1000; cur = 0
            elif c.isdigit(): cur += int(c)
            else: cur += U[c]
            fin = W[j]["text"]; j += 1
            if c == "mil" and j < len(W) and limpio(W[j]["text"]).isdigit(): break
            if re.search(r"[.,:?]$", fin): break
        v = total + cur; pun = re.findall(r"[.,:?]+$", fin); pun = pun[0] if pun else ""
        toks.append({"text": None, "num": v, "pun": pun, "start": W[i]["start"], "end": W[j - 1]["end"]}); i = j
    else:
        toks.append({"text": FIX.get(w, w), "start": W[i]["start"], "end": W[i]["end"]}); i += 1
# formato de cada cifra según la palabra siguiente
for k, t in enumerate(toks):
    if t.get("num") is None: continue
    v = t["num"]
    if v < 10 and k + 1 < len(toks):
        orig = W[[x["start"] for x in W].index(t["start"])]["text"]; t["text"] = orig; t["num"] = None; continue
    sig = limpio(toks[k + 1]["text"]) if k + 1 < len(toks) and toks[k + 1]["text"] else ""; ant = limpio(toks[k - 1]["text"]) if k > 0 and toks[k - 1]["text"] else ""
    s = f"{v:,}".replace(",", ".")
    if sig in ("kilómetros", "km") or ant in ("los",) or sig == "horas" or sig == "meses" or v == 2020 or v < 100: txt = s if v != 2020 else "2020"
    else: txt = "$" + s
    t["text"] = txt + t["pun"]; t["dinero"] = txt.startswith("$")
# frases de hasta ~4 palabras, cortando en puntuación
SUB = []; cur = []; 
def cerrar():
    global cur
    if cur: SUB.append([round(cur[0]["start"] - 0.05, 2), " ".join(f"<em>{x['text'].rstrip('.,:')}</em>{x['text'][len(x['text'].rstrip('.,:')):]}" if x.get("dinero") else x["text"] for x in cur)]); cur = []
for t in toks:
    if cur and (len(cur) >= 4 or t["start"] - cur[-1]["end"] > 0.45): cerrar()
    cur.append(t)
    if re.search(r"[.?:]$", t["text"]) or (re.search(r",$", t["text"]) and len(cur) >= 2): cerrar()
cerrar()
SUB[0][0] = -0.05
POST = {"<em>$360.000</em> dividido <em>$12.000</em> 30": "<em>$360.000</em> ÷ <em>$12.000</em> =", "horas.": "30 horas."}
for x in SUB:
    if x[1] in POST: x[1] = POST[x[1]]
json.dump(SUB, open("../video/assets/subtitulos.json", "w"), ensure_ascii=False, indent=0)
print(len(SUB)); [print(s) for s in SUB]
