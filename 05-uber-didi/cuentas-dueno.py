# Reel 05 — análisis del DUEÑO DEL AUTO como inversor.
# Mismo dataset que cuentas.py. Fuentes en ../estrategia/datos/uber/*.md (18/11/2026)

SEM_MES  = 52/12
COBRA_H  = 12_000
KM_H     = 20
GNC_M3   = 685
GNC_100  = 10
DIAS     = 6
DATOS_MES= 23_000
gnc_km   = GNC_M3 * GNC_100 / 100

HORAS_CHOFER = 12
ALQUILER_SEM = 360_000

# --- costo de mantenimiento por km (plan service oficial + precios taller nov 2026) ---
MANT_KM = 35.86 + 10.5 + 7.2 + 7.5 + 5.9   # service + cubiertas + frenos + amort + distrib = $66.96/km

# --- inversión inicial ---
AUTO       = 15_000_000   # sedán usado, ejemplo
GNC_EQUIPO = 1_500_000    # equipo de GNC
INVERSION  = AUTO + GNC_EQUIPO

# --- monotributo (misma tabla que cuentas.py) ---
def mono(bruto_anual):
    t=[(12009410.45,49527.18,11505),(17595182.74,56379.08,18720),(24670494.31,66020.12,29260),
       (30628651.43,84612.93,40685),(36028231.33,119811.45,53850),(45151659.41,150784.21,76250),
       (53995798.87,230312.94,103490)]
    for i,(tope,c,ib) in enumerate(t):
        if bruto_anual<=tope: return "ABCDEFG"[i], c+ib
    return "H+", None

# ======================================================================
#  1. EL CHOFER QUE ALQUILA (Martín, 12 h × 6 días)
# ======================================================================
h_sem = HORAS_CHOFER * DIAS
h_mes = h_sem * SEM_MES
km_mes = KM_H * h_mes
bruto_chofer = COBRA_H * h_mes
cat, imp = mono(bruto_chofer * 12)

costos_chofer = {
    "alquiler":           ALQUILER_SEM * SEM_MES,
    "GNC":                km_mes * gnc_km,
    f"monotributo+IIBB ({cat})": imp,
    "celular":            DATOS_MES,
}
total_chofer = sum(costos_chofer.values())
neto_chofer  = bruto_chofer - total_chofer

print("=" * 72)
print("  1. EL CHOFER QUE ALQUILA (Martín)")
print("=" * 72)
print(f"  Jornada: {HORAS_CHOFER} h × {DIAS} días = {h_mes:.0f} h/mes · {km_mes:,.0f} km/mes")
print(f"  La app le paga: ${bruto_chofer:,.0f}/mes  (${COBRA_H:,}/h)")
for k, v in costos_chofer.items():
    print(f"    − {k}: ${v:,.0f}  ({v/bruto_chofer*100:.1f}%)")
print(f"  TOTAL costos: ${total_chofer:,.0f} ({total_chofer/bruto_chofer*100:.1f}%)")
print(f"  LE QUEDAN: ${neto_chofer:,.0f}/mes = ${neto_chofer/h_mes:,.0f}/h")
print(f"  Por día: ${neto_chofer/(DIAS*SEM_MES):,.0f}")

# ======================================================================
#  2. EL DUEÑO DEL AUTO (inversor, NO maneja)
# ======================================================================
ingreso_mes = ALQUILER_SEM * SEM_MES

costos_dueno = {
    "mantenimiento (service, cubiertas, frenos, amort, distrib)": km_mes * MANT_KM,
    "seguro TC particular":  106_147,
    "patente PBA + VTV":     (159_000 + 114_106) / 12,
    "lavado":                10_000,
    "equipo GNC (amort. 36 meses)": GNC_EQUIPO / 36,
    "DEPRECIACIÓN ($33/km)": km_mes * 33,
}
total_dueno = sum(costos_dueno.values())
neto_dueno  = ingreso_mes - total_dueno

print()
print("=" * 72)
print("  2. EL DUEÑO DEL AUTO (inversor)")
print("=" * 72)
print(f"  Inversión inicial: auto ${AUTO:,.0f} + GNC ${GNC_EQUIPO:,.0f} = ${INVERSION:,.0f}")
print(f"  Cobra del chofer: ${ingreso_mes:,.0f}/mes  (${ALQUILER_SEM:,}/sem × {SEM_MES:.2f})")
print()
for k, v in costos_dueno.items():
    print(f"    − {k}: ${v:,.0f}  ({v/ingreso_mes*100:.1f}%)")
print(f"  TOTAL costos: ${total_dueno:,.0f} ({total_dueno/ingreso_mes*100:.1f}%)")
print(f"  GANANCIA NETA: ${neto_dueno:,.0f}/mes")

# ======================================================================
#  3. RETORNO DE LA INVERSIÓN
# ======================================================================
roi_mensual = neto_dueno / INVERSION * 100
roi_anual   = roi_mensual * 12
payback_meses = INVERSION / neto_dueno if neto_dueno > 0 else float('inf')

print()
print("=" * 72)
print("  3. RETORNO DE LA INVERSIÓN")
print("=" * 72)
print(f"  Retorno mensual:  {roi_mensual:.2f}% sobre ${INVERSION:,.0f}")
print(f"  Retorno anual:    {roi_anual:.1f}%")
print(f"  Recupero:         {payback_meses:.1f} meses ({payback_meses/12:.1f} años)")

# ======================================================================
#  4. RIESGOS
# ======================================================================
costos_dueno_sin_deprec = total_dueno - costos_dueno["DEPRECIACIÓN ($33/km)"]
sem_sin_cobrar = neto_dueno / (ALQUILER_SEM / (SEM_MES / SEM_MES))  # cuántas semanas de no cobrar aguanta antes de perder
# más claro: margen mensual / ingreso semanal = semanas de colchón
sem_colchon = neto_dueno / ALQUILER_SEM

reparacion_mayor = 800_000   # ejemplo: caja de cambios, junta de tapa
meses_reparacion = reparacion_mayor / neto_dueno

# sin chofer: cuánto pierde por mes (costos fijos que sigue pagando)
costos_fijos_sin_chofer = costos_dueno["seguro TC particular"] + costos_dueno["patente PBA + VTV"]

print()
print("=" * 72)
print("  4. RIESGOS")
print("=" * 72)
print(f"  Semanas sin cobrar que absorbe la ganancia del mes: {sem_colchon:.1f}")
print(f"  → Si el chofer se va 1 semana, pierde ${ALQUILER_SEM:,.0f} de ingreso")
print(f"     pero ahorra mantenimiento y GNC: gasto real sin chofer ≈ ${costos_fijos_sin_chofer:,.0f}/mes")
print(f"  Reparación mayor (ej. caja, $800.000): {meses_reparacion:.1f} meses de ganancia")
print(f"  Si el chofer choca y el seguro rechaza (uso particular):")
print(f"     → pierde el auto completo: ${AUTO:,.0f}")
print(f"  Desgaste acelerado: {km_mes:,.0f} km/mes = {km_mes*12:,.0f} km/año")
print(f"     → En 3 años: {km_mes*36:,.0f} km (un auto particular hace ~15.000 km/año)")

# ======================================================================
#  5. A 3 AÑOS
# ======================================================================
meses_36 = 36
ganancia_36    = neto_dueno * meses_36
deprec_total   = km_mes * 33 * meses_36
residual_auto  = max(0, AUTO - deprec_total)
gnc_residual   = 0   # equipo amortizado
balance_total  = ganancia_36 + residual_auto - INVERSION

print()
print("=" * 72)
print("  5. BALANCE A 3 AÑOS (36 meses)")
print("=" * 72)
print(f"  Ganancia acumulada:   ${ganancia_36:,.0f}")
print(f"  Depreciación total:   ${deprec_total:,.0f}")
print(f"  Valor residual auto:  ${residual_auto:,.0f}  (de ${AUTO:,.0f})")
print(f"  Equipo GNC:           amortizado ($0)")
print(f"  Inversión original:   ${INVERSION:,.0f}")
print()
print(f"  BALANCE = ganancia + residual − inversión")
print(f"         = ${ganancia_36:,.0f} + ${residual_auto:,.0f} − ${INVERSION:,.0f}")
print(f"         = ${balance_total:,.0f}")
if balance_total > 0:
    print(f"  → Ganó ${balance_total:,.0f} en 3 años ({balance_total/INVERSION*100:.1f}% sobre la inversión)")
else:
    print(f"  → Perdió ${-balance_total:,.0f} en 3 años")

# ======================================================================
#  RESUMEN PARA EL VIDEO
# ======================================================================
print()
print("=" * 72)
print("  RESUMEN PARA EL VIDEO")
print("=" * 72)
print(f"  El chofer cobra ${bruto_chofer:,.0f}/mes, le quedan ${neto_chofer:,.0f} (${neto_chofer/h_mes:,.0f}/h)")
print(f"  El dueño cobra ${ingreso_mes:,.0f}/mes, le quedan ${neto_dueno:,.0f} (sin manejar)")
print(f"  El dueño invirtió ${INVERSION:,.0f} y lo recupera en {payback_meses:.0f} meses ({roi_anual:.0f}% anual)")
print(f"  En 3 años el auto vale ${residual_auto:,.0f} (perdió ${deprec_total:,.0f})")
print(f"  El chofer puso 0 pesos y {h_mes:.0f} horas de su vida por mes")
print(f"  El dueño puso ${INVERSION:,.0f} y 0 horas")
