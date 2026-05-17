/**
 * Base de conocimiento del producto — qué es Poweria Legal y qué puede hacer
 * cada módulo de la aplicación.
 *
 * Es la ÚNICA fuente de verdad sobre los features de la app que consume el
 * asistente (bot de Telegram, comando /funciones, etc.). Cuando se agregue o
 * cambie un módulo, se actualiza acá y el asistente lo sabe sin más cambios.
 *
 * Mantener conciso: este texto se inyecta en el system prompt del bot, así
 * que cada línea cuesta tokens. Describir capacidades, no implementación.
 */

/** Texto largo — catálogo de features para inyectar en el system prompt. */
export const POWERIA_FEATURES_KB = `POWERIA LEGAL — QUÉ ES Y QUÉ HACE

Poweria Legal es una plataforma de IA jurídica creada por COGNITEX (Ecuador)
para abogados y estudios jurídicos de LATAM. Reúne en una sola interfaz la
gestión de casos, la litigación asistida por IA, la productividad del estudio
y un corpus jurídico ecuatoriano vectorizado.

═══ EXPEDIENTE DEL CASO ═══
• Crear casos con metadatos jurídicos (materia, tribunal, jurisdicción, juez,
  contraparte, cuantía, etapa procesal, fechas) más partes y finanzas del caso.
• Subir documentos al expediente: PDF, DOCX, XLSX, CSV e imágenes. Se les
  extrae el texto (OCR Vision en escaneos), se vectorizan y quedan indexados.
• Cada documento tiene un "kind": uploaded (lo que sube el abogado),
  ai_generated (borrador de IA), ai_analysis (dictamen de IA) y court_filed
  (presentado oficialmente — la IA le da máxima prioridad). Un documento se
  marca como presentado con el ícono ⚖️ indicando juzgado y fecha.
• Al subir un documento, la IA produce automáticamente un análisis: qué aporta
  al caso, acciones urgentes, plan de trabajo, tareas a crear, riesgos y normas.

═══ LITIGACIÓN E IA DEL CASO ═══
• Asistente IA del caso: chat con todo el expediente pre-cargado; cita
  artículos exactos y nunca inventa jurisprudencia.
• Prompts Especializados: 8 categorías (Análisis, Redacción, Estrategia, etc.)
  con un botón "IA avanzado" que genera prompts profundos para el caso real.
• Referencias Legales: cada norma pertinente abre un Análisis profundo
  (texto literal del artículo + jurisprudencia + estrategia) usando RAG.
• Fundamentación Jurídica Avanzada: lista los análisis IA guardados que forman
  el "cerebro" del caso. La Sala de Razonamiento Jurídico deja al abogado
  debatir su tesis con la IA en 4 modos (Tesis del Caso, Razonamiento del
  Abogado, Mesa de Estrategia, Deliberación Jurídica) y guardar el resultado.
• Sala de Litigación: modo pantalla completa para la audiencia — cronómetro,
  brief, cronología, tarjetas argumentales generadas por IA (apertura, hechos,
  fundamento, prueba, refutación, réplica, cierre) y chat con el caso.
• Generador de Documentos Legales: 12 tipos (demanda, contestación, apelación,
  casación, alegato, contrato, transaccional, informe, carta, notificación,
  poder, escrito general). Verifica los datos faltantes, los autocompleta
  desde el expediente, redacta en streaming y exporta un .docx forense.

═══ PRODUCTIVIDAD DEL ESTUDIO ═══
• Calendario: vistas mes/semana/día/agenda con drag-and-drop. La convocatoria
  se autocompleta subiendo el PDF de la providencia (fecha, hora, link de
  Zoom/Teams/Meet, código, juzgado).
• Tareas: tablero Kanban con subtareas sugeridas por IA, plantillas legales y
  panel de carga de trabajo (workload insights).
• Finanzas: CFO virtual con aging de cobranza, forecast a 4 semanas, top
  clientes y "Facturar desde tareas" que genera la factura y el PDF.

═══ MÓDULOS AVANZADOS (menú "Más") ═══
• Workflow Studio: flujos de trabajo jurídicos que encadenan búsqueda en el
  corpus y generación con IA, con progreso en vivo y verificación de las
  fuentes citadas contra el corpus.
• Agente de Trámites: autocompleta escritos tipo del foro ecuatoriano a partir
  de campos estructurados. El borrador nace como "borrador" y exige revisión
  del abogado antes de aprobarlo.
• Analíticas de ROI: traduce la actividad asistida por IA en tiempo ahorrado y,
  con la tarifa horaria del abogado, en dinero.
• Traductor Jurídico: traduce texto legal español ⇄ inglés preservando el
  sentido jurídico, con glosario de términos.
• Agente de Formularios de Inmigración: arma paquetes de formularios USCIS
  (I-130, I-485, N-400, etc.) — borrador, lista de documentos y guía de
  presentación. Exige revisión de un abogado de inmigración con licencia.

═══ CORPUS Y BÚSQUEDA ═══
• Buscador jurídico: encuentra normas y artículos del corpus ecuatoriano
  (cientos de leyes y códigos vectorizados). Desde la búsqueda avanzada se
  puede "Agregar a mi caso" una norma: se descarga su PDF, se vectoriza y se
  adjunta al expediente.
• El corpus se sincroniza con fuentes oficiales (Registro Oficial, Asamblea).

═══ CUENTA, PLATAFORMA E INTEGRACIONES ═══
• Telegram: vinculá tu cuenta en Configuración → Telegram para recibir avisos
  (normas nuevas, casos, agenda, tareas) y consultar al asistente jurídico
  desde el chat.
• La app es una PWA instalable en móvil y escritorio, funciona parcialmente
  offline.
• Paleta de comandos Cmd+K (Ctrl+K) para crear, navegar y ejecutar acciones.
• Centro de ayuda en /help y tours guiados por pantalla.
• Planes: Gratis, Starter, Pro, Pro Max, Studio e Institucional — cada uno con
  más casos, más consultas IA y más módulos.
• Panel de administración (solo para administradores de COGNITEX): usuarios,
  planes y precios, especialidades legales, corpus, embeddings, auditoría.

REGLA: la IA de Poweria Legal cita normas exactas, marca "[CITA POR VERIFICAR]"
cuando no está segura, y nunca reemplaza el criterio del abogado.`;

/** Lista corta de módulos — para el comando /funciones del bot. */
export const POWERIA_MODULES_SHORT: Array<{ emoji: string; name: string; desc: string }> = [
  { emoji: '📁', name: 'Casos y expediente', desc: 'documentos con OCR, IA y análisis automático al subir' },
  { emoji: '🤖', name: 'Asistente IA del caso', desc: 'chat con el expediente pre-cargado' },
  { emoji: '⚖️', name: 'Sala de Litigación', desc: 'tarjetas argumentales y cronómetro para la audiencia' },
  { emoji: '🧠', name: 'Sala de Razonamiento', desc: 'debatí tu tesis con la IA en 4 modos' },
  { emoji: '📑', name: 'Generador de Documentos', desc: '12 tipos de escritos, .docx forense' },
  { emoji: '🗓️', name: 'Calendario', desc: 'convocatoria auto-extraída de la providencia' },
  { emoji: '✅', name: 'Tareas', desc: 'Kanban con subtareas y plantillas legales por IA' },
  { emoji: '💼', name: 'Finanzas', desc: 'CFO virtual, cobranza y facturar desde tareas' },
  { emoji: '⚙️', name: 'Workflow Studio', desc: 'flujos jurídicos encadenados con verificación' },
  { emoji: '📄', name: 'Agente de Trámites', desc: 'escritos tipo del foro ecuatoriano' },
  { emoji: '📈', name: 'Analíticas de ROI', desc: 'tu tiempo ahorrado, en horas y en dinero' },
  { emoji: '🌐', name: 'Traductor Jurídico', desc: 'legal español ⇄ inglés con glosario' },
  { emoji: '🛂', name: 'Formularios de Inmigración', desc: 'paquetes USCIS (I-130, I-485, N-400…)' },
  { emoji: '🔎', name: 'Buscador jurídico', desc: 'corpus ecuatoriano + "Agregar a mi caso"' },
];
