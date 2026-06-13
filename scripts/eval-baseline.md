(node:61960) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/joaquinbrito/novaclinx/scripts/eval-generacion.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/joaquinbrito/novaclinx/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
# Eval de generación — 6 casos × 2 corrida(s)

Fecha: 2026-06-13T00:48:06.102Z

## Corrida 1

- ✅ ped-primera-peso — Pediatría primera vez, peso verbalizado
- ❌ ped-emilia-historial — Pediatría subsecuente, peso 22 kg SOLO en historial (caso Emilia)
    - rango con peso disponible: indicaciones[1].dosis = '10–15 mg/kg/dosis (peso de referencia 22 kg — confirmar peso actual)'
    - corchete fuera de vocabulario en soap.objetivo: '[NO REGISTRADO en esta consulta]'

### Borrador caso Emilia (dump completo)

```json
{
  "soap": {
    "subjetivo": "1. MOTIVO DE CONSULTA: Fiebre y dolor de garganta.\n\n2. ENFERMEDAD ACTUAL: Preescolar femenina de 4 años 2 meses que consulta por cuadro de 2 días de evolución caracterizado por fiebre de 39 °C y odinofagia. Niega tos.\n\n3. ANTECEDENTES PERSONALES: Cuadros respiratorios altos a repetición (referido por contexto de consultas previas). Peso en último control (hace 3 semanas): 22 kg. Talla: 104 cm. Desarrollo psicomotor acorde para la edad. Sin alergias conocidas registradas. Esquema de vacunación completo para la edad según MSP.\n\n4. ANTECEDENTES FAMILIARES: [NO REGISTRADO]\n\n5. REVISIÓN POR SISTEMAS:\n- Respiratorio: fiebre, odinofagia. Niega tos.\n- Resto de sistemas: [NO REGISTRADO]",
    "objetivo": "6. SIGNOS VITALES Y ANTROPOMETRÍA:\n- Temperatura: 39 °C (axilar, referida)\n- Frecuencia cardíaca: [NO REGISTRADO]\n- Frecuencia respiratoria: [NO REGISTRADO]\n- Tensión arterial: [NO REGISTRADO]\n- Peso: 22 kg (registrado en control previo hace 3 semanas; peso actual no verbalizado)\n- Talla: 104 cm (registrada en control previo)\n- IMC: [NO REGISTRADO en esta consulta]\n\n7. EXAMEN FÍSICO REGIONAL:\n- Orofaringe (CP): Amígdalas hipertróficas con exudado purulento bilateral.\n- Cuello (CP): Adenopatías cervicales anteriores dolorosas a la palpación.\n- Resto del examen físico: [NO REGISTRADO]",
    "analisis": "J03.9 — Amigdalitis aguda, no especificada (presuntivo; cuadro clínico compatible con etiología estreptocócica: exudado purulento bilateral, adenopatías cervicales dolorosas, fiebre, ausencia de tos).",
    "plan": "Farmacológico:\n- Amoxicilina suspensión oral 250 mg/5 mL, 50 mg/kg/día VO c/12 h × 10 días. (Peso de referencia: 22 kg — confirmar peso actual antes de dispensar.)\n- Paracetamol suspensión oral 120 mg/5 mL (o 160 mg/5 mL), 10–15 mg/kg/dosis VO c/6 h según necesidad por fiebre o dolor. Máximo 4 dosis al día.\n\nNo farmacológico:\n- Reposo relativo en casa mientras persista la fiebre.\n- Abundante ingesta de líquidos (agua, caldos, jugos naturales sin azúcar).\n- Dieta blanda y fría si hay dolor al tragar.\n- Lavados de garganta con agua tibia con sal si la niña coopera.\n- No asistir a la escuela hasta 24 horas después de iniciar el antibiótico y estar afebril.\n- Completar el esquema completo de amoxicilina aunque mejore antes, para prevenir fiebre reumática y glomerulonefritis.\n\nSignos de alarma:\n- Fiebre que no cede en 48 horas de iniciado el antibiótico.\n- Erupción en la piel (manchas rojas o piel áspera como lija — sospecha de escarlatina).\n- Dificultad para tragar saliva o babeo excesivo (posible absceso periamigdalino — acudir a emergencia).\n- Dolor o inflamación en articulaciones (rodillas, tobillos, codos).\n- Orina de color oscuro o rojizo semanas después del cuadro (glomerulonefritis postestreptocócica).\n- Decaimiento marcado, somnolencia o dificultad para respirar.\n\nPróximo control: En 48–72 horas si no hay mejoría clínica o aparecen signos de alarma; control de seguimiento al completar el antibiótico (10 días).\n\nExámenes complementarios: — (No indicados en esta consulta; considerar cultivo de exudado faríngeo o test rápido de estreptococo si no hay respuesta al tratamiento.)\n\nDerivaciónación: — (Derivar a emergencia si presenta dificultad para tragar saliva, babeo, trismus o deterioro del estado general.)"
  },
  "cie10_codigo": "J03.9",
  "cie10_descripcion": "Amigdalitis aguda, no especificada",
  "indicaciones": [
    {
      "dci": "amoxicilina",
      "nombreComercial": null,
      "formaFarmaceutica": "suspensión oral",
      "concentracion": "250 mg/5 mL",
      "via": "oral",
      "dosis": "50 mg/kg/día (peso de referencia 22 kg — confirmar peso actual)",
      "frecuencia": "c/12h",
      "duracionDias": 10,
      "indicacion": "faringoamigdalitis estreptocócica",
      "origenDosis": "sugerencia_ia",
      "confirmado": false
    },
    {
      "dci": "paracetamol",
      "nombreComercial": null,
      "formaFarmaceutica": "suspensión oral",
      "concentracion": "120 mg/5 mL",
      "via": "oral",
      "dosis": "10–15 mg/kg/dosis (peso de referencia 22 kg — confirmar peso actual)",
      "frecuencia": "c/6h según necesidad por fiebre o dolor, máximo 4 dosis/día",
      "duracionDias": 3,
      "indicacion": "fiebre y odinofagia",
      "origenDosis": "sugerencia_ia",
      "confirmado": false
    }
  ],
  "signos_alarma": [
    "Fiebre que no baja en 48 horas después de iniciar el antibiótico.",
    "Aparición de manchas rojas en la piel o piel áspera como lija (puede ser escarlatina).",
    "Dificultad para tragar saliva o babeo excesivo — acudir de inmediato a emergencia (posible absceso en la garganta).",
    "Dolor o hinchazón en articulaciones como rodillas, tobillos o codos.",
    "Orina de color oscuro, marrón o rojizo en las semanas siguientes al cuadro.",
    "Decaimiento marcado, somnolencia inusual o dificultad para respirar."
  ],
  "seguimiento_plazo": "48–72 horas si no hay mejoría; control al completar los 10 días de antibiótico",
  "seguimiento_motivo": "Verificar respuesta clínica al tratamiento antibiótico y descartar complicaciones postestreptocócicas",
  "resumen_corto": "Faringoamigdalitis estreptocócica en preescolar femenina de 4 años, 22 kg. Amoxicilina 50 mg/kg/día por 10 días."
}
```

- ✅ mg-adulto — Medicina general, adulto, dosis fija
- ❌ ped-insuficiente — Pediatría, datos insuficientes (sin peso, sin examen)
    - corchete fuera de vocabulario en soap.analisis: '[ALERTA CLÍNICA: El médico prescribe amoxicilina para un cuadro de tos y mocos de 1 día de evolución en un preescolar. Las infecciones agudas de vías respiratorias superiores en niños son de etiología predominantemente viral y no requieren antibioticoterapia de rutina según GPC MSP Ecuador y AIEPI/OPS. Se recomienda revisar la indicación de amoxicilina antes de firmar. Si existe sospecha de sobreinfección bacteriana (faringoamigdalitis estreptocócica, OMA, sinusitis bacteriana), documentar hallazgos clínicos que justifiquen la prescripción.]'
    - corchete en campo estructurado de medicamento: indicaciones[0].dosis contiene '[REQUIERE PESO PARA CÁLCULO EXACTO]'
- ✅ mg-alergia — Medicina general, alergia a penicilina declarada
- ❌ mg-cronico — Medicina general, medicamento crónico (control)
    - corchete fuera de vocabulario en soap.subjetivo: '[NO REGISTRADO: alergias, otros antecedentes patológicos personales, hábitos, cirugías previas]'
    - corchete fuera de vocabulario en soap.subjetivo: '[NO REGISTRADO: revisión por sistemas completa]'
    - corchete fuera de vocabulario en soap.objetivo: '[NO REGISTRADO: frecuencia cardíaca, frecuencia respiratoria, temperatura, saturación de oxígeno, peso, talla, IMC]'
    - corchete fuera de vocabulario en soap.objetivo: '[NO REGISTRADO — no fue verbalizado en el dictado]'

## Corrida 2

- ❌ ped-primera-peso — Pediatría primera vez, peso verbalizado
    - corchete en campo estructurado de medicamento: indicaciones[0].dosis contiene '[REQUIERE CONFIRMACIÓN DE DOSIS POR EL MÉDICO]'
    - corchete en campo estructurado de medicamento: indicaciones[1].dosis contiene '[REQUIERE CONFIRMACIÓN DE DOSIS POR EL MÉDICO]'
- ❌ ped-emilia-historial — Pediatría subsecuente, peso 22 kg SOLO en historial (caso Emilia)
    - rango con peso disponible: indicaciones[1].dosis = '10–15 mg/kg/dosis (peso referido 22 kg) [REQUIERE CONFIRMACIÓN DE PESO ACTUAL]'
    - corchete fuera de vocabulario en soap.objetivo: '[NO REGISTRADO en esta consulta]'
    - corchete en campo estructurado de medicamento: indicaciones[1].dosis contiene '[REQUIERE CONFIRMACIÓN DE PESO ACTUAL]'

### Borrador caso Emilia (dump completo)

```json
{
  "soap": {
    "subjetivo": "1. MOTIVO DE CONSULTA: Fiebre y dolor de garganta.\n\n2. ENFERMEDAD ACTUAL: Preescolar femenina de 4 años 2 meses que consulta por cuadro de 2 días de evolución caracterizado por fiebre de 39 °C y odinofagia. Niega tos.\n\n3. ANTECEDENTES PERSONALES: Cuadros respiratorios altos a repetición (referido en contexto de consultas previas). Peso en último control (hace 3 semanas): 22 kg. Talla: 104 cm. Desarrollo psicomotor acorde para la edad. Sin alergias conocidas registradas. Antecedentes perinatales, alimentación, hospitalizaciones y cirugías previas: [NO REGISTRADO].\n\n4. ANTECEDENTES FAMILIARES: [NO REGISTRADO].\n\n5. REVISIÓN POR SISTEMAS:\n- Sistema respiratorio: CP — fiebre de 39 °C, odinofagia de 2 días. Sin tos.\n- Resto de sistemas: [NO REGISTRADO].",
    "objetivo": "6. SIGNOS VITALES Y ANTROPOMETRÍA:\n- Temperatura: 39 °C (axilar referida)\n- FC: [NO REGISTRADO]\n- FR: [NO REGISTRADO]\n- TA: [NO REGISTRADO]\n- Peso: 22 kg (registrado en control previo hace 3 semanas; peso actual no verbalizado en esta consulta)\n- Talla: 104 cm (control previo)\n- PC: no aplica (> 24 meses)\n- IMC: [NO REGISTRADO en esta consulta]\n\n7. EXAMEN FÍSICO REGIONAL:\n- Orofaringe: CP — amígdalas hipertróficas con exudado purulento bilateral.\n- Cuello: CP — adenopatías cervicales anteriores dolorosas.\n- Resto de regiones: [NO REGISTRADO].",
    "analisis": "J02.0 — Faringoamigdalitis estreptocócica (presuntivo)\n\nHallazgos compatibles con criterios de Centor/McIsaac: exudado amigdalino bilateral, adenopatías cervicales anteriores dolorosas, fiebre, ausencia de tos. Cuadro de 2 días de evolución en preescolar con antecedente de infecciones respiratorias altas a repetición.",
    "plan": "Farmacológico:\n- Amoxicilina suspensión oral 250 mg/5 mL, vía oral, 50 mg/kg/día, cada 12 horas, por 10 días. (Ver indicaciones adjuntas.)\n- Paracetamol suspensión oral, vía oral, 10–15 mg/kg/dosis, cada 6 horas según necesidad por fiebre o dolor. (Ver indicaciones adjuntas.)\n\nNo farmacológico:\n- Reposo relativo en casa mientras persista la fiebre.\n- Hidratación abundante: líquidos fríos o tibios a tolerancia (agua, jugos naturales, sopas).\n- Dieta blanda y fría si hay odinofagia intensa.\n- No asistir a la escuela hasta completar al menos 24 horas de antibiótico y estar afebril.\n- Lavados de garganta con agua tibia si la niña coopera.\n- Completar el esquema antibiótico completo aunque mejore antes.\n\nSignos de alarma:\n- Fiebre que no cede en 48 horas de iniciado el antibiótico o que supera 39 °C de forma persistente.\n- Erupción cutánea (manchas rojas en el cuerpo — sospecha de escarlatina).\n- Dificultad para tragar saliva o babeo excesivo (posible absceso periamigdalino — acudir a emergencia).\n- Dolor articular o hinchazón de articulaciones (sospecha de fiebre reumática).\n- Orina de color oscuro o con sangre semanas después (glomerulonefritis postestreptocócica).\n- Decaimiento marcado, somnolencia o irritabilidad inusual.\n\nPróximo control:\n- En 48–72 horas si no hay mejoría clínica o aparece algún signo de alarma.\n- Control de seguimiento al completar el tratamiento antibiótico (10 días).\n\nExámenes complementarios:\n- Cultivo de exudado faríngeo o test rápido de estreptococo si disponible, para confirmar etiología estreptocócica. (A criterio del médico tratante.)\n\nDerivaciónón:\n- Derivar a emergencia si presenta dificultad para tragar saliva, babeo, trismus o signos de obstrucción de vía aérea (sospecha de absceso periamigdalino o retrofaríngeo)."
  },
  "cie10_codigo": "J02.0",
  "cie10_descripcion": "Faringitis estreptocócica",
  "indicaciones": [
    {
      "dci": "amoxicilina",
      "nombreComercial": null,
      "formaFarmaceutica": "suspensión oral",
      "concentracion": "250 mg/5 mL",
      "via": "oral",
      "dosis": "50 mg/kg/día (peso referido 22 kg: 1 100 mg/día — REQUIERE CONFIRMACIÓN DE PESO ACTUAL ANTES DE DISPENSAR)",
      "frecuencia": "c/12h",
      "duracionDias": 10,
      "indicacion": "faringoamigdalitis estreptocócica",
      "origenDosis": "sugerencia_ia",
      "confirmado": false
    },
    {
      "dci": "paracetamol",
      "nombreComercial": null,
      "formaFarmaceutica": "suspensión oral",
      "concentracion": "160 mg/5 mL",
      "via": "oral",
      "dosis": "10–15 mg/kg/dosis (peso referido 22 kg) [REQUIERE CONFIRMACIÓN DE PESO ACTUAL]",
      "frecuencia": "c/6h según necesidad por fiebre o dolor (máx 4 dosis/día)",
      "duracionDias": 3,
      "indicacion": "fiebre y odinofagia en contexto de faringoamigdalitis",
      "origenDosis": "sugerencia_ia",
      "confirmado": false
    }
  ],
  "signos_alarma": [
    "Fiebre que no cede en 48 horas de iniciado el antibiótico o que sube por encima de 39 °C de forma persistente.",
    "Aparición de manchas o sarpullido rojo en el cuerpo (puede indicar escarlatina).",
    "Dificultad para tragar saliva, babeo excesivo o no puede abrir bien la boca (posible absceso — ir a emergencia de inmediato).",
    "Dolor o hinchazón en las articulaciones (rodillas, tobillos, codos) — puede indicar fiebre reumática.",
    "Orina de color oscuro, café o con sangre en las semanas siguientes al cuadro.",
    "Decaimiento marcado, somnolencia excesiva o irritabilidad inusual.",
    "Dificultad para respirar o voz muy apagada o gangosa de aparición brusca."
  ],
  "seguimiento_plazo": "48–72 horas si no hay mejoría; control al completar los 10 días de antibiótico",
  "seguimiento_motivo": "Verificar respuesta clínica al tratamiento antibiótico, descartar complicaciones (absceso, fiebre reumática) y evaluar necesidad de cultivo faríngeo o derivación a ORL por amigdalitis a repetición.",
  "resumen_corto": "Faringoamigdalitis estreptocócica presuntiva en preescolar de 4 años, 22 kg. Amoxicilina 50 mg/kg/día por 10 días."
}
```

- ✅ mg-adulto — Medicina general, adulto, dosis fija
- ❌ ped-insuficiente — Pediatría, datos insuficientes (sin peso, sin examen)
    - corchete fuera de vocabulario en soap.analisis: '[ALERTA CLÍNICA: El médico prescribe amoxicilina para un cuadro de tos y mocos de 1 día de evolución en un preescolar. Las infecciones agudas de vías respiratorias superiores en niños son de etiología predominantemente viral y no requieren antibioticoterapia de rutina. Se recomienda revisar la indicación antes de firmar. Si existe sospecha de sobreinfección bacteriana (faringoamigdalitis estreptocócica, OMA, sinusitis bacteriana), documentar los hallazgos clínicos que la justifiquen y ajustar el código CIE-10 correspondiente.]'
    - corchete fuera de vocabulario en soap.plan: '[REQUIERE PESO PARA CÁLCULO EXACTO]'
    - corchete fuera de vocabulario en soap.plan: '[ALERTA: Verificar indicación clínica — cuadro compatible con etiología viral. Confirmar antes de generar receta.]'
    - corchete en campo estructurado de medicamento: indicaciones[0].dosis contiene '[REQUIERE PESO PARA CÁLCULO EXACTO]'
    - corchete en campo estructurado de medicamento: indicaciones[1].dosis contiene '[REQUIERE PESO PARA CÁLCULO EXACTO]'
    - corchete en campo estructurado de medicamento: indicaciones[1].indicacion contiene '[REQUIERE CONFIRMACIÓN DE DIAGNÓSTICO BACTERIANO — prescrita por el médico, pendiente de justificación clínica]'
- ❌ mg-alergia — Medicina general, alergia a penicilina declarada
    - rango con peso disponible: indicaciones[1].dosis = '500–1000 mg por dosis según intensidad de fiebre o dolor'
- ❌ mg-cronico — Medicina general, medicamento crónico (control)
    - corchete fuera de vocabulario en soap.objetivo: '[NO REGISTRADO en el presente dictado]'

---
**Total de violaciones: 21**
