/**
 * Catálogo de artículos del centro de ayuda.
 * Sólo contenido — la UI lo renderiza desde aquí.
 */
export interface HelpArticle {
  id: string;
  title: string;
  category: 'inicio' | 'casos' | 'litigacion' | 'productividad' | 'finanzas' | 'cuenta' | 'avanzado';
  description: string;
  keywords: string[];
  icon: string;
  /** Markdown ligero compatible con el MarkdownLite del chat. */
  body: string;
}

export const HELP_CATEGORIES: Record<HelpArticle['category'], { label: string; emoji: string; color: string }> = {
  inicio:        { label: 'Empezar',          emoji: '🚀', color: 'text-violet-700' },
  casos:         { label: 'Casos',            emoji: '📁', color: 'text-indigo-700' },
  litigacion:    { label: 'Litigación',       emoji: '⚖️', color: 'text-fuchsia-700' },
  productividad: { label: 'Productividad',    emoji: '🗓️', color: 'text-sky-700' },
  finanzas:      { label: 'Finanzas',         emoji: '💼', color: 'text-emerald-700' },
  cuenta:        { label: 'Cuenta y datos',   emoji: '🔐', color: 'text-slate-700' },
  avanzado:      { label: 'Avanzado',         emoji: '✨', color: 'text-amber-700' },
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'que-es',
    title: 'Qué es Poweria Legal',
    category: 'inicio',
    description: 'El producto en 2 minutos: sala de litigación, tarjetas IA, convocatorias, calendario, tareas y finanzas — todo en un lugar.',
    keywords: ['intro', 'overview', 'qué hace', 'cognitex'],
    icon: '🚀',
    body: `## Qué resuelve Poweria Legal

Poweria Legal es una plataforma de IA jurídica creada por **COGNITEX** (Ecuador). Reúne en una sola interfaz todo lo que un abogado o estudio necesita para llevar casos en LATAM:

- **Sala de Litigación**: pantalla completa con cronómetro de audiencia, brief, cronología, notas en vivo, tarjetas argumentales y un asistente IA que ya conoce el expediente.
- **Tarjetas argumentales por IA**: apertura, hechos, fundamento, prueba, refutación, réplica y cierre — generadas en streaming a partir del caso real.
- **Convocatoria auto-extraída**: subes el PDF de la providencia y la IA extrae fecha, hora, link de Zoom/Teams/Meet, código y juzgado.
- **Calendario y tareas**: mes/semana/día/agenda con drag-and-drop, kanban con sub-tareas y plantillas legales.
- **Finanzas con CFO virtual**: aging de cobranza, forecast 4 semanas, factura desde tareas en un click, PDF al vuelo.
- **Buscador jurídico instantáneo**: cita "Art. 76 Constitución" o "234 COIP" y ves el contenido del artículo en un segundo.

## Por qué confiar

- Datos cifrados en reposo y en tránsito.
- **Tu información jamás entrena nuestros modelos**.
- Cumplimiento LOPDP Ecuador y mejores prácticas internacionales.
- IA con citas verificables: si no está 100% segura, marca \`[CITA POR VERIFICAR]\` antes de inventar.
`,
  },
  {
    id: 'planes-precios',
    title: 'Planes, precios y suscripción',
    category: 'inicio',
    description: 'Diferencias entre Gratis, Starter, Pro, Pro Max, Studio e Institucional — y cómo cambiar de plan.',
    keywords: ['precios', 'pricing', 'planes', 'pro', 'starter', 'studio', 'pago', 'suscripción'],
    icon: '💳',
    body: `## Tabla resumida

- **Gratis** — $0/mes — 1 caso · 30 consultas IA · sin tarjeta.
- **Starter** — $19/mes — 10 casos · 150 IA · OCR Vision (10 págs).
- **Pro ⭐** — $49/mes — 50 casos · 600 IA · Sala de Litigación · Tarjetas IA · Finanzas con CFO virtual.
- **Pro Max** — $99/mes — 200 casos · 1.200 IA · API access · prioridad IA.
- **Studio** — $249/mes — 5 usuarios · 100 casos compartidos · roles y permisos.
- **Institucional** — A medida — SSO/SAML, white-label, despliegue privado, SLA dedicado.

En el plan **Anual** te llevamos 2 meses de regalo: 12 al precio de 10.

## Cómo suscribirte

1. Ve a **Pricing** en el menú o desde la landing.
2. Elige Mensual o Anual.
3. Click en *Suscribirse* del plan que quieres.
4. Se abre el modal de pago con **PayPal** o **transferencia bancaria** al Banco del Pichincha (cuenta corporativa COGNITEX). Verás los datos completos y un código de referencia único.
5. Si pagas por transferencia, sube el comprobante o lo envías por WhatsApp al **+593 98 396 4333**. Activamos en menos de 24h.

## Cancelar / cambiar

Desde **⚙️ Settings → Billing**. Si cancelas, conservas acceso hasta el final del periodo pagado.
`,
  },
  {
    id: 'login-registro',
    title: 'Login, registro y recuperar contraseña',
    category: 'inicio',
    description: 'Crear tu cuenta, iniciar sesión y la diferencia entre rol abogado, cliente y administrador.',
    keywords: ['login', 'registro', 'cuenta', 'contraseña', 'roles', 'admin', 'lawyer'],
    icon: '🔑',
    body: `## Crear cuenta

Click **Probar gratis** en la landing → ingresas nombre, email y contraseña. Activamos tu plan Gratis al instante (sin tarjeta).

## Iniciar sesión

\`/login\` — también accesible desde el botón superior derecho de la landing. Si llegaste desde un link de pago, después de ingresar te devolvemos a esa misma página.

## Recuperar contraseña

Desde la pantalla de login → **¿Olvidaste tu contraseña?** Te llega un magic-link al email.

## Roles

- **Abogado** (rol por defecto) — accede a casos propios, calendario, tareas, finanzas, sala de litigación, generador.
- **Cliente** — vista limitada a los casos donde figura como contraparte autorizada.
- **Administrador** (interno COGNITEX) — accede al panel \`/admin\` para gestionar usuarios, planes, embeddings, auditoría, etc. **Un usuario o abogado nunca verá el menú admin.**
`,
  },
  {
    id: 'caso-crear',
    title: 'Crear un caso y subir documentos',
    category: 'casos',
    description: 'Cómo dar de alta un caso, subir documentos al expediente, y qué hace la IA con ellos automáticamente.',
    keywords: ['caso', 'crear', 'expediente', 'documentos', 'pdf', 'docx', 'subir'],
    icon: '📁',
    body: `## Crear

En el dashboard click **+ Nuevo caso** → mínimo: título y cliente. Después podrás llenar metadatos (materia, tribunal, jurisdicción, juez, opositor, cuantía, fechas) en la sección *Metadatos jurídicos*.

## Subir documentos

Dentro del caso, panel **Documentos**, botón **Subir documento**. Aceptamos PDF · DOCX · XLSX · CSV · PNG · JPG · WEBP.

Al subir cada documento:
1. Extraemos el texto (OCR Vision en escaneos / imágenes).
2. Lo dividimos en chunks y vectorizamos.
3. Queda indexado para el chat del caso, la sala de litigación y el generador de documentos.

## Categorías

Los documentos se clasifican automáticamente como contratos, pruebas o informes según el filename. Puedes filtrar arriba.

## Secciones del caso

Al abrir un caso ves:

- **Header** del caso (siempre visible).
- **Metadatos jurídicos**, **Partes**, **Finanzas** — colapsables. Pulsa la barra de cada una o usa los botones \`Abrir todo\` / \`Cerrar todo\`. Atajos: \`E\` abre · \`Q\` cierra.
- Las secciones con datos faltantes muestran un **badge ámbar/rojo** y banda de color en el header — sabrás qué falta sin abrir.
`,
  },
  {
    id: 'sala-litigacion',
    title: 'Sala de Litigación a pantalla completa',
    category: 'litigacion',
    description: 'El modo "audiencia" — cronómetro, brief, cronología, notas, búsqueda de artículos, chat IA contextual.',
    keywords: ['sala', 'litigación', 'audiencia', 'pantalla completa', 'cronómetro', 'fullscreen'],
    icon: '⚖️',
    body: `## Cómo abrirla

Desde un caso, botón violeta **⚖️ Sala de Litigación** arriba a la derecha. Se abre a pantalla completa con fondo oscuro.

## Tres columnas

- **Izquierda** — Brief del caso, próxima audiencia con botón Unirse y cronología vertical.
- **Centro** — Pestañas: \`🎴 Tarjetas IA\` (default), \`Argumentos & notas\`, \`Documentos\`, \`Buscar artículo\`.
- **Derecha** — Chat IA con el caso pre-cargado.

## Atajos

- \`1\` Tarjetas · \`2\` Notas · \`3\` Docs · \`4\` Artículo
- \`⌘ /\` foco en buscador de artículos desde cualquier tab
- \`F\` pantalla completa real (Fullscreen API)
- \`←\`/\`→\` navegar entre tarjetas del mazo
- \`␣\` marcar la tarjeta actual como expuesta
- \`P\` modo presentador (overlay para proyector externo)

## Cronómetro de audiencia

Arriba, junto al botón fullscreen — Play/Pausa/Reset. No se reinicia al cambiar de pestaña.
`,
  },
  {
    id: 'tarjetas-argumentales',
    title: 'Tarjetas argumentales por IA',
    category: 'litigacion',
    description: 'Genera apertura, hechos, fundamento, prueba, refutación, réplica y cierre desde el caso real.',
    keywords: ['tarjetas', 'argumentos', 'apertura', 'cierre', 'mazo', 'litigación'],
    icon: '🎴',
    body: `## Cómo funciona

En la Sala de Litigación, pestaña **🎴 Tarjetas IA**, botón **Generar mazo**. La IA produce 7 tarjetas en streaming:

1. 🎙️ **Apertura** — la frase con la que abres
2. 📜 **Hechos** — relato cronológico
3. ⚖️ **Fundamento jurídico** — normas y principios
4. 🔍 **Prueba** — lo que vas a presentar
5. 🛡️ **Refutación** — anticipa lo que dirá la otra parte
6. ↩️ **Réplica**
7. 🏁 **Cierre**

Cada tarjeta trae:
- Headline (frase de impacto)
- 3-5 talking points clickables (los tachas mientras los expones)
- Citas legales en chips → clic abre el artículo en el buscador
- ⏱ tiempo estimado · 🔊 leer en voz alta · 🔄 regenerar solo esta
- Caja roja "Riesgo / objeción" con la trampa más probable

## Persistencia

El mazo y qué tarjetas marcaste como "expuestas" se guardan por caso. Al volver a abrir la sala, las encuentras donde las dejaste.

## Modo presentador

Click en **🔍 Modo presentador** (o tecla \`P\`) — overlay con backdrop-blur ideal para proyectar a un monitor externo durante la audiencia.
`,
  },
  {
    id: 'convocatoria-providencia',
    title: 'Convocatoria automática desde una providencia',
    category: 'productividad',
    description: 'Sube el PDF de la providencia y la IA llena fecha, hora, link de Zoom/Teams/Meet, código y juzgado.',
    keywords: ['providencia', 'convocatoria', 'audiencia', 'zoom', 'auto-completar', 'juez'],
    icon: '📄',
    body: `## Flujo

1. Calendario → **Nuevo evento** (o desde la sala, *Sin convocatoria registrada* → "Ir a calendario").
2. Arriba del formulario hay un drop-zone violeta: **Autocompletar desde una providencia**.
3. Arrastra el PDF / imagen / DOCX o haz click. La IA tarda 3-8 segundos.
4. Cada campo rellenado por IA queda marcado con un chip **✨ IA** al lado del label. Revisa, ajusta lo dudoso, guarda.

## Lo que extrae

- Título y tipo (audiencia / juicio / mediación / etc.)
- Fecha y hora (zona Guayaquil implícita)
- Enlace de la videollamada (Zoom/Teams/Meet/Webex/Jitsi/Whereby)
- Proveedor auto-detectado por dominio del URL
- Código / passcode
- Lugar (si es presencial)
- Fuente — texto literal: *"Providencia 0123-2026 del Juzgado de lo Civil — recibida 28 abr 2026"*

## Anti-alucinación

La IA **nunca inventa** un link: si el PDF no tiene URL, deja el campo vacío y muestra un warning ámbar abajo del dropzone. Lo mismo con el código.

## En la Sala

La próxima audiencia aparece como una **HearingJoinCard** en la columna izquierda con countdown en vivo y un botón gigante **Unirse** que cambia de color según falten minutos, esté en curso, o haya finalizado.
`,
  },
  {
    id: 'chat-caso',
    title: 'Asistente IA del caso',
    category: 'litigacion',
    description: 'Claude Opus con todo el expediente pre-cargado — sugerencias específicas, copiar, regenerar, exportar.',
    keywords: ['chat', 'asistente', 'ia', 'claude', 'preguntas', 'sugerencias'],
    icon: '🤖',
    body: `## Qué hace

Dentro del caso, panel "Asistente Legal IA". Está conectado a **Claude Opus** (la versión más reciente disponible) con un system prompt nivel **abogado(a) senior** y todo el expediente del caso ya inyectado: descripción, hasta 6 documentos con extractos, cronología.

## Garantías de honestidad

- Cita artículos con número y norma exactos.
- Si no está 100% seguro escribe \`[CITA POR VERIFICAR]\` en lugar de inventar.
- Nunca usa "NN" — si falta un dato dice "[DATO REQUERIDO: ...]".
- No inventa jurisprudencia.

## Sugerencias específicas del caso

La pantalla de bienvenida muestra **6 quick-prompts** que la IA generó leyendo TU caso (no son genéricos). Cada uno tiene icono, etiqueta corta y pregunta lista para enviar. Botón "🔄 Refrescar" regenera.

## Opciones avanzadas

Click ⚙️ en el header del chat:
- **Tono**: Forense / Práctico / Didáctico
- **Largo**: Corta / Estándar / Detallada
- **Idioma**: Español / English

Se persisten por caso.

## Acciones por respuesta

Al hover sobre una respuesta del asistente:
- 📋 **Copiar** (toast verde)
- 🔄 **Regenerar** (solo en la última)

## Otras capacidades

- 📎 **Adjuntar archivo** desde el chat: se sube al expediente, se indexa, y la IA lo analiza solo.
- ⬇️ **Exportar conversación** como Markdown.
- 🗑 **Limpiar** la conversación.
- ⏸ **Detener** un streaming en curso.
`,
  },
  {
    id: 'calendario-tareas',
    title: 'Calendario, tareas y kanban',
    category: 'productividad',
    description: 'Vistas mes/semana/día/agenda, drag-and-drop, plantillas legales, plantillas IA y atajos.',
    keywords: ['calendario', 'tareas', 'kanban', 'agenda', 'drag', 'plantillas'],
    icon: '🗓️',
    body: `## Calendario

Vistas: **Mes** (\`M\`), **Semana** (\`S\`), **Día** (\`D\`), **Agenda** (\`A\`). \`T\` te lleva a hoy.

- Drag-and-drop en la vista mes para mover eventos entre días — mantiene la hora.
- Sidebar izquierdo: mini-calendar + filtros por tipo de evento.
- Click en un slot vacío en Semana/Día → crea evento en esa hora.

## Tareas

Tablero **Kanban** (drag-drop entre columnas TODO / IN_PROGRESS / DONE) o lista.

- **Quick-add inline** en cada columna.
- **AI: Sugerir subtareas** dentro del TaskDialog — la IA divide la tarea en 4-7 sub-pasos accionables.
- **Plantillas legales** botón ✨ — flujos curados (Demanda Civil, Audiencia preliminar, Revisión contractual, Recurso de apelación) que crean varias tareas con due dates relativas.
- **Workload insights** arriba: vencidas, hoy, esta semana, urgentes, sin asignar, en progreso, completadas en 7d, total.
- **Filtros**: chips por prioridad + "vencidas" + "sin asignar" + búsqueda full-text.

## Realtime

Si un colega cambia algo, lo ves en vivo (Supabase Realtime).
`,
  },
  {
    id: 'finanzas-cfo',
    title: 'Finanzas con CFO virtual',
    category: 'finanzas',
    description: 'Aging, forecast, top clientes, factura desde tareas, PDF generado al vuelo, export CSV.',
    keywords: ['finanzas', 'cobranza', 'aging', 'cfo', 'factura', 'pdf', 'csv'],
    icon: '💼',
    body: `## Tres pestañas

- **Resumen** — 4 KPI cards con sparkline (ingresos del mes, total facturado, por cobrar, ratio de cobranza). Lectura del CFO virtual con IA. Revenue chart 12 meses, forecast 4 semanas, aging buckets, top clientes, métodos de pago.
- **Cobranza** — lista de vencidas con barras de severidad por antigüedad. Hover muestra "descargar PDF" y "recordatorio".
- **Reportes** — donut por método, top clientes, revenue chart, callout exportar CSV.

## Sorpresa: Facturar desde tareas

Botón violeta **⚡ Facturar desde tareas** arriba a la derecha. Selecciona el caso, marca las tareas \`DONE\` que quieres facturar, ajusta tarifa por hora (default $75) e IVA (default 12%). La factura se genera con número INV-YYYYMM-NNNN, se persiste, y se abre el PDF al instante.

## CFO virtual

Card violeta en Resumen — la IA lee tus métricas y devuelve 2-3 frases en español sobre tu momentum y la mayor preocupación accionable.

## Realtime

Cualquier cambio en \`finance_invoices\` o \`finance_payments\` invalida el dashboard automáticamente.
`,
  },
  {
    id: 'generador-documentos',
    title: 'Generador de documentos legales',
    category: 'litigacion',
    description: 'Demandas, contestaciones, recursos, contratos, alegatos — Word listo para presentar, sin alucinar.',
    keywords: ['generar', 'documento', 'demanda', 'contestación', 'word', 'docx'],
    icon: '📑',
    body: `## Tipos disponibles (12)

Demanda · Contestación · Apelación · Casación · Alegato · Contrato · Acuerdo Transaccional · Informe Jurídico · Carta Legal · Notificación · Poder · Escrito General.

## Flujo

Desde un caso, botón **⚡ Generar Documento Legal** (lateral derecho).

1. **Pick** — eliges tipo, especialidad ("Penal económico", "Laboral colectivo"), instrucciones adicionales.
2. **Verificar datos** — la IA chequea qué campos obligatorios faltan según el tipo. Si falta algo:
   - Card ámbar con la lista
   - Cada faltante: input para llenar manual + botón **✨ Sugerir con IA** que lo extrae del expediente
   - O botón "Generar igual con marcadores" para que la IA escriba \`[DATO REQUERIDO]\` en lugar de adivinar
3. **Generate** — streaming en tiempo real con loader violeta.
4. **Review** — botones:
   - 🔄 Re-generar
   - 📋 Copiar
   - 📁 **Adjuntar al expediente** (queda como Document del caso)
   - ⬇️ **Descargar .docx** (Word real con título centrado, secciones romanas, justificado)

## Garantías

- Estructura forense profesional con secciones romanas (\`## I. SUMILLA\`, etc.).
- Citas legales **exactas** al ordenamiento del país.
- \`[CITA POR VERIFICAR]\` cuando la IA duda — nunca inventa.
- Cero "NN" — usa \`[DATO REQUERIDO: ...]\` en lo que falta.
`,
  },
  {
    id: 'privacidad-datos',
    title: 'Privacidad, LOPDP y manejo de datos',
    category: 'cuenta',
    description: 'Qué hacemos con tu información. Spoiler: no entrenamos modelos con ella, y cumplimos LOPDP.',
    keywords: ['privacidad', 'lopdp', 'datos', 'gdpr', 'cifrado'],
    icon: '🔐',
    body: `## Lo esencial

- **Tu información jamás entrena nuestros modelos.** Cero excepciones.
- Cifrado **AES-256** en reposo, **TLS 1.3** en tránsito.
- **Row-Level Security** en PostgreSQL — un cliente jamás puede ver datos de otro.
- Cumplimiento **LOPDP Ecuador** + alineado con GDPR.
- Auditoría disponible (plan Institucional incluye reportes).

## Tus derechos LOPDP

Acceso · Rectificación · Eliminación · Portabilidad · Oposición · Limitación. Para ejercerlos, escribe a francisecuador1@gmail.com con asunto "Ejercicio de derechos LOPDP". Respondemos en 15 días hábiles.

## Retención

- Datos personales: 30 días tras cerrar tu cuenta (puedes exportar antes).
- Registros financieros: 7 años (obligación tributaria).
- Logs de auditoría: 12 meses.

## Contenido subido por terceros

Cuando un abogado sube docs de su cliente, COGNITEX actúa como **Encargado** del tratamiento. El abogado es el Responsable y debe obtener consentimiento del cliente cuando proceda.

Lee también: [Política de Privacidad completa](/privacy) · [Términos de Servicio](/terms) · [LOPDP Ecuador](/lopdp).
`,
  },
  {
    id: 'atajos-globales',
    title: 'Atajos de teclado y comandos rápidos',
    category: 'avanzado',
    description: 'Referencia completa de shortcuts y la paleta Cmd+K.',
    keywords: ['atajos', 'shortcuts', 'cmd+k', 'comandos', 'keyboard'],
    icon: '⌨️',
    body: `## Globales

- \`⌘ K\` (mac) o \`Ctrl K\` (win/linux) — paleta de comandos.
- \`Esc\` — cerrar la paleta o salir de fullscreen.

## Calendario

- \`M\` Mes · \`S\` Semana · \`D\` Día · \`A\` Agenda · \`T\` hoy

## Sala de Litigación

- \`1\` Tarjetas · \`2\` Notas · \`3\` Docs · \`4\` Artículo
- \`⌘ /\` foco en buscador de artículos
- \`←\` / \`→\` navegar tarjetas · \`␣\` marcar expuesta · \`P\` presentador
- \`F\` pantalla completa

## Caso (página de detalle)

- \`E\` abrir todas las secciones · \`Q\` cerrar todas

## Cmd+K — comandos disponibles

Grupos: Crear · Navegar · Filtros rápidos · Ayuda. Algunos:
- "Nueva tarea" · "Nuevo evento" · "Facturar desde tareas" · "Aplicar plantilla legal"
- "Casos" · "Calendario" · "Tareas" · "Finanzas" · "Settings"
- "Cobranza vencida" · "Tareas vencidas" · "Eventos de hoy" · "Esta semana"
- "Centro de ayuda" · "Iniciar tour de esta página"
`,
  },
];
