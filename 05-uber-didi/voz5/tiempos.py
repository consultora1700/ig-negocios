import json, re, unicodedata
W=json.load(open("palabras.json"))
norm=lambda s: re.sub(r"[^a-z0-9ñ]","",unicodedata.normalize("NFD",s.lower()).encode("ascii","ignore").decode() if False else ''.join(c for c in unicodedata.normalize("NFD",s.lower()) if unicodedata.category(c)!="Mn"))
toks=[norm(w["text"]) for w in W]
K=[("gancho","manejar para"),("depende","depende de"),("tres","hay tres"),("hacemos","hacemos la"),
("cap1","uno el que"),("martin","martin no tiene"),("dia","un dia normal"),("noEsSuyo","pero el auto no"),("s360","360 mil pesos por"),("div","360 mil dividido"),("h30","30 horas"),("lunes","lunes martes"),("poreso","por eso hace"),
("mes","al mes la"),("alq","alquilar menos"),("gas","gas menos"),("mono","monotributo e"),("cel","celular y lavado"),("quedan","le queda un millon cuatrocientos"),("h312","por 312"),("m4800","cuatro mil ochocientos"),
("cap2","dos el que"),("quien","esos 360"),("dueno","el dueno compro"),("compro","compro un"),("s159","quince millones"),("cobra","cobra un millon"),("paga","y paga"),("service","service cubiertas"),("seguro","seguro menos"),("monoD","monotributo menos"),("patente","patente y"),("bolsillo","en el bolsillo"),
("invisible","pero hay un"),("km","martin le hace"),("s33","y por cada"),("s206","doscientos seis mil por"),("ganancia","ganancia real"),("sinManejar","sin manejar"),("recupera","recupera lo"),
("dos","y con dos"),("pone318","pone treinta"),("m1500","y le queda un millon quinientos mil"),("igual","lo mismo que"),("h312b","martin maneja 312"),("cero","el dueno cero"),
("riesgo","pero el dueno tambien"),("noPaga","si el chofer"),("caja","si se rompe"),("choca","si choquen"),("rechazar","el seguro lo"),("kmAno","y a setenta"),
("cap3","tres el que"),("lucas","lucas tiene"),("noAlq","no paga alquiler"),("maneja8","maneja ocho"),("app2496","la app le paga dos"),("quedaL","le queda un millon quinientos veintisiete"),("masQue","mas que martin"),("h104","con ciento"),("m7340","siete mil trescientos"),("si12","y si hace"),("m2360","dos millones trescientos sesenta"),
("cierre","martin pone las"),("duenoPlata","el dueno pone"),("lucasDos","lucas pone"),("metodo","la cuenta sirve"),("entra","lo que entra"),("menos","menos todo lo que cuesta"),("tambien","tambien lo que"),("dividido","dividido las"),("lado","vos de que"),("comenta","comentalo"),("mandaselo","y mandaselo"),("seguime","seguime para")]
i=0; T={}
for k,f in K:
    f=f.split()
    while i<len(toks) and toks[i:i+len(f)]!=f: i+=1
    if i>=len(toks): raise SystemExit("no encuentro "+k)
    T[k]=W[i]["start"]
T["fin"]=round(W[-1]["end"]+0.6,2)
json.dump(T,open("tiempos.json","w"),indent=0)
print(T)
