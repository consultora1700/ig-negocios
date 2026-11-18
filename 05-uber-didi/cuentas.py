# Reel 05 — cuentas auditadas. Fuentes en ../estrategia/datos/uber/*.md (18/11/2026)
SEM_MES = 52/12            # semanas por mes
# --- comunes (todo lo que dice SUPUESTO va marcado "EJEMPLO" en pantalla)
COBRA_H  = 12_000          # lo que cobra el chofer por hora, ya sin comisión (piso «día tranquilo» Don Uberto; ACAURA 10–12 mil)
KM_H     = 20              # SUPUESTO, km por hora incl. vacíos (Don Uberto 231 km/9,5 h = 24; 20 deja nafta ≈ 30 % como dicen los choferes)
GNC_M3   = 685             # $/m3 YPF CABA sep–oct (680–689)
GNC_100  = 10              # SUPUESTO m3/100 km (rango 8–12)
DIAS     = 6
DATOS_MES= 23_000          # Personal 8 GB promo
def mono(bruto_anual):     # ARCA servicios + IIBB PBA servicios (ago 2026)
    t=[(12009410.45,49527.18,11505),(17595182.74,56379.08,18720),(24670494.31,66020.12,29260),
       (30628651.43,84612.93,40685),(36028231.33,119811.45,53850),(45151659.41,150784.21,76250),
       (53995798.87,230312.94,103490)]
    for i,(tope,c,ib) in enumerate(t):
        if bruto_anual<=tope: return "ABCDEFG"[i], c+ib
    return "H+", None
gnc_km = GNC_M3*GNC_100/100

def chofer(nombre,horas,alquiler_sem=0,propio=False):
    h_sem = horas*DIAS; h_mes=h_sem*SEM_MES
    bruto = COBRA_H*h_mes; km=KM_H*h_mes
    cat,imp = mono(bruto*12)
    c = {"alquiler": alquiler_sem*SEM_MES, "GNC": km*gnc_km, "monotributo+IIBB ("+cat+")": imp, "celular": DATOS_MES}
    if propio:
        c["mantenimiento (service, cubiertas, frenos, amort., distrib.)"] = km*(35.86+10.5+7.2+7.5+5.9)
        c["seguro TC particular"] = 106_147
        c["patente PBA + VTV"] = (159_000+114_106)/12
        c["lavado"] = 10_000
        c["equipo GNC $1,5 M en 3 años"] = 1_500_000/36
        c["DEPRECIACIÓN ($26–41/km → 33)"] = km*33
    tot=sum(c.values()); neto=bruto-tot
    print(f"\n== {nombre}: {horas} h × {DIAS} días = {h_mes:.0f} h/mes, {km:,.0f} km/mes")
    print(f"  cobra en la app: ${bruto:,.0f}/mes  (${COBRA_H:,}/h)")
    for k,v in c.items(): print(f"  - {k}: ${v:,.0f}  ({v/bruto*100:.1f} %)")
    print(f"  TOTAL costos ${tot:,.0f} ({tot/bruto*100:.1f} %) → QUEDA ${neto:,.0f}/mes = ${neto/h_mes:,.0f}/h")
    print(f"  por día: cobra ${COBRA_H*horas:,} / queda ${neto/(DIAS*SEM_MES):,.0f}")
    return neto,h_mes

m=chofer("Martín, alquila (GNC, seguro y service incluidos)",12,alquiler_sem=360_000)
l=chofer("Lucas, auto propio a GNC",8,propio=True)
print(f"\nhoras de Martín para pagar el alquiler de la semana: {360_000/COBRA_H:.0f} h = {360_000/COBRA_H/12:.1f} días")
print(f"salario mínimo nov: $398.800/mes = $1.994/h · canasta básica hogar de 4: $1.690.000")
print(f"chequeo Gerardo (12 h, alquila $360k): queda/día ≈ ${(COBRA_H*12 - 360_000/6 - 12*KM_H*gnc_km):,.0f} (él dice 60–70 mil) ")

print("\n### Lucas también a 12 h")
l12=chofer("Lucas, auto propio a GNC, 12 h",12,propio=True)
