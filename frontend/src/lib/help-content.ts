/**
 * Catálogo de artículos del centro de ayuda.
 * Sólo contenido — la UI lo renderiza desde aquí.
 */
export interface HelpArticle {
  id: string;
  title: string;
  category: 'inicio' | 'casos' | 'litigacion' | 'productividad' | 'finanzas' | 'cuenta' | 'admin' | 'troubleshooting' | 'avanzado';
  description: string;
  keywords: string[];
  icon: string;
  /** Markdown ligero compatible con el MarkdownLite del chat. */
  body: string;
}

export const HELP_CATEGORIES: Record<HelpArticle['category'], { label: string; emoji: string; color: string }> = {
  inicio:          { label: 'Empezar',         emoji: '🚀', color: 'text-violet-700' },
  casos:           { label: 'Casos',           emoji: '📁', color: 'text-indigo-700' },
  litigacion:      { label: 'Litigación',      emoji: '⚖️', color: 'text-fuchsia-700' },
  productividad:   { label: 'Productividad',   emoji: '🗓️', color: 'text-sky-700' },
  finanzas:        { label: 'Finanzas',        emoji: '💼', color: 'text-emerald-700' },
  cuenta:          { label: 'Cuenta y datos',  emoji: '🔐', color: 'text-slate-700' },
  admin:           { label: 'Administración',  emoji: '🛠️', color: 'text-rose-700' },
  troubleshooting: { label: 'Solución de problemas', emoji: '🆘', color: 'text-orange-700' },
  avanzado:        { label: 'Avanzado',        emoji: '✨', color: 'text-amber-700' },
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
    id: 'doc-gen-etapa',
    title: 'IA recomienda el documento según la etapa del caso',
    category: 'litigacion',
    description: 'El generador analiza la etapa procesal y propone qué documento conviene redactar (demanda, recurso, alegato…).',
    keywords: ['generador', 'etapa', 'procesal', 'recomendación', 'sugerir', 'demanda', 'recurso'],
    icon: '🪄',
    body: `## Cómo funciona

Cuando entras al **Generador de documentos legales** desde un caso, la IA lee la etapa procesal actual (campo \`procedural_stage\` del caso, o lo deduce del expediente) y resalta el tipo de documento que tiene más sentido producir ahora.

Ejemplos:

- Etapa **Demanda** sin contestación → sugiere *Demanda* o *Solicitud de medida cautelar*.
- Etapa **Audiencia preliminar** próxima → sugiere *Alegato preparatorio* o *Pliego de pruebas*.
- Sentencia desfavorable reciente → sugiere *Apelación* o *Casación*.
- Negociación en curso → sugiere *Acuerdo Transaccional*.

La sugerencia aparece como un **chip violeta brillante** sobre la opción recomendada. Puedes seguirla o ignorarla y elegir cualquier otro tipo.

## Por qué es útil

Muchos abogados pierden minutos decidiendo qué redactar. Esta capa sólo te ahorra esa fricción inicial — la decisión final siempre es tuya.

## Si no lo ves

- Verifica que el caso tenga **descripción** y al menos un **documento subido**.
- Llena los campos *Metadatos jurídicos* del caso (especialmente \`procedural_stage\` y \`legal_matter\`).
`,
  },
  {
    id: 'pwa-instalar',
    title: 'Instalar Poweria como app (PWA)',
    category: 'productividad',
    description: 'Convierte la web en una app real en tu móvil o escritorio. Funciona offline para lo básico.',
    keywords: ['pwa', 'instalar', 'app', 'móvil', 'offline', 'home screen'],
    icon: '📲',
    body: `## En el móvil (Android / Chrome)

1. Abre **https://poweria-legal.vercel.app** en Chrome
2. Menú ⋮ → **Agregar a pantalla de inicio**
3. Confirma. Aparece el ícono de Poweria como cualquier otra app.

## En iPhone (Safari)

1. Abre la URL en Safari
2. Botón **compartir** (cuadrado con flecha) → **Añadir a pantalla de inicio**
3. Confirma.

## En escritorio (Chrome / Edge)

1. Abre la URL
2. En la barra de direcciones, ícono ⊕ a la derecha → **Instalar Poweria Legal**
3. Se abre como ventana standalone, sin pestañas del navegador.

## Qué obtienes

- Inicio más rápido (cache local de assets).
- Modo offline para vistas que ya cargaste antes (no podrás llamar a la IA sin internet, pero sí leer un caso ya abierto).
- Notificaciones push (próximamente).

## Si una versión vieja se quedó pegada

Cuando publicamos un fix, a veces el navegador sirve los chunks viejos del cache local. Solución:

1. Configuración del sitio → **Borrar datos del sitio** o
2. DevTools → Application → **Service Workers → Unregister** + **Cache Storage → Delete**
3. Recarga.
`,
  },
  {
    id: 'admin-panel',
    title: 'Panel de administración: vista general',
    category: 'admin',
    description: 'Solo para administradores. Resumen de las secciones del panel y qué controla cada una.',
    keywords: ['admin', 'panel', 'gestión', 'cognitex'],
    icon: '🛠️',
    body: `## Quién ve este panel

Solo usuarios con rol \`admin\`. Los demás ni siquiera ven el menú. Si tu cuenta tiene rol admin, aparece un chip "Administrador" en tu avatar superior derecho.

## Secciones disponibles

- **Usuarios** — gestión de roles, estado activo y plan.
- **Especialidades Legales** — taxonomía jerárquica (Penal, Civil, Constitucional…) que alimenta los selects de casos y el generador.
- **Auth Events** — auditoría en tiempo real de signup/login/OAuth/errores. Útil cuando un usuario reporta no poder entrar.
- **Auditoría general** — KPIs del sistema (total usuarios/casos, almacenamiento, etc.).
- **Cuotas y planes** — definición de límites por tier (\`MAX_CASES_*\`).
- **Embeddings** — re-vectorizar documentos cuando se actualiza el modelo.
- **AI Settings** — credenciales de proveedores IA (Anthropic, OpenAI), modelo por defecto.
- **Backups** — backups manuales y restauración (con cola BullMQ + SSE en vivo).
- **PayHub / Pagos** — integración con el hub de pagos centralizado (PayPal live).

## Consejo

Cuando alguien reporte un problema, abre primero **Auth Events** filtrando por su email — el código y mensaje exactos del error aparecen ahí sin necesidad de pedir screenshot.
`,
  },
  {
    id: 'admin-usuarios',
    title: 'Gestión de usuarios y cambio de plan',
    category: 'admin',
    description: 'Cambiar rol, activar/desactivar y promover a un plan superior desde un click.',
    keywords: ['admin', 'usuarios', 'plan', 'rol', 'promover', 'desactivar'],
    icon: '👥',
    body: `## Tabla de usuarios

\`/admin/users\` lista todos los usuarios con: nombre, email, rol, **plan** (badge colorizado por tier), actividad (casos + consultas), estado.

Filtros disponibles: rol, estado activo/inactivo, búsqueda por nombre o email.

## Editar un usuario

Botón **Editar** abre un modal con:

- Nombre, email
- Rol: Administrador / Abogado / Usuario
- **Plan**: Gratis / Básico / Profesional / Empresarial — el dropdown precarga el plan actual del usuario.

Click **Guardar** y el cambio se persiste en la DB y en sus claims JWT (próxima sesión recoge el plan nuevo).

## Activar / desactivar

Botón **Desactivar** marca al usuario como inactivo: no podrá iniciar sesión hasta que lo reactives. Sus datos se conservan.

## Cuándo cambiar el plan manualmente

- Promociones o cuentas de prueba para socios.
- Equipos que pagaron por transferencia bancaria (en lugar de PayPal).
- Resolver disputas: subir tier por unas horas mientras se diagnostica un problema de cuota.

## Auditoría

Cada cambio en plan o rol queda registrado en la tabla \`admin_audit_log\` con quién, qué, cuándo. Se ve desde **/admin/audit**.
`,
  },
  {
    id: 'admin-especialidades',
    title: 'Especialidades legales: árbol y taxonomía',
    category: 'admin',
    description: 'Editar el catálogo de especialidades del derecho que alimenta selects y filtros.',
    keywords: ['admin', 'especialidades', 'taxonomía', 'derecho', 'árbol', 'jerarquía'],
    icon: '🌳',
    body: `## Para qué sirve

Esta tabla alimenta los selects de **Materia / Especialidad** en los casos y las recomendaciones del generador de documentos. La taxonomía actual cubre el sistema legal ecuatoriano:

- 5 raíces: Derecho Público · Derecho Privado · Derecho Social · Derecho Procesal · Otras
- 23 ramas de nivel 2
- 16 sub-especialidades de nivel 3

## Vistas

\`/admin/specialties\` ofrece dos vistas:

- **Árbol** — jerarquía expandible/colapsable con códigos (ej. \`DPRIV-CIVIL-FAM\` para Familia).
- **Lista** — tabla plana con búsqueda y conteo de casos por especialidad.

## Crear o editar

Botón **+ Nueva Especialidad** o **Editar** en cada nodo:

- Nombre, código único, descripción
- Padre (puedes anidar a cualquier nivel)
- Color e ícono opcional

## Eliminar

Solo si no hay casos referenciando esa especialidad. Si los hay, primero reasigna esos casos a otra rama.

## Reset

Si quieres volver a la taxonomía base (44 especialidades del seed), corre desde el repo:

\`DATABASE_URL=<session-pooler> npx tsx prisma/seeds/specialties.ts\`

Esto NO borra las existentes — solo intenta crear las que falten.
`,
  },
  {
    id: 'admin-auth-events',
    title: 'Auth Events: monitor de logins en tiempo real',
    category: 'admin',
    description: 'Registro detallado de signup, login, OAuth y errores. La primera parada cuando un usuario reporta no poder entrar.',
    keywords: ['auth', 'events', 'logs', 'login', 'signup', 'oauth', 'monitor', 'observabilidad'],
    icon: '📡',
    body: `## Qué es

\`/admin/auth-events\` es un dashboard en tiempo real de **toda interacción de autenticación**: signup, login, OAuth init, OAuth callback, errores, magic-links, logouts. Cada evento incluye email, IP, user-agent, código de error, mensaje completo y metadata (status code, etapa del flujo, etc.).

## Cuándo usarlo

- Un usuario te dice "no puedo entrar" → filtra por su email y verás el error exacto sin pedirle screenshot.
- Subió el tráfico y quieres ver cuántos signups del día funcionaron vs. fallaron → contadores arriba (24h éxitos · 24h errores · total).
- Sospechas un intento de fuerza bruta → filtra por IP o por \`success=false\` en una ventana corta.

## Filtros

- Tipo de evento (16 tipos): \`signup_attempt/success/error\`, \`login_attempt/success/error\`, \`oauth_init/callback/error\`, \`password_reset_*\`, \`magic_link_*\`, \`session_start/end\`.
- Solo éxitos / solo errores.
- Email contiene…
- Auto-refresh cada 15 segundos.

## Modal de detalle

Click "Detalle" en cualquier fila → ID, timestamp completo, user-agent completo, URL (incluyendo query params del callback), metadata JSON.

## Privacidad

La tabla guarda email + IP + user-agent. **No** se guarda contraseña ni token de sesión. Retención sugerida: 12 meses para auditoría LOPDP. Para purgar antes:

\`DELETE FROM auth_events WHERE created_at < now() - interval '90 days';\`
`,
  },
  {
    id: 'troubleshooting-no-puedo-entrar',
    title: 'No puedo iniciar sesión',
    category: 'troubleshooting',
    description: 'Pasos en orden para resolver problemas de login (email/password, Google, magic-link).',
    keywords: ['login', 'no puedo', 'error', 'autenticación', 'oauth', 'google', 'rechazado'],
    icon: '🚪',
    body: `## Primero — limpia el estado del navegador

PWAs cachean agresivo. Si el login falla y nada cambia al recargar:

1. **Ctrl+Shift+R** (hard reload) para forzar bypass del Service Worker.
2. Si persiste, DevTools → Application → **Service Workers → Unregister** + **Cache Storage → Delete**, y vuelve a abrir.

## Email + contraseña

- ¿Mensaje "credenciales inválidas"? Usa **¿Olvidaste tu contraseña?** desde la pantalla de login. Te llega un magic-link.
- ¿No llega el email? Revisa spam. Si tampoco, escribe a **francisecuador1@gmail.com**.

## Botón "Continuar con Google"

- Si ves *"Acceso bloqueado: Missing required parameter: client_id"* → es config del lado servidor (Supabase Auth Providers). Avisa al admin.
- Si ves *"redirect_uri_mismatch"* → la URI del callback no está en el OAuth Client de Google Cloud. También admin.
- Si Google pide elegir cuenta y luego rebota a localhost → el Site URL en Supabase está mal. Admin debe revisar URL Configuration.

## Para administradores

Antes que nada, abre **/admin/auth-events** y filtra por el email del usuario. El código y mensaje exactos te dirán de qué se trata.

## Cuenta desactivada

Si tu cuenta fue desactivada por inactividad o moderación, el login devuelve un error genérico. Escribe a **francisecuador1@gmail.com** desde tu correo registrado pidiendo reactivación.
`,
  },
  {
    id: 'troubleshooting-app-vieja',
    title: 'La app no muestra cambios recientes',
    category: 'troubleshooting',
    description: 'Si ves bugs ya corregidos o un layout viejo, casi siempre es el Service Worker sirviendo cache.',
    keywords: ['cache', 'pwa', 'sw', 'service worker', 'viejo', 'desactualizado'],
    icon: '🔄',
    body: `## Síntomas

- Reportas un bug, te confirman que está corregido en producción, pero tú lo sigues viendo.
- El layout se ve "viejo" comparado con el de otra persona.
- Después de un deploy, los chunks JS no se actualizan.

## Por qué

Las versiones viejas de nuestra PWA (anteriores al **2026-05-01**) usaban política **cache-first** para los chunks JS, lo que pinneaba bundles viejos en tu navegador. Ya está arreglado en producción (network-first) — pero si tu navegador tiene el SW antiguo registrado, se queda con la política vieja.

## Solución (una sola vez)

1. Abre DevTools (F12)
2. Pestaña **Application**
3. Sección **Service Workers** → click **Unregister** en \`poweria-legal.vercel.app\`
4. Sección **Cache Storage** → borra todos los caches \`legal-rag-*\`
5. Cierra la pestaña por completo y vuelve a abrir la URL.

A partir de ahí, futuros deploys toman efecto inmediato.

## Móvil

Configuración del navegador → Privacidad → **Borrar datos del sitio** para *poweria-legal.vercel.app*.

## Si no funciona

Reporta a **francisecuador1@gmail.com** con captura de pantalla y la versión de tu navegador. Probablemente sea otro problema.
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
