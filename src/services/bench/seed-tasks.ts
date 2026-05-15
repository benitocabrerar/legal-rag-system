/**
 * Poweria Bench — dataset semilla (v1).
 *
 * 24 tareas de derecho ecuatoriano repartidas en 6 materias. Es el punto
 * de partida del benchmark; la operadora puede ampliar el dataset
 * directamente en la tabla bench_tasks (o agregando objetos acá y
 * volviendo a sembrar — el seeder es idempotente por id).
 *
 * Cada tarea declara:
 *   - prompt        → la consigna jurídica
 *   - rubric        → cómo se califica una buena respuesta
 *   - expectedNorms → fragmentos de norma que deberían aparecer
 *
 * Las rúbricas describen el contenido esperado SIN dárselo al modelo:
 * el modelo solo recibe el prompt; la rúbrica la usa el juez.
 */
import type { BenchTask } from './types.js';

export const BENCH_SEED_TASKS: BenchTask[] = [
  // ─────────────────────────── CONSTITUCIONAL ───────────────────────────
  {
    id: 'constitucional-001',
    category: 'Constitucional',
    difficulty: 'basico',
    taskType: 'norm_identification',
    prompt:
      '¿Qué cuerpo normativo establece los derechos fundamentales en el Ecuador y qué ' +
      'posición ocupa en la jerarquía del ordenamiento jurídico?',
    rubric:
      'Debe identificar la Constitución de la República del Ecuador como norma suprema, ' +
      'señalar su supremacía sobre el resto del ordenamiento y, idealmente, mencionar el ' +
      'orden jerárquico de aplicación de las normas. No debe inventar artículos.',
    expectedNorms: ['constitucion'],
  },
  {
    id: 'constitucional-002',
    category: 'Constitucional',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      'Un ciudadano considera que un acto de la administración pública vulneró su derecho ' +
      'al debido proceso y no existe otra vía judicial adecuada. ¿Qué garantía jurisdiccional ' +
      'puede interponer y cuáles son sus presupuestos básicos?',
    rubric:
      'Debe identificar la acción de protección como garantía jurisdiccional, indicar que ' +
      'procede ante vulneración de derechos constitucionales cuando no hay otra vía eficaz, ' +
      'y mencionar requisitos básicos (acto u omisión, vulneración de un derecho, ' +
      'inexistencia de mecanismo ordinario adecuado). Bien si cita la LOGJCC.',
    expectedNorms: ['constitucion'],
  },
  {
    id: 'constitucional-003',
    category: 'Constitucional',
    difficulty: 'intermedio',
    taskType: 'citation_accuracy',
    prompt:
      '¿En qué casos procede la acción extraordinaria de protección y ante qué órgano se ' +
      'presenta?',
    rubric:
      'Debe indicar que procede contra sentencias o autos definitivos firmes en que se ' +
      'hayan vulnerado derechos constitucionales, que es subsidiaria (agotados los recursos ' +
      'ordinarios) y que se presenta ante la Corte Constitucional. Penaliza inventar normas.',
    expectedNorms: ['constitucion'],
  },
  {
    id: 'constitucional-004',
    category: 'Constitucional',
    difficulty: 'avanzado',
    taskType: 'open_analysis',
    prompt:
      'Analice el principio de aplicación directa de la Constitución y su impacto en la ' +
      'labor del juez ordinario ecuatoriano.',
    rubric:
      'Debe explicar que los derechos y garantías constitucionales son de aplicación ' +
      'directa e inmediata, que el juez ordinario está obligado a aplicar la Constitución ' +
      'aun ante silencio o contradicción de la ley, y discutir la relación con el control ' +
      'de constitucionalidad. Se valora profundidad y ausencia de afirmaciones inventadas.',
    expectedNorms: ['constitucion'],
  },

  // ──────────────────────────────── CIVIL ───────────────────────────────
  {
    id: 'civil-001',
    category: 'Civil',
    difficulty: 'basico',
    taskType: 'norm_identification',
    prompt:
      '¿Qué norma regula los contratos y las obligaciones civiles entre particulares en el ' +
      'Ecuador?',
    rubric:
      'Debe identificar el Código Civil como cuerpo que regula obligaciones y contratos. ' +
      'Puede mencionar la teoría general de las obligaciones. No debe inventar artículos.',
    expectedNorms: ['codigo civil'],
  },
  {
    id: 'civil-002',
    category: 'Civil',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      'Una persona vendió un inmueble y entregó la posesión, pero el comprador no ha pagado ' +
      'el precio pactado. ¿Qué acciones civiles tiene el vendedor?',
    rubric:
      'Debe explicar que ante incumplimiento procede, a elección del acreedor, la acción de ' +
      'cumplimiento (pago del precio) o la acción resolutoria del contrato, ambas con ' +
      'indemnización de perjuicios (condición resolutoria tácita en los contratos ' +
      'bilaterales). Se valora precisión sobre la opción del acreedor.',
    expectedNorms: ['codigo civil'],
  },
  {
    id: 'civil-003',
    category: 'Civil',
    difficulty: 'avanzado',
    taskType: 'rule_application',
    prompt:
      '¿Cuál es el plazo de prescripción extintiva de la acción ordinaria para reclamar el ' +
      'cumplimiento de una obligación y desde qué momento se cuenta?',
    rubric:
      'Debe indicar el plazo de prescripción de las acciones ordinarias conforme al Código ' +
      'Civil y precisar que se cuenta desde que la obligación se hizo exigible. Se valora ' +
      'distinguir prescripción de acciones ejecutivas y ordinarias. Penaliza cifras inventadas.',
    expectedNorms: ['codigo civil'],
  },
  {
    id: 'civil-004',
    category: 'Civil',
    difficulty: 'intermedio',
    taskType: 'open_analysis',
    prompt:
      'Explique la diferencia entre nulidad absoluta y nulidad relativa de un contrato según ' +
      'el Código Civil ecuatoriano, con sus causas y quién puede alegarlas.',
    rubric:
      'Debe distinguir la nulidad absoluta (vicios que afectan el interés general: objeto o ' +
      'causa ilícita, omisión de requisitos exigidos en consideración al acto) de la ' +
      'relativa (vicios del consentimiento, incapacidad relativa), indicar quién puede ' +
      'alegar cada una y si son saneables o no.',
    expectedNorms: ['codigo civil'],
  },

  // ──────────────────────────────── PENAL ───────────────────────────────
  {
    id: 'penal-001',
    category: 'Penal',
    difficulty: 'basico',
    taskType: 'norm_identification',
    prompt:
      '¿Qué cuerpo legal tipifica los delitos y establece las penas en el Ecuador?',
    rubric:
      'Debe identificar el Código Orgánico Integral Penal (COIP) como norma que tipifica ' +
      'infracciones y fija penas, y mencionar el principio de legalidad penal.',
    expectedNorms: ['codigo organico integral penal'],
  },
  {
    id: 'penal-002',
    category: 'Penal',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      'Dictada una sentencia condenatoria en primera instancia en materia penal, ¿qué ' +
      'recurso procede para impugnarla y en qué plazo debe interponerse?',
    rubric:
      'Debe identificar el recurso de apelación, indicar que se interpone ante el mismo ' +
      'tribunal para ante la Corte Provincial y precisar el plazo legal del COIP. Se valora ' +
      'exactitud del plazo; penaliza inventar números.',
    expectedNorms: ['codigo organico integral penal'],
  },
  {
    id: 'penal-003',
    category: 'Penal',
    difficulty: 'intermedio',
    taskType: 'citation_accuracy',
    prompt:
      '¿Qué requisitos deben cumplirse para que un juez ordene la prisión preventiva como ' +
      'medida cautelar?',
    rubric:
      'Debe enumerar los requisitos: elementos de convicción sobre la existencia del delito ' +
      'y la participación, que se trate de delito sancionado con pena privativa de libertad ' +
      'superior a un año, y que las medidas no privativas sean insuficientes. Debe tratar la ' +
      'prisión preventiva como excepcional. Penaliza inventar artículos.',
    expectedNorms: ['codigo organico integral penal', 'constitucion'],
  },
  {
    id: 'penal-004',
    category: 'Penal',
    difficulty: 'avanzado',
    taskType: 'open_analysis',
    prompt:
      'Analice el principio de mínima intervención penal y cómo se refleja en el diseño del ' +
      'COIP ecuatoriano.',
    rubric:
      'Debe explicar el principio (el derecho penal como última ratio), vincularlo con la ' +
      'subsidiariedad y fragmentariedad, y dar ejemplos de su reflejo en el COIP ' +
      '(procedimientos alternativos, conciliación, criterios de oportunidad). Se valora ' +
      'profundidad analítica.',
    expectedNorms: ['codigo organico integral penal'],
  },

  // ─────────────────────────────── LABORAL ──────────────────────────────
  {
    id: 'laboral-001',
    category: 'Laboral',
    difficulty: 'basico',
    taskType: 'norm_identification',
    prompt:
      '¿Qué norma regula la relación entre empleador y trabajador en el sector privado del ' +
      'Ecuador?',
    rubric:
      'Debe identificar el Código del Trabajo como norma rectora de la relación laboral ' +
      'privada. Bien si menciona el carácter protector e irrenunciable de los derechos.',
    expectedNorms: ['codigo del trabajo'],
  },
  {
    id: 'laboral-002',
    category: 'Laboral',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      'Un trabajador con 3 años completos de servicio fue despedido sin causa justificada. ' +
      '¿A qué rubros indemnizatorios tiene derecho por el despido intempestivo?',
    rubric:
      'Debe identificar la indemnización por despido intempestivo del Código del Trabajo ' +
      '(escala según años de servicio) y la bonificación adicional, además de las ' +
      'remuneraciones y beneficios pendientes. Se valora precisión del cálculo según ' +
      'antigüedad; penaliza cifras inventadas.',
    expectedNorms: ['codigo del trabajo'],
  },
  {
    id: 'laboral-003',
    category: 'Laboral',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      '¿Cómo se calculan la decimotercera y la decimocuarta remuneración de un trabajador y ' +
      'en qué fechas se pagan?',
    rubric:
      'Debe explicar que la decimotercera equivale a la doceava parte de las remuneraciones ' +
      'percibidas en el año y la decimocuarta a una remuneración básica unificada, indicar ' +
      'el período de cómputo y las fechas de pago. Se valora exactitud.',
    expectedNorms: ['codigo del trabajo'],
  },
  {
    id: 'laboral-004',
    category: 'Laboral',
    difficulty: 'avanzado',
    taskType: 'open_analysis',
    prompt:
      'Analice el régimen del teletrabajo en la legislación laboral ecuatoriana y sus ' +
      'diferencias frente a la modalidad presencial.',
    rubric:
      'Debe describir el teletrabajo como modalidad regulada en el Código del Trabajo, ' +
      'tratar la voluntariedad, la igualdad de derechos respecto del trabajo presencial, el ' +
      'derecho a la desconexión y la provisión de equipos. Se valora análisis equilibrado.',
    expectedNorms: ['codigo del trabajo'],
  },

  // ────────────────────────────── TRIBUTARIO ────────────────────────────
  {
    id: 'tributario-001',
    category: 'Tributario',
    difficulty: 'basico',
    taskType: 'norm_identification',
    prompt:
      '¿Qué norma establece los principios del régimen tributario y las normas generales ' +
      'aplicables a los tributos en el Ecuador?',
    rubric:
      'Debe identificar el Código Tributario como norma que fija los principios y las ' +
      'normas generales de la tributación. Bien si menciona la relación con la ley ' +
      'específica de cada tributo.',
    expectedNorms: ['codigo tributario'],
  },
  {
    id: 'tributario-002',
    category: 'Tributario',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      '¿Cuál es el plazo de prescripción de la obligación tributaria y de la acción de cobro ' +
      'por parte de la administración?',
    rubric:
      'Debe indicar el plazo de prescripción de la acción de cobro conforme al Código ' +
      'Tributario y distinguir el supuesto en que el contribuyente no presentó la ' +
      'declaración. Penaliza inventar plazos.',
    expectedNorms: ['codigo tributario'],
  },
  {
    id: 'tributario-003',
    category: 'Tributario',
    difficulty: 'intermedio',
    taskType: 'citation_accuracy',
    prompt:
      '¿Qué vías de impugnación tiene un contribuyente frente a un acto de determinación ' +
      'tributaria con el que no está de acuerdo?',
    rubric:
      'Debe distinguir la vía administrativa (reclamo ante la propia administración, ' +
      'recurso de revisión) de la vía contenciosa (acción ante el Tribunal Distrital de lo ' +
      'Contencioso Tributario), indicando su carácter optativo. Penaliza inventar normas.',
    expectedNorms: ['codigo tributario'],
  },
  {
    id: 'tributario-004',
    category: 'Tributario',
    difficulty: 'avanzado',
    taskType: 'open_analysis',
    prompt:
      'Analice el principio de reserva de ley en materia tributaria conforme al ordenamiento ' +
      'jurídico ecuatoriano.',
    rubric:
      'Debe explicar que solo mediante ley se pueden crear, modificar o extinguir tributos ' +
      'y definir sus elementos esenciales, vincularlo con la Constitución y el Código ' +
      'Tributario, y discutir el alcance respecto de tasas y contribuciones de los GAD.',
    expectedNorms: ['codigo tributario', 'constitucion'],
  },

  // ───────────────────────────── SOCIETARIO ─────────────────────────────
  {
    id: 'societario-001',
    category: 'Societario',
    difficulty: 'basico',
    taskType: 'norm_identification',
    prompt:
      '¿Qué norma regula la constitución, el funcionamiento y la disolución de las compañías ' +
      'mercantiles en el Ecuador?',
    rubric:
      'Debe identificar la Ley de Compañías como norma rectora y, opcionalmente, mencionar ' +
      'el rol de la Superintendencia de Compañías como organismo de control.',
    expectedNorms: ['ley de compañias'],
  },
  {
    id: 'societario-002',
    category: 'Societario',
    difficulty: 'intermedio',
    taskType: 'rule_application',
    prompt:
      '¿Cuáles son los requisitos esenciales para constituir una compañía de responsabilidad ' +
      'limitada en el Ecuador?',
    rubric:
      'Debe tratar el número de socios (mínimo y máximo), el capital y su forma de ' +
      'integración, la escritura pública e inscripción en el Registro Mercantil, y la ' +
      'limitación de responsabilidad al monto de los aportes. Se valora completitud.',
    expectedNorms: ['ley de compañias'],
  },
  {
    id: 'societario-003',
    category: 'Societario',
    difficulty: 'avanzado',
    taskType: 'rule_application',
    prompt:
      '¿Puede una sociedad anónima distribuir dividendos anticipados antes del cierre del ' +
      'ejercicio económico? Fundamente la respuesta.',
    rubric:
      'Debe explicar que los dividendos se reparten sobre utilidades líquidas y realizadas ' +
      'reflejadas en balances aprobados, por lo que el reparto anticipado sin utilidades ' +
      'aprobadas es jurídicamente problemático. Se valora una conclusión expresa y ' +
      'fundamentada, no ambigua.',
    expectedNorms: ['ley de compañias'],
  },
  {
    id: 'societario-004',
    category: 'Societario',
    difficulty: 'intermedio',
    taskType: 'open_analysis',
    prompt:
      'Explique las diferencias principales entre la compañía anónima y la compañía de ' +
      'responsabilidad limitada en el derecho societario ecuatoriano.',
    rubric:
      'Debe contrastar al menos: forma de representación del capital (acciones vs. ' +
      'participaciones), número de socios/accionistas, transferibilidad, denominación, y ' +
      'gobierno de la compañía. Se valora un cuadro comparativo claro y correcto.',
    expectedNorms: ['ley de compañias'],
  },
];
