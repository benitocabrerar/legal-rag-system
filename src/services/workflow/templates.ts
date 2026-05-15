/**
 * Workflow Studio — plantillas del sistema (v1).
 *
 * Cada plantilla encadena pasos que reutilizan los servicios de IA
 * existentes. Los prompts interpolan:
 *   {{input}}            → lo que escribió el usuario
 *   {{steps.<stepId>}}   → la salida de un paso anterior
 *
 * Diseñadas para el trabajo diario del abogado ecuatoriano. Ampliar esta
 * lista es solo agregar objetos — el motor no cambia.
 */
import type { WorkflowTemplate } from './types.js';

const RAG_SYSTEM = `Sos un asistente jurídico experto en derecho ecuatoriano de Poweria Legal.
Respondés con precisión técnica, en español, citando los artículos y normas concretas.
Basás tus respuestas en el contexto normativo provisto; si no alcanza, lo decís
explícitamente. No inventás artículos ni números de ley.`;

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ─── 1. Consulta jurídica fundamentada ──────────────────────────────
  {
    key: 'consulta-fundamentada',
    name: 'Consulta jurídica fundamentada',
    description: 'Respondé una pregunta legal con base en el corpus, citando normativa aplicable.',
    icon: '⚖️',
    category: 'Investigación',
    inputLabel: 'Tu consulta jurídica',
    inputPlaceholder: '¿Cuál es el plazo para apelar una sentencia en materia penal?',
    steps: [
      {
        id: 'busqueda',
        name: 'Buscar normativa aplicable',
        type: 'rag_search',
        queryTemplate: '{{input}}',
        ragLimit: 10,
      },
      {
        id: 'respuesta',
        name: 'Redactar respuesta fundamentada',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 1800,
        promptTemplate:
          'CONTEXTO NORMATIVO:\n{{steps.busqueda}}\n\n' +
          'CONSULTA DEL ABOGADO:\n{{input}}\n\n' +
          'Respondé la consulta de forma estructurada: (1) respuesta directa, ' +
          '(2) fundamento normativo con artículos citados, (3) consideraciones prácticas.',
      },
    ],
  },

  // ─── 2. Análisis de una norma o tema ────────────────────────────────
  {
    key: 'analisis-norma',
    name: 'Análisis de norma o tema',
    description: 'Análisis estructurado de una norma o tema jurídico: qué regula, alcance e implicaciones.',
    icon: '📜',
    category: 'Investigación',
    inputLabel: 'Norma o tema a analizar',
    inputPlaceholder: 'Régimen de teletrabajo en el Código del Trabajo',
    steps: [
      {
        id: 'busqueda',
        name: 'Recuperar normativa relacionada',
        type: 'rag_search',
        queryTemplate: '{{input}}',
        ragLimit: 12,
      },
      {
        id: 'analisis',
        name: 'Elaborar análisis estructurado',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 2200,
        promptTemplate:
          'CONTEXTO NORMATIVO:\n{{steps.busqueda}}\n\n' +
          'TEMA A ANALIZAR:\n{{input}}\n\n' +
          'Elaborá un análisis jurídico con estas secciones: ' +
          '(1) Qué regula, (2) Marco normativo y jerarquía, (3) Alcance y sujetos obligados, ' +
          '(4) Implicaciones prácticas, (5) Puntos de atención o vacíos.',
      },
    ],
  },

  // ─── 3. Borrador de escrito legal ───────────────────────────────────
  {
    key: 'borrador-escrito',
    name: 'Borrador de escrito legal',
    description: 'Genera el borrador de un escrito a partir de los hechos, con la normativa aplicable incorporada.',
    icon: '✍️',
    category: 'Redacción',
    inputLabel: 'Tipo de escrito y hechos relevantes',
    inputPlaceholder: 'Demanda laboral por despido intempestivo. El trabajador laboró 3 años, fue despedido sin causa el 1 de abril...',
    steps: [
      {
        id: 'normativa',
        name: 'Localizar normativa aplicable',
        type: 'rag_search',
        queryTemplate: '{{input}}',
        ragLimit: 10,
      },
      {
        id: 'estructura',
        name: 'Definir estructura del escrito',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 900,
        promptTemplate:
          'A partir de estos hechos:\n{{input}}\n\n' +
          'Definí en una lista breve la estructura formal que debe tener el escrito ' +
          '(secciones y orden), según la práctica procesal ecuatoriana.',
      },
      {
        id: 'borrador',
        name: 'Redactar el borrador completo',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 2800,
        promptTemplate:
          'NORMATIVA APLICABLE:\n{{steps.normativa}}\n\n' +
          'ESTRUCTURA A SEGUIR:\n{{steps.estructura}}\n\n' +
          'HECHOS:\n{{input}}\n\n' +
          'Redactá el borrador completo del escrito, formal, fundamentado en la ' +
          'normativa citada. Marcá entre [CORCHETES] los datos que el abogado debe completar.',
      },
    ],
  },

  // ─── 4. Estrategia de caso ──────────────────────────────────────────
  {
    key: 'estrategia-caso',
    name: 'Estrategia de caso',
    description: 'Del relato del caso a una estrategia: puntos clave, normativa, riesgos y plan de acción.',
    icon: '🎯',
    category: 'Litigación',
    inputLabel: 'Descripción del caso',
    inputPlaceholder: 'Cliente arrendador. El inquilino dejó de pagar 5 meses y no desocupa el local comercial...',
    steps: [
      {
        id: 'puntos',
        name: 'Identificar puntos jurídicos clave',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 900,
        promptTemplate:
          'CASO:\n{{input}}\n\n' +
          'Identificá los puntos jurídicos clave del caso: pretensiones posibles, ' +
          'materia, y las preguntas de derecho que hay que resolver. Sé conciso.',
      },
      {
        id: 'normativa',
        name: 'Buscar normativa y precedentes',
        type: 'rag_search',
        queryTemplate: '{{steps.puntos}}',
        ragLimit: 12,
      },
      {
        id: 'estrategia',
        name: 'Construir la estrategia',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 2400,
        promptTemplate:
          'CASO:\n{{input}}\n\n' +
          'PUNTOS CLAVE:\n{{steps.puntos}}\n\n' +
          'NORMATIVA APLICABLE:\n{{steps.normativa}}\n\n' +
          'Construí la estrategia del caso con estas secciones: ' +
          '(1) Teoría del caso, (2) Vía procesal recomendada, (3) Fundamento normativo, ' +
          '(4) Riesgos y debilidades, (5) Plan de acción con pasos concretos.',
      },
    ],
  },

  // ─── 5. Dictamen / opinión legal ────────────────────────────────────
  {
    key: 'dictamen',
    name: 'Dictamen legal',
    description: 'Una opinión legal formal sobre una situación concreta, fundamentada y con conclusión clara.',
    icon: '🧾',
    category: 'Redacción',
    inputLabel: 'Situación sobre la que se requiere el dictamen',
    inputPlaceholder: '¿Puede una sociedad anónima distribuir dividendos anticipados antes del cierre del ejercicio?',
    steps: [
      {
        id: 'busqueda',
        name: 'Recuperar marco normativo',
        type: 'rag_search',
        queryTemplate: '{{input}}',
        ragLimit: 10,
      },
      {
        id: 'dictamen',
        name: 'Emitir el dictamen',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 2200,
        promptTemplate:
          'MARCO NORMATIVO:\n{{steps.busqueda}}\n\n' +
          'CONSULTA:\n{{input}}\n\n' +
          'Emití un dictamen legal formal con: (1) Antecedentes, (2) Marco normativo aplicable, ' +
          '(3) Análisis jurídico, (4) Conclusión expresa y fundamentada. ' +
          'Tono formal de dictamen profesional.',
      },
    ],
  },

  // ─── 6. Revisión de contrato ────────────────────────────────────────
  {
    key: 'revision-contrato',
    name: 'Revisión de contrato',
    description: 'Analiza un contrato e identifica riesgos, cláusulas faltantes y recomendaciones.',
    icon: '📑',
    category: 'Contractual',
    inputLabel: 'Texto o descripción del contrato',
    inputPlaceholder: 'Pegá el contrato o describí sus cláusulas principales, las partes y el objeto…',
    steps: [
      {
        id: 'normativa',
        name: 'Buscar marco normativo aplicable',
        type: 'rag_search',
        queryTemplate: '{{input}}',
        ragLimit: 10,
      },
      {
        id: 'revision',
        name: 'Revisar el contrato',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 2400,
        promptTemplate:
          'MARCO NORMATIVO:\n{{steps.normativa}}\n\n' +
          'CONTRATO A REVISAR:\n{{input}}\n\n' +
          'Revisá el contrato y entregá: (1) Riesgos jurídicos detectados, ' +
          '(2) Cláusulas faltantes o débiles, (3) Ambigüedades a precisar, ' +
          '(4) Conformidad con la normativa aplicable, (5) Recomendaciones concretas de redacción.',
      },
    ],
  },

  // ─── 7. Liquidación laboral explicada ───────────────────────────────
  {
    key: 'liquidacion-laboral',
    name: 'Liquidación laboral explicada',
    description: 'A partir de los datos de la relación laboral, detalla y fundamenta cada rubro de la liquidación.',
    icon: '🧮',
    category: 'Laboral',
    inputLabel: 'Datos de la relación laboral',
    inputPlaceholder: 'Tiempo de servicio, última remuneración, motivo y fecha de terminación, beneficios pendientes…',
    steps: [
      {
        id: 'normativa',
        name: 'Localizar normativa laboral aplicable',
        type: 'rag_search',
        queryTemplate: 'liquidación laboral indemnización {{input}}',
        ragLimit: 10,
      },
      {
        id: 'liquidacion',
        name: 'Detallar la liquidación',
        type: 'llm_generate',
        systemPrompt: RAG_SYSTEM,
        maxTokens: 2200,
        promptTemplate:
          'NORMATIVA APLICABLE:\n{{steps.normativa}}\n\n' +
          'DATOS DE LA RELACIÓN LABORAL:\n{{input}}\n\n' +
          'Detallá la liquidación: (1) Enumerá cada rubro que corresponde, ' +
          '(2) Explicá el fundamento normativo de cada uno, (3) Indicá la fórmula o ' +
          'base de cálculo, (4) Señalá los datos que faltan para el monto final entre ' +
          '[CORCHETES]. No inventés cifras: el cálculo final lo confirma el abogado.',
      },
    ],
  },
];

export function getTemplateByKey(key: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.key === key);
}
