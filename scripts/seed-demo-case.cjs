/**
 * Seed de un caso penal demo de alto perfil para mostrar las capacidades
 * del sistema RAG + AI Summary.
 *
 * Caso: "Operación Cumbre Andina" — lavado de activos + peculado +
 * asociación ilícita + cohecho. 3 imputados, USD 47M, conexiones offshore.
 *
 * Genera 5 documentos jurídicos reales (denuncia fiscal, formulación de
 * cargos, peritaje contable, informe UAFE, escrito de acusación) y los
 * vincula al caso. Luego dispara el AI summary con el modelo activo.
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ADMIN_EMAIL = 'benitocabrera@hotmail.com';
const ADMIN_PWD = 'Benitomz2026$';
const BASE = 'http://localhost:8000/api/v1';

const CASE_DATA = {
  title: 'Operación Cumbre Andina - Caso Galarza Ríos',
  clientName: 'Diego Alejandro Galarza Ríos',
  caseNumber: '17282-2026-0001G',
  caseType: 'CIVIL', // backend exige enum, pero la metadata dice penal
  status: 'active',
  priority: 'high',
  description: `INVESTIGACIÓN PENAL POR LAVADO DE ACTIVOS Y PECULADO DOLOSO

PROCESO N°: 17282-2026-0001G
JUEZ COMPETENTE: Tribunal de Garantías Penales con sede en Quito
FISCAL ASIGNADO: Ab. Sandra Vélez Mosquera, Fiscalía Provincial de Pichincha
ETAPA PROCESAL: Instrucción Fiscal (Art. 590 COIP)

HECHOS:
El procesado Diego Alejandro Galarza Ríos, ex-Subsecretario de Contratación Pública del
Ministerio de Obras Públicas (período 2019-2022), se encuentra investigado por presuntamente
haber direccionado adjudicaciones por USD 47.3 millones a la empresa CONSTRUCTORA
MERIDIANO S.A., propiedad de su cuñado Felipe Andrade Salinas, durante la ejecución del
proyecto Vial E35 tramo Sangolquí-Tambillo.

La Unidad de Análisis Financiero (UAFE) detectó depósitos atípicos por USD 1.8 millones en
cuentas de la cónyuge del procesado, así como transferencias triangulares hacia la jurisdicción
de Panamá (CTC GLOBAL HOLDINGS S.A.) y Belice (PACIFIC TRADING LTD), sin sustento
económico justificable.

DELITOS IMPUTADOS:
1. Peculado doloso - Art. 278 COIP (10 a 13 años)
2. Lavado de activos - Art. 317 COIP (7 a 10 años)
3. Asociación ilícita - Art. 370 COIP (3 a 5 años)
4. Cohecho - Art. 280 COIP (3 a 5 años)

CO-PROCESADOS:
- Felipe Andrade Salinas (cuñado, gerente Constructora Meridiano)
- Verónica Cevallos Toro (cónyuge, beneficiaria final de las cuentas)
- Marcos Tinajero Espinoza (contador externo, autor del esquema offshore)

MEDIDAS CAUTELARES VIGENTES:
- Prohibición de salida del país (Art. 522.2 COIP)
- Inmovilización de fondos: USD 12.4M (cuentas Pichincha, Produbanco, Internacional)
- Prohibición de enajenar 3 inmuebles (Cumbayá, Tumbaco, Salinas)
- Presentación periódica ante autoridad

MONTO COMPROMETIDO: USD 47.3 millones (USD 32.1M proyecto vial + USD 15.2M comisiones)
RECUPERADO HASTA LA FECHA: USD 12.4 millones (26.2% del total)

DEFENSA ALEGA:
- Inexistencia de dolo en la adjudicación (procesos cumplieron con LOSNCP)
- Las transferencias offshore corresponden a herencia familiar declarada en 2017
- Vicios de procedimiento en el allanamiento del 12 de marzo de 2026
- Vulneración del derecho a la intimidad (Art. 66.20 CRE) en levantamiento bancario

ESTRATEGIA PROCESAL:
1. Solicitar nulidad del allanamiento por falta de orden judicial específica
2. Impulsar peritaje contable independiente para refutar Informe UAFE
3. Negociar acuerdo reparatorio (Art. 663 COIP) - inviable por la cuantía
4. Preparar excepciones de previo pronunciamiento para audiencia preparatoria

PRÓXIMA AUDIENCIA: 14 de mayo de 2026, 10:00 - Audiencia de Formulación de Cargos`,
};

const DOCUMENTS = [
  {
    title: 'Denuncia Fiscal - Investigación Previa N° 170401821042026',
    content: `FISCALÍA PROVINCIAL DE PICHINCHA
UNIDAD ESPECIALIZADA EN DELITOS CONTRA LA EFICIENCIA DE LA ADMINISTRACIÓN PÚBLICA

DENUNCIA N° 170401821042026
FECHA: 18 de febrero de 2026
DENUNCIANTE: Contraloría General del Estado (Informe DAI-AAPyA-0042-2025)
DENUNCIADOS: Diego Alejandro Galarza Ríos, ex-Subsecretario de Contratación Pública del MTOP

I. ANTECEDENTES

Mediante oficio N° CGE-DAI-0387-2026 de fecha 12 de febrero de 2026, el Contralor General
del Estado pone en conocimiento de esta Fiscalía los hallazgos de la auditoría especial
realizada al proceso de contratación N° MTOP-PVE35-2021-006 "Rehabilitación Vial E35
Tramo Sangolquí-Tambillo", correspondiente al ejercicio 2021.

II. HALLAZGOS DETERMINANTES

PRIMERO. Que con fecha 14 de junio de 2021, mediante Resolución N° MTOP-SCP-2021-128,
suscrita por el Subsecretario Diego Galarza Ríos, se adjudicó el contrato de obra pública por
USD 32,150,432.18 a la empresa CONSTRUCTORA MERIDIANO S.A. (RUC 1792847291001).

SEGUNDO. Que el procedimiento se llevó a cabo bajo la modalidad de subasta inversa
electrónica con un único oferente calificado, situación que constituye indicio de
direccionamiento conforme el Art. 6.5 LOSNCP.

TERCERO. Que el SERCOP había suspendido a CONSTRUCTORA MERIDIANO S.A. dos veces
en el período 2018-2020 por incumplimiento contractual, registro al cual el Subsecretario tuvo
acceso pero no consideró en la calificación.

CUARTO. Que existe vínculo familiar de SEGUNDO GRADO DE AFINIDAD entre el
funcionario adjudicador y el accionista mayoritario de la empresa adjudicada (Felipe
Andrade Salinas, cuñado del Subsecretario), conforme certificación del Registro Civil.

QUINTO. Que el Informe Técnico Económico DAI-AAPyA-0042-2025 establece un
SOBRECOSTO de USD 6,847,892.45 respecto al precio referencial de mercado para obras
similares ejecutadas en el período.

III. TIPIFICACIÓN

Los hechos se subsumen en los siguientes tipos penales del Código Orgánico Integral Penal:

a) Peculado doloso - Art. 278 COIP: "Las o los servidores públicos, y las personas que actúen
en virtud de una potestad estatal en alguna de las instituciones del Estado, determinadas
en la Constitución de la República, en beneficio propio o de terceras personas;
abusen, se apropien, distraigan o dispongan arbitrariamente de bienes muebles o
inmuebles, dineros públicos o privados, efectos que los representen, piezas, títulos o
efectos, serán sancionados con pena privativa de libertad de DIEZ A TRECE años."

b) Cohecho pasivo propio - Art. 280 COIP

IV. PETITORIO

Conforme lo dispuesto en los Arts. 195 CRE y 580 y siguientes COIP, esta Fiscalía SOLICITA:

1. Apertura formal de Investigación Previa
2. Designación del agente fiscal responsable
3. Disposición de pericia contable y grafológica
4. Requerimiento a UAFE de movimientos atípicos del denunciado y vinculados
5. Reserva de la investigación conforme Art. 584 COIP

Suscribe,
Ab. Sandra Vélez Mosquera
FISCAL PROVINCIAL DE PICHINCHA`,
  },

  {
    title: 'Formulación de Cargos - Audiencia de Vinculación',
    content: `TRIBUNAL DE GARANTÍAS PENALES CON SEDE EN EL DISTRITO METROPOLITANO DE QUITO
JUEZ DE GARANTÍAS PENALES: Dr. Roberto Andrade Vasconez

PROCESO PENAL N°: 17282-2026-0001G
DELITOS: Peculado, Lavado de Activos, Asociación Ilícita

AUDIENCIA DE FORMULACIÓN DE CARGOS Y SOLICITUD DE MEDIDAS CAUTELARES
Fecha: Quito, D.M., 22 de marzo de 2026, 09h30

PROCESADOS PRESENTES:
1. Diego Alejandro Galarza Ríos, C.C. 1714238095, defendido por el Dr. Andrés Páez Benalcázar
2. Felipe Andrade Salinas, C.C. 1709843271, defendido por la Dra. Mónica Tobar Cevallos
3. Verónica Cevallos Toro, C.C. 1718273645 (en libertad)
4. Marcos Tinajero Espinoza, C.C. 0925738291 (PRÓFUGO - orden de detención)

INTERVIENE:
- Por la Fiscalía: Ab. Sandra Vélez Mosquera, Fiscal Provincial de Pichincha
- Por la Procuraduría: Dr. Iván Cárdenas Bermúdez (víctima Estado ecuatoriano)

I. ALEGACIONES DE LA FISCALÍA

La señora Fiscal expone los hechos materia de la formulación, sustentados en los siguientes
elementos de convicción recabados durante la investigación previa:

ELEMENTO 1. Resolución N° MTOP-SCP-2021-128 con la firma autógrafa del procesado.
ELEMENTO 2. Informe pericial contable PCC-2026-0143 elaborado por el perito Dr. Carlos
            Espinoza, que cuantifica el sobreprecio en USD 6,847,892.45.
ELEMENTO 3. Certificado del Registro Civil que acredita parentesco por afinidad de segundo grado.
ELEMENTO 4. Reporte UAFE N° UAFE-DT-0294-2026 con identificación de transferencias
            triangulares por USD 1,847,392 a CTC GLOBAL HOLDINGS S.A. (Panamá) y
            PACIFIC TRADING LTD (Belice).
ELEMENTO 5. Estados de cuenta bancarios obtenidos mediante levantamiento del sigilo bancario
            (Resolución JBP-2026-0027 de la Junta de Política y Regulación Monetaria).
ELEMENTO 6. Informe de la SUPERCIAS sobre constitución de las offshore bajo nominee
            director (incumplimiento de transparencia accionaria).
ELEMENTO 7. Acta de allanamiento del 12 de marzo de 2026 a la residencia del procesado en
            Cumbayá, donde se incautaron USD 287,400 en efectivo y 18 dispositivos de
            almacenamiento digital.
ELEMENTO 8. Análisis forense de los dispositivos por la Unidad de Cibercrimen de la PJ que
            recuperó comunicaciones eliminadas referentes a la coordinación de la adjudicación.

II. TIPIFICACIÓN PROVISIONAL

a) Para Diego Galarza Ríos: AUTOR DIRECTO de peculado doloso (Art. 278 COIP),
   AUTOR de lavado de activos (Art. 317 COIP), CO-AUTOR de asociación ilícita (Art. 370 COIP).

b) Para Felipe Andrade Salinas: COOPERADOR NECESARIO de peculado, AUTOR de lavado
   de activos, CO-AUTOR de asociación ilícita.

c) Para Verónica Cevallos Toro: ENCUBRIDORA (Art. 272 COIP) y CO-AUTORA de lavado de
   activos por interposición de cuentas.

III. SOLICITUD DE MEDIDAS CAUTELARES

a) Prisión preventiva para Diego Galarza Ríos y Felipe Andrade Salinas (Art. 534 COIP):
   peligro de fuga acreditado por dispersión patrimonial offshore + recursos económicos
   suficientes para evadir la justicia.

b) Prohibición de salida del país y presentación periódica para Verónica Cevallos.

c) Inmovilización de fondos por USD 12.4M en las cuentas identificadas (Art. 549.2 COIP).

d) Prohibición de enajenar 3 inmuebles a nombre de los procesados (Art. 550 COIP).

e) Orden de detención inmediata contra Marcos Tinajero Espinoza (Art. 526 COIP).

IV. RESOLUCIÓN DEL JUEZ DE GARANTÍAS

ADMITIR la formulación de cargos por los delitos de PECULADO DOLOSO (Art. 278 COIP),
LAVADO DE ACTIVOS (Art. 317 COIP) y ASOCIACIÓN ILÍCITA (Art. 370 COIP).

DISPONER medidas cautelares así:
- Para Galarza Ríos y Andrade Salinas: prohibición de salida del país, presentación periódica
  cada 5 días, inmovilización de fondos. SE NIEGA LA PRISIÓN PREVENTIVA por considerar
  insuficientes los presupuestos del Art. 534.4 COIP en esta etapa procesal.
- Para Cevallos Toro: prohibición de salida del país.
- Para Tinajero Espinoza: ORDEN DE DETENCIÓN con fines investigativos.

DECLARAR la apertura de la INSTRUCCIÓN FISCAL por el plazo máximo de 90 días.

Notifíquese.`,
  },

  {
    title: 'Informe Pericial Contable PCC-2026-0143',
    content: `INFORME PERICIAL CONTABLE-FORENSE
PCC-2026-0143

PERITO ACREDITADO: Dr. Carlos Roberto Espinoza Maldonado
ACREDITACIÓN CJ: 17-001-2019-0847 (Vigencia: hasta 31-dic-2027)
ESPECIALIDAD: Contable-Financiera-Forense

REQUIRENTE: Fiscalía Provincial de Pichincha - Ab. Sandra Vélez Mosquera
PROCESO: 17282-2026-0001G
PUNTOS DE PERICIA: Auto fiscal del 02 de marzo de 2026

OBJETIVO DEL EXAMEN:
1. Cuantificar el presunto sobreprecio en el contrato MTOP-PVE35-2021-006.
2. Determinar la existencia de subcontrataciones simuladas.
3. Trazar el flujo financiero desde la cuenta del Estado hasta los beneficiarios finales.
4. Establecer la trazabilidad de los USD 1,847,392 transferidos a las offshore.

METODOLOGÍA APLICADA:
- Análisis horizontal y vertical de estados financieros (NIIF)
- Benchmarking con 14 contratos comparables del SERCOP (2019-2022)
- Reconstrucción de flujos mediante metodología FATF/GAFILAT
- Verificación cruzada con bases SRI, IESS, SUPERCIAS, Registro Mercantil
- Análisis Big Four de razonabilidad de costos unitarios (asfalto, agregados, mano de obra)

HALLAZGOS PRINCIPALES:

PRIMERO. SOBRECOSTO COMPROBADO
El precio adjudicado fue de USD 32,150,432.18. El precio referencial promedio ponderado de
14 obras viales similares ejecutadas en Sierra (período 2019-2022, longitud 18-22 km, mismas
especificaciones técnicas) es de USD 25,302,539.73.

DIFERENCIA: USD 6,847,892.45 (21.3% sobre el promedio sectorial)

Se verificó que los rubros con mayor sobreprecio fueron:
- Asfalto AC-20 modificado: 38.2% sobre precio mercado
- Excavación en roca: 41.7% sobre precio mercado
- Hormigón estructural f'c=240 kg/cm²: 19.4% sobre precio mercado

SEGUNDO. SUBCONTRATACIONES SIMULADAS
Se identificaron 7 subcontratos por USD 8,234,182 cuyos beneficiarios son empresas vinculadas:
- INVERSIONES DELTA NORTE S.A. (presta. servicios fantasma) - USD 2,180,392
- CONSTRUCCIONES FAS CIA. LTDA. (sin capacidad operativa) - USD 1,847,293
- ÁRIDOS DEL VALLE S.A. (subsidiaria de Meridiano) - USD 4,206,497

Las tres empresas comparten domicilio fiscal, contador y representante legal con
CONSTRUCTORA MERIDIANO S.A.

TERCERO. TRAZABILIDAD DE FLUJOS
Aplicando técnica de "follow the money", se reconstruyó la siguiente cadena:

[Estado Ecuatoriano] --USD 32.1M--> [Constructora Meridiano S.A.]
                                     |
                                     |--USD 8.2M--> [3 empresas fantasma]
                                     |              |
                                     |              |--USD 1.8M--> [Cuentas Verónica Cevallos]
                                     |              |              |
                                     |              |              |--USD 1.8M (transferencias triangulares)-->
                                     |              |                  |
                                     |              |                  |--> [CTC GLOBAL HOLDINGS S.A. - Panamá]
                                     |              |                  |--> [PACIFIC TRADING LTD - Belice]
                                     |              |
                                     |              |--USD 4.6M--> [Activos físicos: 2 inmuebles, 4 vehículos]
                                     |              |--USD 1.8M--> [Inversiones bursátiles BVQ]

CUARTO. INDICADORES DE LAVADO (red flags GAFILAT)
- Estructuración (smurfing): 47 depósitos < USD 10,000 entre julio y diciembre 2021.
- Capas (layering): mínimo 3 niveles de transferencias antes de llegar a beneficiario final.
- Integración (integration): adquisición de bienes inmuebles a precio inflado.
- Uso de jurisdicciones de baja transparencia (Panamá, Belice).
- Discrepancia ingreso-patrimonio del procesado: declaró ingresos por USD 78,000 anuales,
  pero su patrimonio creció en USD 4.2M durante el período investigado.

CONCLUSIONES:

1. EXISTE SOBRECOSTO COMPROBADO en el contrato MTOP-PVE35-2021-006 por
   USD 6,847,892.45, configurándose el elemento objetivo del tipo penal de PECULADO
   (Art. 278 COIP).

2. EXISTE TRAZABILIDAD CONTABLE entre el dinero adjudicado del Estado y las cuentas de
   la cónyuge del funcionario, así como su posterior transferencia a jurisdicciones offshore,
   configurándose los actos de COLOCACIÓN, ENCUBRIMIENTO E INTEGRACIÓN propios
   del LAVADO DE ACTIVOS (Art. 317 COIP).

3. EXISTE PATRÓN DE ASOCIACIÓN ILÍCITA: estructura societaria diseñada deliberadamente
   para canalizar fondos públicos hacia el círculo familiar del funcionario.

Quito, D.M., 18 de abril de 2026
Dr. Carlos Roberto Espinoza Maldonado
PERITO CONTABLE-FORENSE`,
  },

  {
    title: 'Reporte UAFE - Análisis de Operaciones Atípicas',
    content: `UNIDAD DE ANÁLISIS FINANCIERO Y ECONÓMICO - UAFE
DIRECCIÓN TÉCNICA - SUBDIRECCIÓN DE INTELIGENCIA FINANCIERA

REPORTE DE INTELIGENCIA FINANCIERA N° UAFE-DT-0294-2026
CARÁCTER: RESERVADO (Art. 585 COIP)
DESTINATARIO: Fiscal Provincial de Pichincha

I. ANTECEDENTE

Mediante reporte de operación inusual e injustificada (ROIE-2025-08-09142) presentado por
BANCO PICHINCHA C.A. con fecha 23 de agosto de 2025, se puso en conocimiento de esta
Unidad la realización de operaciones financieras que presentaban características atípicas
respecto del perfil transaccional del cliente VERÓNICA CEVALLOS TORO.

II. PERFIL DEL TITULAR

Verónica Patricia Cevallos Toro
C.C. 1718273645
Profesión declarada: Diseñadora gráfica independiente
Ingresos declarados (2024): USD 18,400 anuales
Patrimonio declarado: USD 87,200
Cónyuge: Diego Alejandro Galarza Ríos (servidor público)

III. OPERACIONES IDENTIFICADAS

A. DEPÓSITOS EN EFECTIVO (smurfing detectado)
Período: julio 2021 - diciembre 2021
Cantidad de depósitos: 47
Monto promedio: USD 9,847
Monto total: USD 462,809
Patrón: depósitos sistemáticamente bajo el umbral de reporte (USD 10,000)
realizados en 8 sucursales diferentes de 3 ciudades.

B. TRANSFERENCIAS INTERNACIONALES SALIENTES
Total: USD 1,847,392 en 12 transferencias durante 2022
Beneficiarios:
1. CTC GLOBAL HOLDINGS S.A. (Panamá) - USD 1,250,000
   - Cuenta en Banco General Panamá
   - Director registrado: PROFIDUCIARIA SAGITARIO S.A. (nominee)
2. PACIFIC TRADING LTD (Belice) - USD 597,392
   - Cuenta en Belize Bank International Limited
   - Estructura: International Business Company sin obligación de transparencia accionaria

Concepto declarado: "préstamo familiar / inversión inmobiliaria"
Sustento documental: NO PRESENTADO pese a requerimientos del banco.

C. CRECIMIENTO PATRIMONIAL ANÓMALO
2020: patrimonio total USD 87,200
2024: patrimonio total USD 4,287,400
Crecimiento: 4,818% en 4 años
Justificación documentada: NO CORRESPONDE con ingresos profesionales declarados.

IV. RED FLAGS GAFILAT IDENTIFICADAS (catálogo 2024)

[X] Estructuración para evadir reportes (smurfing) - Indicador 4.2
[X] Discrepancia significativa entre perfil económico declarado y operaciones - Indicador 6.1
[X] Uso de jurisdicciones de baja transparencia fiscal - Indicador 9.3
[X] Vinculación familiar con persona políticamente expuesta (PEP) - Indicador 11.1
[X] Operaciones triangulares sin sustento económico - Indicador 7.4
[X] Uso de empresas con nominee directors - Indicador 10.2

V. ANÁLISIS DE CONEXIÓN CON CASO PENAL

La temporalidad de los movimientos coincide exactamente con:
- Adjudicación del contrato MTOP-PVE35-2021-006 (junio 2021)
- Pagos parciales del Estado a Constructora Meridiano (julio 2021 - mayo 2022)
- Subcontrataciones simuladas a empresas fantasma (agosto 2021 - diciembre 2021)

La Unidad encuentra ELEMENTOS SUFICIENTES para presumir que las operaciones detectadas
son resultado del proceso de COLOCACIÓN, ENCUBRIMIENTO E INTEGRACIÓN de recursos
provenientes del peculado denunciado.

VI. RECOMENDACIONES

1. Solicitar levantamiento del sigilo bancario en las 5 instituciones identificadas.
2. Cooperación internacional con UIF de Panamá y Belice (vía Egmont Group).
3. Inmovilización inmediata de USD 12.4M identificados en cuentas locales.
4. Análisis grafotécnico de poderes que respaldan las offshore.

UAFE | Quito, D.M., 04 de marzo de 2026`,
  },

  {
    title: 'Escrito de Excepciones Previas - Defensa Técnica',
    content: `Sr. Dr.
JUEZ DE GARANTÍAS PENALES CON SEDE EN EL DISTRITO METROPOLITANO DE QUITO
S. en su despacho.-

PROCESO N°: 17282-2026-0001G
ASUNTO: ESCRITO DE EXCEPCIONES DE PREVIO PRONUNCIAMIENTO Y SOLICITUD DE
        NULIDAD DE ALLANAMIENTO

DIEGO ALEJANDRO GALARZA RÍOS, ecuatoriano, mayor de edad, portador de la cédula
1714238095, casado, domiciliado en esta ciudad, dentro del proceso penal de la referencia,
por intermedio de mi abogado defensor Dr. Andrés Páez Benalcázar (Mat. 17-2014-1247),
ante usted comparezco respetuosamente y digo:

I. ANTECEDENTES

Mediante audiencia de formulación de cargos del 22 de marzo de 2026, su Autoridad declaró
abierta la instrucción fiscal en mi contra por los presuntos delitos de peculado doloso (Art.
278 COIP), lavado de activos (Art. 317 COIP) y asociación ilícita (Art. 370 COIP).

II. EXCEPCIONES QUE SE DEDUCEN

PRIMERA EXCEPCIÓN: PRESCRIPCIÓN DE LA ACCIÓN PENAL POR PECULADO

Conforme el Art. 16 numeral 4 COIP en concordancia con el Art. 75 ibídem, los hechos
materia de imputación se remontan al 14 de junio de 2021. A la fecha de la formulación
de cargos (22 de marzo de 2026) han transcurrido CUATRO AÑOS, NUEVE MESES Y OCHO
DÍAS. Si bien para el peculado el plazo de prescripción es de 13 años contados desde la
fecha de comisión, esta defensa se reserva el derecho de invocarla parcialmente respecto
de actos prescriptibles autónomos.

SEGUNDA EXCEPCIÓN: NULIDAD ABSOLUTA DEL ALLANAMIENTO DEL 12 DE MARZO DE 2026

Conforme el Art. 76 numeral 4 CRE y Art. 481 COIP, las pruebas obtenidas con violación
de la Constitución NO TENDRÁN VALIDEZ ALGUNA y serán EXCLUIDAS del expediente.

En el caso concreto:

a) La orden de allanamiento dispuesta en auto del 11 de marzo de 2026 carece de los
   requisitos del Art. 481.2 COIP, por cuanto:
   i) No identifica con precisión el inmueble (omite número de departamento)
   ii) No motiva la urgencia que justifica el horario nocturno (allanamiento a las 22h47)
   iii) No precisa los objetos a buscar, autorizando una búsqueda exploratoria
        (FISHING EXPEDITION) prohibida por el bloque de constitucionalidad.

b) El acta de allanamiento omite mencionar la presencia de testigos imparciales conforme
   exige el Art. 481.5 COIP, viciando integralmente la diligencia.

c) El levantamiento del sigilo bancario contenido en la resolución JBP-2026-0027 carece de
   motivación específica respecto de mi cónyuge, configurándose una autorización GENÉRICA
   PROHIBIDA por la jurisprudencia constitucional (Sentencia 1158-17-EP/21).

TERCERA EXCEPCIÓN: VULNERACIÓN AL PRINCIPIO DE LEGALIDAD POR INDEFINICIÓN
                    DEL TIPO DE LAVADO DE ACTIVOS

El Art. 317 COIP exige como elemento del tipo el "conocimiento del origen ilícito" de los
fondos. El requerimiento fiscal NO ESTABLECE de qué manera mi defendido habría tenido
conocimiento del presunto carácter ilícito de operaciones realizadas por su cónyuge.

CUARTA EXCEPCIÓN: AUSENCIA DE ELEMENTOS DEL TIPO PENAL DE ASOCIACIÓN ILÍCITA

El Art. 370 COIP requiere acuerdo previo, distribución de roles y permanencia. Los
elementos de convicción presentados por la Fiscalía no acreditan ninguno de estos
elementos respecto de mi defendido, configurándose una imputación objetiva pero
subjetivamente insostenible.

III. PRINCIPIO PRO LIBERTATE

Conforme el Art. 11 numeral 5 CRE, en caso de duda sobre el alcance de las normas que
restringen derechos fundamentales, se interpretará en el sentido MÁS FAVORABLE al
imputado. Las irregularidades documentadas obligan a su Autoridad a proteger las garantías
del debido proceso.

IV. PETITORIO

Por las consideraciones expuestas, A USTED SEÑOR JUEZ, respetuosamente SOLICITO:

PRIMERO. DECLARAR LA NULIDAD ABSOLUTA del allanamiento del 12 de marzo de 2026 y,
en consecuencia, EXCLUIR del expediente todos los elementos probatorios derivados.

SEGUNDO. ORDENAR el levantamiento de las medidas cautelares dispuestas, en aplicación
del principio de proporcionalidad (Art. 76.6 CRE).

TERCERO. CONVOCAR a audiencia de evaluación y preparatoria de juicio para resolver las
excepciones planteadas.

CUARTO. SUBSIDIARIAMENTE, en caso de no acoger las excepciones de fondo, sustituir las
medidas cautelares por una caución equivalente al monto que se establezca según el Art.
542 COIP.

Sírvase proveer.
Quito, D.M., 26 de abril de 2026.

DIEGO GALARZA RÍOS                    Dr. ANDRÉS PÁEZ BENALCÁZAR
Procesado                              Defensor Técnico
C.C. 1714238095                        Mat. 17-2014-1247`,
  },
];

(async () => {
  // 1. Login
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const lr = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PWD }),
  });
  const { access_token: tok } = await lr.json();
  const auth = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };

  // 2. Crear caso
  console.log('1) Creating case...');
  const cr = await fetch(`${BASE}/cases`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(CASE_DATA),
  });
  if (!cr.ok) {
    console.error('FAIL:', cr.status, await cr.text());
    process.exit(1);
  }
  const caseRes = await cr.json();
  const caseId = caseRes.case.id;
  console.log('   case id:', caseId);

  // 3. Crear documentos via raw SQL (Prisma Document model existe)
  console.log('\n2) Creating documents...');
  const fs = require('fs');
  const T = fs.readFileSync('.supabase-access-token', 'utf8').trim();
  const REF = 'lmnzzcqqegqugphcnmew';

  for (const [i, doc] of DOCUMENTS.entries()) {
    // user_id se obtiene del JWT que decodificamos
    const payload = JSON.parse(Buffer.from(tok.split('.')[1], 'base64').toString());
    const userId = payload.sub;

    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `INSERT INTO public.documents (id, case_id, user_id, title, content, updated_at)
                VALUES (gen_random_uuid()::text, '${caseId}', '${userId}',
                        $$${doc.title}$$,
                        $$${doc.content}$$,
                        now())
                RETURNING id, title`,
      }),
    });
    const dd = await r.json();
    console.log(`   ${i + 1}. ${dd[0]?.title || '(failed)'}`);
  }

  console.log(`\n✓ Case ready: ${caseId}`);
  console.log(`Para verlo: http://localhost:3000/dashboard`);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
