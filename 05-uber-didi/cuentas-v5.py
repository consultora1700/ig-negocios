# Reel 05 v5 — cuentas de los 3 lados. Supuestos acordados con el usuario 2026-11-20:
# Cronos 2020 1.3 Drive 96.000 km $15.900.000 (Autocosmos 18/11) · seguro $160.000/mes (dato usuario)
# service en mecánico de barrio = mitad del plan oficial · alquiler $360.000/sem (Gerardo, La Capital)
S=52/12; COBRA_H=12_000; KM_H=20; GNC_KM=685*10/100; DIAS=6; CEL=23_000
AUTO=15_900_000; EQ_GNC=0; INV=AUTO+EQ_GNC  # usado que ya viene con GNC (pedido usuario 20/11); INV=AUTO+EQ_GNC
SEGURO=160_000; PAT=(141_000+0.02*(AUTO-14_100_000)+114_106)/12; LAV=10_000
MANT_KM=35.86/2+10.5+7.2+7.5+5.9; DEP_KM=33; ALQ=360_000
def mono(a):
    t=[(12009410.45,49527.18,11505),(17595182.74,56379.08,18720),(24670494.31,66020.12,29260),(30628651.43,84612.93,40685),(36028231.33,119811.45,53850),(45151659.41,150784.21,76250),(53995798.87,230312.94,103490)]
    for i,(tp,c,ib) in enumerate(t):
        if a<=tp: return "ABCDEFG"[i],c+ib
def p(t,ing,c,h=None):
    print(f"\n== {t}\n  entra: ${ing:,.0f}")
    for k,v in c.items(): print(f"   − {k}: ${v:,.0f}")
    n=ing-sum(c.values()); print(f"  LE QUEDA: ${n:,.0f}/mes" + (f" = ${n/h:,.0f}/h ({h:.0f} h)" if h else "")); return n
km12=KM_H*12*DIAS*S
# Martín
h=12*DIAS*S; b=COBRA_H*h; cat,imp=mono(b*12)
p("MARTÍN alquila 12 h",b,{"alquiler":ALQ*S,"GNC":km12*GNC_KM,f"monotributo {cat}":imp,"celular":CEL,"lavado (lo paga el chofer)":LAV},h)
# Dueño
def auto(km): return {"service/cubiertas/frenos/amort/distrib":km*MANT_KM,"seguro":SEGURO,"patente+VTV":PAT,"equipo GNC /36":EQ_GNC/36,"pérdida de valor":km*DEP_KM}
for n in (1,2):
    ing=ALQ*S*n; cat,imp=mono(ing*12)
    c={k:v*n for k,v in auto(km12).items()}; c[f"monotributo {cat}"]=imp
    neto=p(f"DUEÑO con {n} auto(s), no maneja",ing,c)
    caja=neto+c["pérdida de valor"]+c["equipo GNC /36"]
    print(f"  plata al bolsillo (sin pérdida de valor ni GNC ya pagado): ${caja:,.0f} · invirtió ${INV*n:,.0f} · recupera en {INV*n/neto:.1f} meses")
# Lucas
for hd in (8,12):
    h=hd*DIAS*S; km=KM_H*h; b=COBRA_H*h; cat,imp=mono(b*12)
    c=auto(km); c["GNC"]=km*GNC_KM; c[f"monotributo {cat}"]=imp; c["celular"]=CEL; c["lavado"]=LAV
    p(f"LUCAS maneja su Cronos {hd} h",b,c,h)
