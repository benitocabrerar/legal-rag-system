/**
 * Agente de Trámites — catálogo del sistema (v1).
 *
 * Seis trámites tipo del foro ecuatoriano. El prompt interpola:
 *   {{<field.key>}}  → el valor que cargó el abogado
 *   {{rag}}          → contexto normativo del corpus (si useRag)
 *
 * Ampliar el catálogo es solo agregar objetos — el generador no cambia.
 */
import type { TramiteType } from './types.js';

const SYS_JUDICIAL = `Sos un abogado litigante experto en derecho procesal ecuatoriano.
Redactás escritos formales, técnicamente correctos, con la estructura del foro
ecuatoriano (encabezado dirigido a la autoridad, identificación del proceso,
fundamentos de hecho y de derecho, prueba y petición concreta). Citás las normas
aplicables por su nombre y artículo. Nunca inventás números de proceso, fechas ni
artículos: cualquier dato faltante lo marcás entre [CORCHETES] para que el abogado
lo complete.`;

const SYS_SOCIETARIO = `Sos un abogado corporativo experto en derecho societario
ecuatoriano. Redactás documentos societarios formales conforme a la Ley de
Compañías. Marcás entre [CORCHETES] los datos que falten. No inventás datos.`;

export const TRAMITE_CATALOG: TramiteType[] = [
  // ─── 1. Contestación a la demanda ───────────────────────────────────
  {
    key: 'contestacion-demanda',
    name: 'Contestación a la demanda',
    description: 'Escrito de contestación con excepciones, fundamentos de derecho y anuncio de prueba.',
    icon: '⚖️',
    category: 'Judicial',
    useRag: true,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial Civil con sede en el cantón Quito', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'actor', label: 'Parte actora', placeholder: 'Nombre de quien demanda', required: true },
      { key: 'demandado', label: 'Parte demandada (tu cliente)', placeholder: 'Nombre del cliente', required: true },
      { key: 'hechosDemanda', label: 'Resumen de la demanda', placeholder: 'Qué pretende el actor y en qué hechos se funda', required: true, multiline: true },
      { key: 'posicionCliente', label: 'Posición del cliente', placeholder: 'Hechos y argumentos de la defensa', required: true, multiline: true },
      { key: 'pretensionDefensa', label: 'Pretensión de la defensa', placeholder: 'Qué se solicita al juzgador (rechazo de la demanda, etc.)', required: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá una CONTESTACIÓN A LA DEMANDA para presentar ante {{tribunal}}, ' +
      'dentro del proceso Nº {{numeroProceso}}.\n' +
      'Parte actora: {{actor}}. Parte demandada (cliente): {{demandado}}.\n\n' +
      'RESUMEN DE LA DEMANDA:\n{{hechosDemanda}}\n\n' +
      'POSICIÓN DEL CLIENTE:\n{{posicionCliente}}\n\n' +
      'PRETENSIÓN DE LA DEFENSA: {{pretensionDefensa}}\n' +
      '{{rag}}\n' +
      'El escrito debe incluir: encabezado a la autoridad, identificación del proceso, ' +
      'contestación a los hechos (negando o aceptando cada uno), excepciones previas y ' +
      'de fondo que correspondan, fundamentos de derecho con las normas citadas, anuncio ' +
      'de la prueba de la defensa y petición concreta. Tono formal del foro.',
  },

  // ─── 2. Anuncio de prueba ───────────────────────────────────────────
  {
    key: 'anuncio-prueba',
    name: 'Escrito de anuncio de prueba',
    description: 'Anuncio y solicitud de práctica de prueba dentro de un proceso en trámite.',
    icon: '📋',
    category: 'Judicial',
    useRag: true,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial competente', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'compareciente', label: 'Quien comparece', placeholder: 'Nombre de la parte', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte actora / demandada', required: true },
      { key: 'pruebas', label: 'Pruebas a anunciar', placeholder: 'Detalle de documentos, testigos, peritajes, etc.', required: true, multiline: true },
      { key: 'finalidad', label: 'Finalidad de la prueba', placeholder: 'Qué se busca acreditar con la prueba', required: true, multiline: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá un ESCRITO DE ANUNCIO DE PRUEBA para presentar ante {{tribunal}}, ' +
      'dentro del proceso Nº {{numeroProceso}}.\n' +
      'Comparece: {{compareciente}}, en calidad de {{calidad}}.\n\n' +
      'PRUEBAS A ANUNCIAR:\n{{pruebas}}\n\n' +
      'FINALIDAD:\n{{finalidad}}\n' +
      '{{rag}}\n' +
      'El escrito debe anunciar cada medio de prueba de forma individualizada, indicar la ' +
      'pertinencia y conducencia de cada uno respecto de los hechos controvertidos, y ' +
      'solicitar su práctica. Tono formal del foro.',
  },

  // ─── 3. Solicitud de copias certificadas ────────────────────────────
  {
    key: 'solicitud-copias',
    name: 'Solicitud de copias certificadas',
    description: 'Petición de copias certificadas de piezas procesales.',
    icon: '🗂️',
    category: 'Judicial',
    useRag: false,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial competente', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'solicitante', label: 'Solicitante', placeholder: 'Nombre de quien solicita', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte procesal / abogado defensor', required: true },
      { key: 'piezas', label: 'Piezas solicitadas', placeholder: 'Qué fojas o actuaciones se requieren en copia', required: true, multiline: true },
      { key: 'proposito', label: 'Propósito', placeholder: 'Para qué se requieren las copias', required: false },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá una SOLICITUD DE COPIAS CERTIFICADAS para presentar ante {{tribunal}}, ' +
      'dentro del proceso Nº {{numeroProceso}}.\n' +
      'Solicitante: {{solicitante}}, en calidad de {{calidad}}.\n\n' +
      'PIEZAS SOLICITADAS:\n{{piezas}}\n\n' +
      'PROPÓSITO: {{proposito}}\n\n' +
      'El escrito debe ser breve y formal: encabezado, identificación del proceso, ' +
      'petición precisa de las copias certificadas indicadas, y solicitud de que se ' +
      'disponga su entrega. Tono formal del foro.',
  },

  // ─── 4. Señalamiento de domicilio judicial ──────────────────────────
  {
    key: 'senalamiento-domicilio',
    name: 'Señalamiento de domicilio judicial',
    description: 'Escrito de señalamiento de casilla judicial y domicilio electrónico.',
    icon: '📮',
    category: 'Judicial',
    useRag: false,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial competente', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'compareciente', label: 'Quien comparece', placeholder: 'Nombre de la parte', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte actora / demandada', required: true },
      { key: 'casillaJudicial', label: 'Casilla judicial', placeholder: 'Nº de casilla judicial', required: false },
      { key: 'correoElectronico', label: 'Domicilio electrónico', placeholder: 'correo@ejemplo.com', required: true },
      { key: 'abogadoDefensor', label: 'Abogado defensor', placeholder: 'Nombre y matrícula del abogado', required: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá un ESCRITO DE SEÑALAMIENTO DE DOMICILIO JUDICIAL para presentar ante ' +
      '{{tribunal}}, dentro del proceso Nº {{numeroProceso}}.\n' +
      'Comparece: {{compareciente}}, en calidad de {{calidad}}.\n' +
      'Casilla judicial: {{casillaJudicial}}. Domicilio electrónico: {{correoElectronico}}.\n' +
      'Abogado defensor: {{abogadoDefensor}}.\n\n' +
      'El escrito debe señalar el domicilio judicial y electrónico para futuras ' +
      'notificaciones, y autorizar al abogado defensor para la defensa técnica. ' +
      'Breve y formal, con el tono del foro.',
  },

  // ─── 5. Convocatoria a junta general ────────────────────────────────
  {
    key: 'convocatoria-junta',
    name: 'Convocatoria a junta general',
    description: 'Convocatoria a junta general de socios o accionistas conforme a la Ley de Compañías.',
    icon: '🏛️',
    category: 'Societario',
    useRag: true,
    fields: [
      { key: 'companiaNombre', label: 'Nombre de la compañía', placeholder: 'Razón social completa', required: true },
      { key: 'tipoCompania', label: 'Tipo de compañía', placeholder: 'anónima / responsabilidad limitada', required: true },
      { key: 'tipoJunta', label: 'Tipo de junta', placeholder: 'ordinaria / extraordinaria', required: true },
      { key: 'fecha', label: 'Fecha de la junta', placeholder: 'DD de mes de AAAA', required: true },
      { key: 'hora', label: 'Hora', placeholder: '10h00', required: true },
      { key: 'lugar', label: 'Lugar / modalidad', placeholder: 'Domicilio social o plataforma telemática', required: true },
      { key: 'ordenDelDia', label: 'Orden del día', placeholder: 'Puntos a tratar, uno por línea', required: true, multiline: true },
      { key: 'convocante', label: 'Quien convoca', placeholder: 'Representante legal / órgano que convoca', required: true },
    ],
    systemPrompt: SYS_SOCIETARIO,
    promptTemplate:
      'Redactá una CONVOCATORIA A JUNTA GENERAL {{tipoJunta}} de la compañía ' +
      '{{companiaNombre}} (compañía {{tipoCompania}}).\n' +
      'Fecha: {{fecha}} · Hora: {{hora}} · Lugar/modalidad: {{lugar}}.\n' +
      'Convoca: {{convocante}}.\n\n' +
      'ORDEN DEL DÍA:\n{{ordenDelDia}}\n' +
      '{{rag}}\n' +
      'La convocatoria debe cumplir los requisitos de la Ley de Compañías: identificación ' +
      'de la compañía, tipo de junta, fecha, hora y lugar, orden del día detallado, e ' +
      'indicación de quién convoca. Marcá entre [CORCHETES] el plazo de antelación y el ' +
      'medio de publicación si no constan. Tono formal societario.',
  },

  // ─── 6. Escrito de desistimiento ────────────────────────────────────
  {
    key: 'desistimiento',
    name: 'Escrito de desistimiento',
    description: 'Desistimiento de la acción, del recurso o del trámite, con sus fundamentos.',
    icon: '✋',
    category: 'Judicial',
    useRag: true,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial competente', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'compareciente', label: 'Quien comparece', placeholder: 'Nombre de la parte', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte actora / recurrente', required: true },
      { key: 'alcanceDesistimiento', label: 'Alcance del desistimiento', placeholder: 'de la acción / del recurso / del trámite', required: true },
      { key: 'motivo', label: 'Motivo', placeholder: 'Razón del desistimiento (acuerdo, transacción, etc.)', required: false, multiline: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá un ESCRITO DE DESISTIMIENTO para presentar ante {{tribunal}}, dentro del ' +
      'proceso Nº {{numeroProceso}}.\n' +
      'Comparece: {{compareciente}}, en calidad de {{calidad}}.\n' +
      'Alcance del desistimiento: {{alcanceDesistimiento}}.\n' +
      'Motivo: {{motivo}}\n' +
      '{{rag}}\n' +
      'El escrito debe expresar de forma clara e inequívoca la voluntad de desistir, ' +
      'precisar su alcance, fundamentar la procedencia conforme a la normativa procesal ' +
      'aplicable y solicitar que se acepte el desistimiento. Tono formal del foro.',
  },

  // ─── 7. Recurso de apelación ────────────────────────────────────────
  {
    key: 'recurso-apelacion',
    name: 'Recurso de apelación',
    description: 'Interposición y fundamentación de recurso de apelación contra una resolución.',
    icon: '⬆️',
    category: 'Judicial',
    useRag: true,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial que dictó la resolución', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'recurrente', label: 'Parte recurrente', placeholder: 'Nombre de quien apela', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte actora / demandada', required: true },
      { key: 'resolucionImpugnada', label: 'Resolución impugnada', placeholder: 'Sentencia / auto y su fecha', required: true },
      { key: 'agravios', label: 'Agravios', placeholder: 'Por qué la resolución causa agravio: errores de hecho y de derecho', required: true, multiline: true },
      { key: 'pretensionRecurso', label: 'Pretensión del recurso', placeholder: 'Qué se solicita al superior (revocar, reformar, etc.)', required: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá un RECURSO DE APELACIÓN para presentar ante {{tribunal}}, dentro del ' +
      'proceso Nº {{numeroProceso}}.\n' +
      'Recurrente: {{recurrente}}, en calidad de {{calidad}}.\n' +
      'Resolución impugnada: {{resolucionImpugnada}}.\n\n' +
      'AGRAVIOS:\n{{agravios}}\n\n' +
      'PRETENSIÓN DEL RECURSO: {{pretensionRecurso}}\n' +
      '{{rag}}\n' +
      'El escrito debe interponer el recurso en plazo, identificar la resolución ' +
      'impugnada, fundamentar punto por punto los agravios (errores de hecho y de ' +
      'derecho), citar la normativa procesal aplicable y formular la petición concreta ' +
      'al órgano superior. Tono formal del foro.',
  },

  // ─── 8. Solicitud de señalamiento de audiencia ──────────────────────
  {
    key: 'solicitud-audiencia',
    name: 'Solicitud de audiencia',
    description: 'Petición de señalamiento de día y hora para una audiencia.',
    icon: '📅',
    category: 'Judicial',
    useRag: false,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial competente', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'compareciente', label: 'Quien comparece', placeholder: 'Nombre de la parte', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte actora / demandada', required: true },
      { key: 'tipoAudiencia', label: 'Tipo de audiencia', placeholder: 'preliminar / de juicio / única', required: true },
      { key: 'motivo', label: 'Motivo de la solicitud', placeholder: 'Por qué corresponde señalar la audiencia', required: false, multiline: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá una SOLICITUD DE SEÑALAMIENTO DE AUDIENCIA para presentar ante ' +
      '{{tribunal}}, dentro del proceso Nº {{numeroProceso}}.\n' +
      'Comparece: {{compareciente}}, en calidad de {{calidad}}.\n' +
      'Tipo de audiencia: {{tipoAudiencia}}.\n' +
      'Motivo: {{motivo}}\n\n' +
      'El escrito debe ser breve y formal: encabezado, identificación del proceso, ' +
      'solicitud de que se señale día y hora para la audiencia indicada, y la ' +
      'justificación de su procedencia. Tono formal del foro.',
  },

  // ─── 9. Solicitud de oficio (prueba) ────────────────────────────────
  {
    key: 'oficio-prueba',
    name: 'Solicitud de oficio',
    description: 'Petición de que se oficie a una entidad para requerir información o documentación como prueba.',
    icon: '✉️',
    category: 'Judicial',
    useRag: false,
    fields: [
      { key: 'tribunal', label: 'Judicatura / Tribunal', placeholder: 'Unidad Judicial competente', required: true },
      { key: 'numeroProceso', label: 'Número de proceso', placeholder: '17230-2026-01234', required: true },
      { key: 'compareciente', label: 'Quien comparece', placeholder: 'Nombre de la parte', required: true },
      { key: 'calidad', label: 'En calidad de', placeholder: 'parte actora / demandada', required: true },
      { key: 'entidadDestino', label: 'Entidad destinataria', placeholder: 'Institución a la que se debe oficiar', required: true },
      { key: 'informacionRequerida', label: 'Información requerida', placeholder: 'Qué documentación o información se solicita', required: true, multiline: true },
      { key: 'finalidad', label: 'Finalidad probatoria', placeholder: 'Qué se busca acreditar con esa información', required: true },
    ],
    systemPrompt: SYS_JUDICIAL,
    promptTemplate:
      'Redactá una SOLICITUD DE OFICIO para presentar ante {{tribunal}}, dentro del ' +
      'proceso Nº {{numeroProceso}}.\n' +
      'Comparece: {{compareciente}}, en calidad de {{calidad}}.\n' +
      'Entidad a oficiar: {{entidadDestino}}.\n\n' +
      'INFORMACIÓN REQUERIDA:\n{{informacionRequerida}}\n\n' +
      'FINALIDAD PROBATORIA: {{finalidad}}\n\n' +
      'El escrito debe solicitar que se oficie a la entidad indicada para que remita ' +
      'la información o documentación detallada, fundamentar su pertinencia y ' +
      'conducencia como prueba, y precisar la finalidad probatoria. Tono formal del foro.',
  },
];

export function getTramiteType(key: string): TramiteType | undefined {
  return TRAMITE_CATALOG.find((t) => t.key === key);
}
