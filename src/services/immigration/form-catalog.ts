/**
 * Agente de Formularios de Inmigración — catálogo del sistema (v1).
 *
 * Trece formularios oficiales de USCIS, agrupados por vía: familia,
 * empleo, humanitario y ciudadanía/residencia. El generador es único:
 * arma el paquete a partir de `formOutline` + los campos de admisión.
 * Ampliar el catálogo es solo agregar objetos.
 *
 * Las tasas son REFERENCIALES — USCIS las actualiza periódicamente; el
 * agente siempre recuerda verificar la tasa vigente en uscis.gov.
 */
import type { ImmigrationForm, ImmigrationField } from './types.js';

// ─── CAMPOS REUTILIZABLES ──────────────────────────────────────────────────
const F = {
  petitioner: {
    key: 'petitioner', label: 'Peticionario / solicitante',
    placeholder: 'Nombre completo de quien presenta el formulario', required: true,
  } as ImmigrationField,
  petitionerStatus: {
    key: 'petitionerStatus', label: 'Estatus migratorio del peticionario',
    placeholder: 'Ciudadano de EE.UU. / residente permanente legal', required: true,
  } as ImmigrationField,
  beneficiary: {
    key: 'beneficiary', label: 'Beneficiario / familiar',
    placeholder: 'Nombre completo del familiar extranjero', required: true,
  } as ImmigrationField,
  relationship: {
    key: 'relationship', label: 'Vínculo familiar',
    placeholder: 'cónyuge / hijo(a) / padre-madre / hermano(a)', required: true,
  } as ImmigrationField,
  birth: {
    key: 'birth', label: 'Nacimiento del cliente',
    placeholder: 'Fecha y país de nacimiento', required: true,
  } as ImmigrationField,
  immigrationHistory: {
    key: 'immigrationHistory', label: 'Historial migratorio en EE.UU.',
    placeholder: 'Última entrada, estatus actual, A-Number si lo tiene, procesos previos',
    required: true, multiline: true,
  } as ImmigrationField,
  addresses: {
    key: 'addresses', label: 'Domicilios de los últimos 5 años',
    placeholder: 'Direcciones con fechas (de / a)', required: false, multiline: true,
  } as ImmigrationField,
};

export const IMMIGRATION_FORM_CATALOG: ImmigrationForm[] = [
  // ═══ FAMILIA ══════════════════════════════════════════════════════════
  {
    key: 'i-130',
    formCode: 'I-130',
    name: 'Petición de Familiar Extranjero',
    nameEn: 'Petition for Alien Relative',
    category: 'Familia',
    description:
      'El ciudadano o residente permanente de EE.UU. establece el vínculo familiar con un pariente extranjero para iniciar su proceso de residencia.',
    feeNote: 'Tasa USCIS de referencia: USD 675 (papel). Verificar la tasa vigente en uscis.gov.',
    useRag: true,
    formOutline:
      'Partes del I-130: Parte 1 (tipo de relación), Parte 2 (información del peticionario), ' +
      'Parte 4 (información del beneficiario), Parte 5 (otra información — peticiones previas), ' +
      'Parte 7 (declaración, contacto y firma del peticionario).',
    fields: [
      F.petitioner, F.petitionerStatus, F.beneficiary, F.relationship,
      { key: 'beneficiaryBirth', label: 'Nacimiento del beneficiario', placeholder: 'Fecha y país de nacimiento', required: true },
      F.immigrationHistory,
      { key: 'priorPetitions', label: 'Peticiones familiares previas', placeholder: '¿El peticionario presentó antes otra I-130? ¿Para quién y cuándo?', required: false, multiline: true },
    ],
  },
  {
    key: 'i-130a',
    formCode: 'I-130A',
    name: 'Información Suplementaria del Cónyuge Beneficiario',
    nameEn: 'Supplemental Information for Spouse Beneficiary',
    category: 'Familia',
    description:
      'Acompaña a la I-130 cuando el familiar es el cónyuge. Recoge el historial de domicilios y empleo del cónyuge beneficiario.',
    feeNote: 'Sin tasa propia: se presenta junto con la I-130.',
    useRag: false,
    formOutline:
      'Partes del I-130A: Parte 1 (información del cónyuge beneficiario), Parte 2 (domicilios ' +
      'de los últimos 5 años), Parte 3 (historial de empleo de los últimos 5 años), ' +
      'Parte 4 (firma del cónyuge beneficiario).',
    fields: [
      { key: 'spouse', label: 'Cónyuge beneficiario', placeholder: 'Nombre completo del cónyuge extranjero', required: true },
      F.birth,
      F.addresses,
      { key: 'employment', label: 'Historial de empleo (5 años)', placeholder: 'Empleadores, cargos y fechas', required: false, multiline: true },
      { key: 'abroadAddress', label: 'Domicilio fuera de EE.UU.', placeholder: 'Dirección en el extranjero, si corresponde', required: false },
    ],
  },
  {
    key: 'i-485',
    formCode: 'I-485',
    name: 'Solicitud de Ajuste de Estatus',
    nameEn: 'Application to Register Permanent Residence or Adjust Status',
    category: 'Familia',
    description:
      'El extranjero que está en EE.UU. solicita la residencia permanente (green card) sin salir del país.',
    feeNote: 'Tasa USCIS de referencia: USD 1.440 (incluye biometría). Verificar en uscis.gov.',
    useRag: true,
    formOutline:
      'Partes del I-485: Parte 1 (información del solicitante), Parte 2 (categoría de ajuste y ' +
      'petición que lo respalda), Parte 3 (información adicional sobre el solicitante e historial ' +
      'de viajes), Partes 8-9 (preguntas de elegibilidad e inadmisibilidad), Parte 14 (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'category', label: 'Categoría de ajuste', placeholder: 'Familiar, empleo, asilo, etc.', required: true },
      { key: 'basis', label: 'Petición que respalda el ajuste', placeholder: 'I-130 aprobada/pendiente, número de recibo si lo tiene', required: true },
      F.immigrationHistory,
      { key: 'inadmissibility', label: 'Posibles causales de inadmisibilidad', placeholder: 'Antecedentes penales, presencia ilegal, entradas previas, fraudes — todo lo relevante', required: true, multiline: true },
    ],
  },
  {
    key: 'i-864',
    formCode: 'I-864',
    name: 'Declaración Jurada de Patrocinio Económico',
    nameEn: 'Affidavit of Support Under Section 213A of the INA',
    category: 'Familia',
    description:
      'El patrocinador se compromete legalmente a mantener económicamente al inmigrante para que no sea carga pública.',
    feeNote: 'Sin tasa de USCIS cuando se presenta con el ajuste.',
    useRag: true,
    formOutline:
      'Partes del I-864: Parte 1 (base para presentar), Parte 2 (información del inmigrante ' +
      'patrocinado), Parte 5 (tamaño del hogar del patrocinador), Parte 6 (ingreso y empleo del ' +
      'patrocinador), Parte 8 (firma del patrocinador).',
    fields: [
      { key: 'sponsor', label: 'Patrocinador', placeholder: 'Nombre del patrocinador (peticionario)', required: true },
      { key: 'sponsoredImmigrant', label: 'Inmigrante patrocinado', placeholder: 'Nombre del cliente patrocinado', required: true },
      { key: 'householdSize', label: 'Tamaño del hogar', placeholder: 'Número de personas que el patrocinador debe contar', required: true },
      { key: 'income', label: 'Ingreso anual del patrocinador', placeholder: 'Ingreso actual y de las últimas declaraciones de impuestos', required: true, multiline: true },
      { key: 'jointSponsor', label: 'Patrocinador conjunto', placeholder: '¿Se necesita un patrocinador conjunto? Datos si los hay', required: false },
    ],
  },

  // ═══ EMPLEO Y AUTORIZACIÓN ════════════════════════════════════════════
  {
    key: 'i-765',
    formCode: 'I-765',
    name: 'Solicitud de Autorización de Empleo',
    nameEn: 'Application for Employment Authorization',
    category: 'Empleo y autorización',
    description:
      'Solicita el documento de autorización de empleo (EAD) que permite al extranjero trabajar legalmente en EE.UU.',
    feeNote: 'Tasa USCIS de referencia: USD 520 (papel) — varía según la categoría; algunas son sin tasa.',
    useRag: true,
    formOutline:
      'Partes del I-765: Parte 1 (motivo de la solicitud — inicial, renovación o reemplazo), ' +
      'Parte 2 (información del solicitante), Parte 2 ítem 27 (categoría de elegibilidad — código ' +
      'tipo (c)(9), (c)(8), (a)(5)…), Parte 6 (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'reason', label: 'Motivo de la solicitud', placeholder: 'Permiso inicial / renovación / reemplazo', required: true },
      { key: 'eligibilityCategory', label: 'Categoría de elegibilidad', placeholder: 'Base del EAD: ajuste pendiente, asilo, DACA, TPS, etc.', required: true },
      F.immigrationHistory,
    ],
  },
  {
    key: 'i-131',
    formCode: 'I-131',
    name: 'Solicitud de Documento de Viaje',
    nameEn: 'Application for Travel Document',
    category: 'Empleo y autorización',
    description:
      'Solicita permiso adelantado de reingreso (advance parole), permiso de reingreso o documento de viaje de refugiado.',
    feeNote: 'Tasa USCIS de referencia: USD 630 — puede no aplicar si se presenta con un I-485 con tasa.',
    useRag: true,
    formOutline:
      'Partes del I-131: Parte 1 (información del solicitante), Parte 2 (tipo de solicitud — ' +
      'advance parole, permiso de reingreso, documento de refugiado), Parte 7 (información del ' +
      'viaje previsto), Parte 8 (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'documentType', label: 'Tipo de documento', placeholder: 'Advance parole / permiso de reingreso / documento de refugiado', required: true },
      { key: 'travelPurpose', label: 'Motivo y plan del viaje', placeholder: 'Adónde, por qué y por cuánto tiempo viaja el cliente', required: true, multiline: true },
      { key: 'pendingBasis', label: 'Caso pendiente que lo respalda', placeholder: 'I-485 pendiente, número de recibo, etc.', required: false },
    ],
  },
  {
    key: 'i-140',
    formCode: 'I-140',
    name: 'Petición de Trabajador Inmigrante',
    nameEn: 'Immigrant Petition for Alien Worker',
    category: 'Empleo y autorización',
    description:
      'El empleador (o el propio trabajador en ciertas categorías) solicita la clasificación como inmigrante por motivos de empleo.',
    feeNote: 'Tasa USCIS de referencia: USD 715 + posible Asylum Program Fee según el empleador.',
    useRag: true,
    formOutline:
      'Partes del I-140: Parte 1 (información del peticionario/empleador), Parte 2 (categoría de ' +
      'petición — EB-1, EB-2, EB-3…), Parte 3 (información del beneficiario), Parte 5 (información ' +
      'adicional del empleo ofrecido), Parte 6 (firma).',
    fields: [
      { key: 'employer', label: 'Empleador peticionario', placeholder: 'Razón social del empleador', required: true },
      F.beneficiary,
      { key: 'preferenceCategory', label: 'Categoría de preferencia', placeholder: 'EB-1, EB-2, EB-3, NIW, etc.', required: true },
      { key: 'jobOffer', label: 'Oferta de empleo', placeholder: 'Cargo, requisitos, salario y certificación laboral (PERM) si aplica', required: true, multiline: true },
      { key: 'beneficiaryCredentials', label: 'Credenciales del beneficiario', placeholder: 'Títulos, experiencia y cómo cumplen los requisitos del puesto', required: true, multiline: true },
    ],
  },

  // ═══ HUMANITARIO ══════════════════════════════════════════════════════
  {
    key: 'i-589',
    formCode: 'I-589',
    name: 'Solicitud de Asilo y Suspensión de Remoción',
    nameEn: 'Application for Asylum and for Withholding of Removal',
    category: 'Humanitario',
    description:
      'El extranjero solicita asilo por temor fundado de persecución por raza, religión, nacionalidad, opinión política o grupo social.',
    feeNote: 'Sin tasa de USCIS. Plazo clave: por regla, dentro de 1 año de la última llegada a EE.UU.',
    useRag: true,
    formOutline:
      'Partes del I-589: Parte A.I (información del solicitante), Parte A.II (cónyuge e hijos), ' +
      'Parte A.III (antecedentes — domicilios, educación, empleo), Parte B (la base del reclamo de ' +
      'asilo — narrativa de la persecución), Parte C (información adicional), Parte D (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'lastArrival', label: 'Última llegada a EE.UU.', placeholder: 'Fecha, lugar y forma de entrada', required: true },
      { key: 'protectedGround', label: 'Motivo protegido', placeholder: 'Raza, religión, nacionalidad, opinión política o grupo social', required: true },
      { key: 'persecutionNarrative', label: 'Relato de la persecución', placeholder: 'Qué ocurrió, quién persigue, por qué, y el temor a regresar — con fechas', required: true, multiline: true },
      { key: 'family', label: 'Cónyuge e hijos', placeholder: 'Familiares incluidos en la solicitud', required: false, multiline: true },
    ],
  },
  {
    key: 'i-918',
    formCode: 'I-918',
    name: 'Petición de Estatus de No Inmigrante U',
    nameEn: 'Petition for U Nonimmigrant Status',
    category: 'Humanitario',
    description:
      'Víctimas de ciertos delitos que cooperaron con las autoridades solicitan la visa U.',
    feeNote: 'Sin tasa de USCIS. Requiere la certificación Suplemento B firmada por una autoridad.',
    useRag: true,
    formOutline:
      'Partes del I-918: Parte 1 (información de la víctima peticionaria), Parte 2 (información ' +
      'adicional — entradas, procesos), Parte 3 (información sobre la actividad delictiva), ' +
      'Parte 6 (firma). Suplemento B: certificación de la autoridad.',
    fields: [
      { key: 'applicant', label: 'Víctima peticionaria', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'crime', label: 'Delito sufrido', placeholder: 'Tipo de delito calificante y cuándo ocurrió', required: true },
      { key: 'cooperation', label: 'Cooperación con las autoridades', placeholder: 'Con qué agencia cooperó y cómo; estado del Suplemento B', required: true, multiline: true },
      { key: 'harm', label: 'Daño sufrido', placeholder: 'Daño físico o mental sustancial sufrido por la víctima', required: true, multiline: true },
    ],
  },
  {
    key: 'i-821d',
    formCode: 'I-821D',
    name: 'Consideración de Acción Diferida (DACA)',
    nameEn: 'Consideration of Deferred Action for Childhood Arrivals',
    category: 'Humanitario',
    description:
      'Solicita o renueva la acción diferida para quienes llegaron de niños a EE.UU. (DACA).',
    feeNote: 'Tasa USCIS de referencia: USD 555 (incluye I-765). Verificar elegibilidad vigente — DACA está sujeta a litigio.',
    useRag: true,
    formOutline:
      'Partes del I-821D: Parte 1 (motivo — solicitud inicial o renovación), Parte 2 (información ' +
      'del solicitante), Parte 3 (información de residencia y llegada), Parte 4 (información de ' +
      'procesos penales y migratorios), Parte 6 (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'requestType', label: 'Tipo de solicitud', placeholder: 'Inicial / renovación', required: true },
      { key: 'arrivalHistory', label: 'Historial de llegada y residencia', placeholder: 'Edad al llegar, residencia continua desde, escolaridad en EE.UU.', required: true, multiline: true },
      { key: 'criminalHistory', label: 'Antecedentes penales', placeholder: 'Cualquier arresto, cargo o condena — todo lo relevante', required: true, multiline: true },
    ],
  },

  // ═══ CIUDADANÍA Y RESIDENCIA ══════════════════════════════════════════
  {
    key: 'n-400',
    formCode: 'N-400',
    name: 'Solicitud de Naturalización',
    nameEn: 'Application for Naturalization',
    category: 'Ciudadanía y residencia',
    description:
      'El residente permanente legal solicita convertirse en ciudadano de EE.UU. por naturalización.',
    feeNote: 'Tasa USCIS de referencia: USD 760 (papel). Verificar exenciones por bajos ingresos.',
    useRag: true,
    formOutline:
      'Partes del N-400: Parte 1 (base de elegibilidad — 5 años, 3 años por matrimonio, militar), ' +
      'Parte 2 (información del solicitante), Parte 5-6 (domicilios y empleo), Parte 9 (tiempo ' +
      'fuera de EE.UU.), Parte 12 (preguntas de buen carácter moral), Parte 15 (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      { key: 'eligibilityBasis', label: 'Base de elegibilidad', placeholder: 'Residente 5 años / 3 años por matrimonio con ciudadano / servicio militar', required: true },
      { key: 'residentSince', label: 'Residente permanente desde', placeholder: 'Fecha en que obtuvo la green card', required: true },
      F.addresses,
      { key: 'tripsAbroad', label: 'Viajes fuera de EE.UU.', placeholder: 'Viajes de los últimos 5 años con fechas y duración', required: true, multiline: true },
      { key: 'goodMoralCharacter', label: 'Cuestiones de buen carácter moral', placeholder: 'Antecedentes penales, impuestos, manutención de hijos — todo lo relevante', required: true, multiline: true },
    ],
  },
  {
    key: 'i-751',
    formCode: 'I-751',
    name: 'Petición para Eliminar Condiciones de Residencia',
    nameEn: 'Petition to Remove Conditions on Residence',
    category: 'Ciudadanía y residencia',
    description:
      'El residente condicional por matrimonio solicita la residencia permanente sin condiciones.',
    feeNote: 'Tasa USCIS de referencia: USD 750 (incluye biometría). Verificar en uscis.gov.',
    useRag: true,
    formOutline:
      'Partes del I-751: Parte 1 (información del residente condicional), Parte 2 (base para la ' +
      'petición — matrimonio conjunto o exención/waiver), Parte 4 (información del cónyuge), ' +
      'Parte 8 (firma).',
    fields: [
      { key: 'applicant', label: 'Residente condicional', placeholder: 'Nombre completo del cliente', required: true },
      { key: 'spouse', label: 'Cónyuge', placeholder: 'Nombre del cónyuge ciudadano o residente', required: true },
      { key: 'filingBasis', label: 'Base de la petición', placeholder: 'Petición conjunta / exención (matrimonio terminó, maltrato, dificultad extrema)', required: true },
      { key: 'marriageEvidence', label: 'Evidencia de la buena fe del matrimonio', placeholder: 'Bienes en común, hijos, finanzas conjuntas, convivencia', required: true, multiline: true },
      { key: 'conditionalSince', label: 'Residente condicional desde', placeholder: 'Fecha de la green card condicional (2 años)', required: true },
    ],
  },
  {
    key: 'i-90',
    formCode: 'I-90',
    name: 'Solicitud de Reemplazo de la Green Card',
    nameEn: 'Application to Replace Permanent Resident Card',
    category: 'Ciudadanía y residencia',
    description:
      'Reemplaza o renueva la tarjeta de residente permanente (green card) perdida, robada, vencida o con datos erróneos.',
    feeNote: 'Tasa USCIS de referencia: USD 465 (incluye biometría). Verificar en uscis.gov.',
    useRag: false,
    formOutline:
      'Partes del I-90: Parte 1 (información del solicitante), Parte 2 (motivo de la solicitud — ' +
      'pérdida, robo, vencimiento, error de datos, cambio de nombre), Parte 6 (firma).',
    fields: [
      { key: 'applicant', label: 'Solicitante', placeholder: 'Nombre completo del cliente', required: true },
      F.birth,
      { key: 'reason', label: 'Motivo del reemplazo', placeholder: 'Pérdida / robo / vencimiento / error en la tarjeta / cambio de nombre', required: true },
      { key: 'cardInfo', label: 'Datos de la tarjeta actual', placeholder: 'A-Number, fecha de emisión y vencimiento si se conocen', required: false, multiline: true },
    ],
  },
];

export function getImmigrationForm(key: string): ImmigrationForm | undefined {
  return IMMIGRATION_FORM_CATALOG.find((f) => f.key === key);
}
