/**
 * Catálogo de artículos del centro de ayuda.
 * Sólo contenido — la UI lo renderiza desde aquí.
 */
export interface HelpArticle {
  id: string;
  title: string;
  category: 'inicio' | 'casos' | 'litigacion' | 'productividad' | 'finanzas' | 'modulos' | 'cuenta' | 'admin' | 'troubleshooting' | 'avanzado';
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
  modulos:         { label: 'Módulos avanzados', emoji: '🧰', color: 'text-teal-700' },
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
- **Módulos avanzados** (menú "Más"): Workflow Studio, Agente de Trámites, Analíticas de ROI, Traductor Jurídico bilingüe y Agente de Formularios de Inmigración (USCIS).
- **Asistente en Telegram**: consultá y recibí notificaciones desde el chat, vinculando tu cuenta.

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
  {
    id: 'ciclo-vida-documentos',
    title: 'Ciclo de vida de los documentos del expediente',
    category: 'casos',
    description: 'Cada documento del caso tiene un tipo (kind) que la IA usa para priorizar: subido, borrador IA, análisis IA o presentado oficialmente.',
    keywords: ['documentos', 'kind', 'lifecycle', 'court_filed', 'ai_generated', 'ai_analysis', 'borrador', 'presentado'],
    icon: '📑',
    body: `## Los 4 tipos de documento

Cada documento en el expediente tiene un **kind** que se muestra como badge de color. La IA prioriza unos sobre otros al razonar sobre tu caso:

- **uploaded** (indigo, ícono 📄) — El que vos subís. Evidencia, contratos, providencias, escritos de contraparte.
- **ai_generated** (purple, ícono ✨) — Borrador generado por la IA con el módulo de Generación de Documentos. **No es oficial todavía** — la IA y los demás abogados lo tratan como propuesta.
- **ai_analysis** (fucsia, ícono ✨) — Análisis o dictamen producido por la IA (Análisis Profundo, Post-Upload, Referencia Legal). Conclusiones, no evidencia. **Nunca se vectoriza** para que no contamine la búsqueda RAG.
- **court_filed** (esmeralda, ícono ⚖️) — Documento que ya presentaste oficialmente al juzgado/fiscalía. **Verdad oficial del expediente** — la IA le da máxima prioridad sobre cualquier borrador propio.

## Cómo marcar un documento como presentado

1. En la lista de documentos del caso, encontrá el documento (típicamente uno **uploaded** o **ai_generated**).
2. Click en el ícono ⚖️ (Gavel) que aparece a la derecha.
3. Se abre el dialog "Marcar como presentado oficialmente":
   - **Presentado ante**: el juzgado/tribunal/fiscalía. Hay chips con los más comunes (Tribunal de Garantías Penales, Unidad Judicial Civil, etc).
   - **Fecha**: por defecto hoy, ajustable.
4. Confirmá. El documento cambia a **court_filed** y la IA recalcula el cerebro del caso.

A partir de ahí, cuando pidas un análisis profundo, generes un escrito o consultes el chat, la IA verá ese documento como verdad oficial y orientará su razonamiento.

## Reemplazo de versiones

Si subís una versión nueva que reemplaza a un documento anterior, el sistema marca el original con \`replaced_at\` (se oculta de la lista por defecto pero queda en historial). Útil para versionar borradores antes de presentar.
`,
  },
  {
    id: 'analisis-ia-post-upload',
    title: 'Análisis IA al subir un documento',
    category: 'casos',
    description: 'Cada vez que subís un nuevo documento al expediente, la IA produce un análisis automático con acciones urgentes, plan de trabajo y tareas sugeridas.',
    keywords: ['post-upload', 'análisis automático', 'IA', 'subir documento', 'acciones urgentes', 'plan de trabajo'],
    icon: '🧠',
    body: `## Qué dispara el análisis

Apenas termina la subida de un documento (desde el panel del caso o desde el chat del asistente), se abre automáticamente el dialog **Análisis IA del documento**. Claude Opus 4.7 lee:

- El documento recién subido (texto completo).
- El resto del expediente (priorizando los **court_filed** y **uploaded**).
- El cerebro del caso (resumen, partes, etapa procesal).

Y devuelve un JSON estructurado que se renderiza en secciones colapsables coloreadas.

## Secciones del análisis

- **Conclusión clave** — 1 línea en violeta: el cambio más importante para el caso.
- **Qué aporta al expediente** — 2-4 oraciones explicando el valor del documento.
- **Acciones urgentes** — Lista con plazo legal o táctico, prioridad alta/media/baja (rojo/ámbar/verde).
- **Plan de trabajo** — Pasos numerados con owner sugerido (abogado / cliente / fiscal / juez).
- **Tareas a crear** — Botón "Crear" para generar la tarea con plazo y categoría sugeridos.
- **Documentos a generar** — Qué escritos preparar, plazo y juzgado destinatario.
- **A actualizar ya** — Qué corregir o completar en el expediente.
- **Riesgos detectados** — Con severidad y mitigación propuesta.
- **Normas aplicables** — Artículos del COIP/COGEP/CRE con relevancia.
- **Información faltante** — Gaps que la IA no pudo resolver.
- **Confianza del modelo** — Porcentaje 0-100%.

El resultado se guarda automáticamente como documento del expediente con kind **ai_analysis** linkeado al documento original. Lo encontrás siempre en la lista del caso con un ícono ✨ y borde fucsia.

## Cuándo regenerar

Si la IA falló en parsear el documento (PDF escaneado sin OCR, archivo dañado) podés volver a subirlo. El nuevo análisis reemplaza al anterior automáticamente.
`,
  },
  {
    id: 'prompts-ia-categoria',
    title: 'Prompts especializados generados por IA',
    category: 'litigacion',
    description: 'Cada categoría de prompts (Análisis, Redacción, Estrategia, etc.) tiene un botón "IA avanzado" que genera 6-10 prompts específicos al caso con razonamiento multi-paso.',
    keywords: ['prompts', 'IA avanzado', 'categoría', 'análisis', 'redacción', 'estrategia', 'investigación'],
    icon: '🧩',
    body: `## El panel Prompts Especializados

En la página de detalle del caso, el panel central tiene un acordeón **"Prompts Especializados - <Tipo>"** con 8 categorías:

- 📊 Análisis Legal · 📝 Redacción · 🔍 Investigación · ♟️ Estrategia
- ✅ Cumplimiento · ✅ Búsqueda · ✅ Documentos · ✅ Citas Legales

Cada categoría tiene un conjunto base de prompts estáticos (cargados según el tipo legal del caso: penal/civil/laboral/etc).

## Botón "IA avanzado" por categoría

A la derecha del título de cada categoría hay un botón **Brain / IA avanzado** (gradient fucsia→purple). Al pulsarlo:

1. Se expande la categoría y aparece una **barra de progreso inline** con porcentaje grande, label de fase ("Generando prompt 4 de ~8…") y un pulse overlay.
2. Claude Opus 4.7 genera **6 a 10 prompts AVANZADOS exclusivos para esa categoría**, mucho más profundos que los estáticos:
   - Asumen abogado senior — no explican básico.
   - Activan razonamiento legal multi-paso.
   - Usan terminología técnica precisa de la materia (penal/civil/etc).
   - Cada prompt puede ser de 3-5 frases, mencionando partes, montos, normas concretas del caso real.
3. Los prompts IA aparecen al inicio de la lista con borde fucsia 2px y badge **"IA · avanzado"**, junto con un texto \`Why\` explicando por qué ese prompt es relevante AHORA para el caso.

## Botón "Generar con IA" global

Arriba del panel, junto al título "Prompts Especializados", hay otro botón que genera 8-14 prompts distribuidos en varias categorías de una sola pasada. Útil para un primer vistazo panorámico. Los prompts globales se muestran en una sección destacada arriba de las categorías.

## Copiar un prompt

Cada prompt tiene un mini-botón de copy (visible al hover) con feedback de check verde por 1.5s. Útil cuando querés llevarte el prompt a otra herramienta o quedártelo en el portapapeles.

## Refrescar etapa procesal

A la izquierda del panel está el bloque **Proceso <Tipo> — Etapa N de M** con un botón **"Re-evaluar IA"**. La IA lee los documentos del expediente y propone la etapa procesal actual con un *rationale* breve (por qué cree que está en esa etapa). Vos podés aceptarla o mantener la que ya tenías.
`,
  },
  {
    id: 'analisis-referencia-legal',
    title: 'Análisis profundo de una norma (Referencias Legales)',
    category: 'litigacion',
    description: 'Click en cualquier card del panel Referencias Legales y la IA + corpus RAG generan análisis completo: texto literal, importancia para tu caso, jurisprudencia, estrategia.',
    keywords: ['referencias legales', 'norma', 'artículo', 'COIP', 'COGEP', 'jurisprudencia', 'análisis ampliado'],
    icon: '⚖️',
    body: `## Cómo se dispara

En la columna derecha del caso encontrás el panel **Referencias Legales** con normas pertinentes al caso (sintetizadas por el cerebro IA cuando subiste documentos). Cada card muestra: tipo (Constitución/Código/Ley/Jurisprudencia), título, artículo, descripción corta y badge de relevancia (Alta/Media/Baja).

**Click en cualquier card** y se abre el dialog **Análisis profundo de la norma**. El sistema:

1. **Cargando contexto** — toma título de norma + artículo + descripción + tu caso (título, materia, etapa, descripción).
2. **Embedding semántico** — calcula el vector de búsqueda.
3. **RAG sobre corpus legal** — busca en \`legal_document_chunks\` (138 leyes ecuatorianas vectorizadas con 36.704 chunks). Filtro por país (EC), top-5 fuentes por score combinado semántico+keyword.
4. **Análisis IA** — Claude Opus 4.7 con el texto del artículo + extractos + contexto del caso.

Una **barra de progreso con mini-timeline** (Contexto → Embedding → RAG → Análisis IA → Estrategia → Listo) muestra el avance en tiempo real (TTFB, bytes, eventos recibidos).

## Qué muestra el análisis

- **Texto literal del artículo** — transcrito EXACTO del corpus. Si no se recuperó, la IA dice "literal no recuperado" sin inventar.
- **Resumen** — qué establece la norma en 3-5 oraciones.
- **Análisis jurídico** — bien protegido, tipo penal/civil, sujetos, verbo rector, elementos objetivos y subjetivos.
- **Importancia para este caso** — específicamente por qué importa AHORA, conectando con hechos del expediente.
- **Penas o efectos** — pena/nulidad/indemnización con detalle.
- **Requisitos** — qué tiene que probarse para que la norma aplique.
- **Normas relacionadas** — concordancias, excepciones, antecedentes (con artículo + relación).
- **Jurisprudencia clave** — sentencias con referencia + relevancia (Corte Constitucional, Corte Nacional).
- **Estrategia para este caso** — tácticas concretas para usar la norma.
- **Defensas comunes** — si sos la defensa, qué se suele alegar contra esta norma.
- **Errores comunes a evitar** — red flags al invocarla.
- **Fuentes del corpus** — los chunks RAG recuperados con scores (transparencia total).

## Persistencia

Si pulsás "Guardar al expediente" desde el dialog, el análisis queda como documento del caso con kind \`ai_analysis\`. Útil para volver a consultarlo sin regenerar (que tarda 20-45s y consume tokens).
`,
  },
  {
    id: 'pwa-y-cache',
    title: 'PWA: ChunkLoadError y "la app no carga"',
    category: 'troubleshooting',
    description: 'Si ves un error de carga tras un deploy nuevo, la app se auto-recupera. Si no, hacé un hard refresh para purgar el Service Worker.',
    keywords: ['pwa', 'service worker', 'chunkloaderror', 'app rota', 'no carga', 'caché viejo'],
    icon: '🔄',
    body: `## Qué pasa

Poweria Legal es una PWA: el Service Worker acelera la app guardando recursos en caché local. Cuando hacemos un deploy nuevo, los nombres de los archivos JavaScript cambian (cada build tiene hashes únicos). Si tu Service Worker cacheó la versión anterior, intenta cargar archivos que ya no existen y tira **ChunkLoadError**.

## La app se auto-recupera (a partir de mayo 2026)

El ErrorBoundary detecta el ChunkLoadError, purga toda la caché del navegador, desregistra el Service Worker viejo y recarga la página automáticamente. La primera vez que abras la app tras un deploy puede haber un parpadeo, pero después funciona normal.

Si el auto-recover entra en loop (mismo error tras recargar), el sistema deja un fallback UI con un botón **"Reintentar"** explícito.

## Recovery manual

Si nada de lo anterior funciona:

1. **Hard refresh** — \`Ctrl + Shift + R\` (Windows/Linux) o \`⌘ + Shift + R\` (Mac).
2. **Desregistrar el SW manualmente**: DevTools → Application → Service Workers → "Unregister", luego recargar.
3. **Limpiar Storage**: DevTools → Application → Storage → "Clear site data".

A partir de la versión de mayo 2026, el Service Worker **NUNCA cachea HTML** — solo recursos versionados (CSS/JS hasheados, imágenes). Eso elimina el problema de raíz.
`,
  },
  {
    id: 'workflow-studio',
    title: 'Workflow Studio: flujos de trabajo jurídicos',
    category: 'modulos',
    description: 'Plantillas que encadenan búsqueda en el corpus y generación con IA, con progreso en vivo y verificación de fuentes.',
    keywords: ['workflow', 'workflows', 'studio', 'flujo', 'plantilla', 'automatización', 'sse'],
    icon: '⚙️',
    body: `## Qué es

**Workflow Studio** (menú **Más → Workflows**) ejecuta flujos de trabajo jurídicos que encadenan varios pasos automáticos: típicamente una búsqueda en el corpus legal seguida de una generación con IA. En vez de pedir cosas sueltas al chat, eliges una plantilla y el motor corre los pasos por vos.

## Flujo

1. **Catálogo** — verás tarjetas de plantillas, cada una con su categoría (Investigación, Redacción, Litigación) y la cadena de pasos que ejecuta.
2. Elige una plantilla y se abre su formulario.
3. Escribe tu **entrada** en el campo de texto (el label y el placeholder te dicen qué espera esa plantilla). Mínimo 5 caracteres.
4. Click **Ejecutar workflow**.
5. El panel **Progreso** muestra cada paso en vivo (vía SSE): pendiente → corriendo → completado, con su duración y una vista previa.
6. Al terminar aparece el **Resultado** en una card verde, con botón **Copiar**.

## Verificación de fuentes

Apenas hay resultado, el sistema contrasta automáticamente las normas citadas contra el corpus:

- **Normas confirmadas en el corpus** — con link al PDF oficial.
- **Referencias a artículos** — chips ámbar que debes contrastar manualmente contra la norma.
- Un badge de **confianza** (alta / media / baja) resume la verificación.

La verificación no reemplaza tu revisión profesional: confirmá siempre el texto vigente en la fuente oficial.

## Historial

Bajo el catálogo está **Ejecuciones recientes** con las últimas 15 corridas, su estado, duración y cuándo se ejecutaron.
`,
  },
  {
    id: 'agente-tramites',
    title: 'Agente de Trámites',
    category: 'modulos',
    description: 'Autocompleta escritos tipo del foro ecuatoriano desde campos estructurados. El borrador siempre exige revisión del abogado.',
    keywords: ['trámites', 'tramites', 'escrito', 'foro', 'borrador', 'revisión', 'agente'],
    icon: '📄',
    body: `## Qué es

El **Agente de Trámites** (menú **Más → Trámites**) autocompleta escritos y trámites tipo del foro ecuatoriano a partir de campos estructurados. El ciclo es siempre el mismo:

\`catálogo → formulario → borrador + revisión obligatoria → aprobado\`

## Flujo

1. **Catálogo** — los trámites están agrupados por categoría. Cada tarjeta tiene un ícono, nombre y descripción.
2. Elige un trámite y llena el **formulario**: campos de texto y de área, los obligatorios marcados con \`*\`. Cada campo trae su placeholder y a veces una pista.
3. Click **Generar borrador**. El agente busca normativa aplicable y redacta el escrito (tarda algunos segundos).
4. Se abre la vista de **resultado**.

## Revisión obligatoria

El borrador **nace siempre como \`BORRADOR\`** (badge ámbar). Una banda ámbar te recuerda que es un texto generado por IA y **no debe presentarse sin la revisión de un abogado**.

- Editá el contenido directamente en el editor (también podés **Copiar** o **Descargar .txt**).
- **Normas verificadas contra el corpus** — lista las normas del corpus que se detectaron citadas, con link al PDF. Si está vacía, verificá los fundamentos de derecho a mano.
- **Guardar revisión** — guarda tus cambios manteniendo el estado borrador.
- **Aprobar trámite** — tras revisarlo, lo marca como \`APROBADO\` (badge verde). Pide confirmación. Podés seguir editándolo y re-aprobarlo.

## Historial

En el catálogo, **Trámites recientes** lista todo lo generado con su estado. Click para reabrir cualquiera.
`,
  },
  {
    id: 'analiticas-roi',
    title: 'Analíticas de ROI',
    category: 'modulos',
    description: 'Traduce tu actividad asistida por IA en tiempo ahorrado y, con tu tarifa horaria, en dinero.',
    keywords: ['roi', 'retorno', 'tiempo', 'ahorro', 'tarifa', 'valor', 'productividad'],
    icon: '📈',
    body: `## Qué es

**Analíticas de ROI** (menú **Más → ROI**) hace visible el retorno de Poweria Legal: cuánto tiempo te ahorró el trabajo asistido por IA y, con la tarifa que vos definas, cuánto vale ese tiempo en dinero.

## Los 3 indicadores principales

- **Tiempo ahorrado** — total de horas, con el número de actividades IA detrás.
- **Valor estimado** — el tiempo ahorrado multiplicado por tu tarifa horaria.
- **Tu tarifa por hora** — campo editable (default $35). Ajustala a tu realidad; el cálculo se actualiza solo y la tarifa se guarda en tu navegador.

## Desglose por actividad

Una sección detalla el ahorro estimado por cada tipo de tarea asistida por IA — consultas (🔎), conversaciones (💬), workflows (⚙️), trámites (📄) y documentos (📑) — con cuántas veces la usaste, los minutos estimados por uso y una barra comparativa.

## Tendencia mensual

Un gráfico de barras muestra el tiempo ahorrado en los **últimos 6 meses**.

## Notas

- Si todavía no usaste funciones de IA, el panel te invita a empezar — no hay nada para medir aún.
- Las estimaciones de tiempo son **referenciales**: reflejan cuánto tomaría cada tarea sin IA. El valor en dinero usa siempre la tarifa que vos elegís.
`,
  },
  {
    id: 'traductor-juridico',
    title: 'Traductor Jurídico bilingüe',
    category: 'modulos',
    description: 'Traducción legal español ⇄ inglés que preserva el sentido jurídico, con glosario de términos.',
    keywords: ['traductor', 'traducción', 'inglés', 'español', 'bilingüe', 'glosario'],
    icon: '🌐',
    body: `## Qué es

El **Traductor Jurídico** (menú **Más → Traductor**) traduce texto legal **español ⇄ inglés** preservando el sentido jurídico. Es la pieza del modo bilingüe, pensada para el abogado que atiende clientes hispanos en EE.UU.

## Cómo usarlo

1. En la barra de controles ves la dirección (ej. **Español → Inglés**). El botón de doble flecha **invierte la dirección**.
2. Elige el **Tipo de documento** en el select — da contexto a la traducción.
3. Pegá el texto en el panel izquierdo (**original**).
4. Click **Traducir**. El panel derecho muestra la **traducción**, con botón **Copiar**.

## Glosario de términos

Si la traducción usó equivalencias jurídicas, aparece una tabla **Glosario de términos jurídicos** con el término en cada idioma y una nota de contexto. Verificá que cada equivalencia se ajuste a tu caso.

## Historial

**Traducciones recientes** guarda tus últimas 20 traducciones; click en cualquiera para recargarla.

## Importante

La traducción asistida por IA es un **borrador de trabajo**. Para presentaciones oficiales puede requerirse una **traducción certificada**.
`,
  },
  {
    id: 'formularios-inmigracion',
    title: 'Agente de Formularios de Inmigración (USCIS)',
    category: 'modulos',
    description: 'Arma paquetes de preparación de formularios USCIS: borrador, lista de documentos y guía de presentación.',
    keywords: ['inmigración', 'inmigracion', 'uscis', 'i-130', 'i-485', 'n-400', 'formulario', 'visa'],
    icon: '🛂',
    body: `## Qué es

El **Agente de Formularios de Inmigración** (menú **Más → Inmigración**) arma un paquete de preparación para un formulario **USCIS** (I-130, I-485, N-400, etc.) a partir de los datos del cliente.

Cada paquete reúne tres entregables:

1. **Borrador del formulario**.
2. **Lista de documentos de respaldo** (checklist).
3. **Guía de presentación**.

\`catálogo → admisión → paquete + revisión obligatoria → revisado\`

## Flujo

1. **Catálogo** — los formularios están agrupados por categoría, cada tarjeta con su código USCIS, nombre y descripción.
2. Elige un formulario y llena el **formulario de admisión**: el nombre del cliente (obligatorio) más los campos propios del trámite. Verás también una nota de tasas (\`feeNote\`).
3. Click **Generar paquete**. El agente arma el borrador, el checklist y la guía (tarda algunos segundos).
4. Se abre la vista del paquete.

## Revisión obligatoria

El paquete **nace siempre como \`BORRADOR\`**. Una banda ámbar lo deja claro: es un borrador generado por IA, **no asesoría legal**, y debe revisarlo un **abogado de inmigración con licencia en EE.UU.** Nada se presenta automáticamente ante USCIS.

- Editá el borrador en el editor; podés **Copiar** o **Descargar** el paquete completo en \`.txt\`.
- **Documentos de respaldo** — checklist marcable; los opcionales están etiquetados.
- **Guía de presentación** — instrucciones de envío.
- **Guardar revisión** mantiene el borrador; **Marcar como revisado** (pide confirmación de que un abogado con licencia lo revisó) lo pasa a estado \`REVISADO\`.

## Alcance

Es una herramienta de **preparación**, no de asesoría legal ni de presentación. La responsabilidad profesional es siempre del abogado.
`,
  },
  {
    id: 'integracion-telegram',
    title: 'Integración con Telegram',
    category: 'cuenta',
    description: 'Vinculá tu cuenta para recibir notificaciones y consultar al asistente jurídico desde Telegram.',
    keywords: ['telegram', 'bot', 'notificaciones', 'vincular', 'chat', 'asistente'],
    icon: '✈️',
    body: `## Qué es

Poweria Legal tiene un **bot de Telegram** que te permite, desde tu celular:

- 💬 Hacer **consultas jurídicas** de derecho ecuatoriano en lenguaje natural — el bot responde con base en el corpus legal.
- 🧭 Preguntar **cómo usar la app** — el bot conoce todos los módulos y te explica.
- 🔔 Recibir **notificaciones**: normas nuevas del corpus, novedades de tus casos, agenda/audiencias y tareas.

## Vincular tu cuenta

1. Andá a **Configuración → Telegram** (\`/dashboard/settings\`).
2. Tocá **Conectar Telegram**. Se abre el chat con el bot en otra pestaña.
3. En Telegram, tocá **«Iniciar» / «Start»** para confirmar.
4. La página de configuración se actualiza sola y muestra **Vinculado**.

El código de vinculación vale 15 minutos; si expira, generá uno nuevo.

## Elegir qué recibir

Una vez vinculado, en la misma tarjeta activás o desactivás cada tipo de aviso con un interruptor:

- 📚 Normas nuevas del corpus
- ⚖️ Novedades en casos
- 📅 Agenda y audiencias
- ✅ Tareas

## Comandos del bot

En el chat de Telegram: \`/funciones\` (qué hace la app), \`/ayuda\`, \`/estado\` (ver si estás vinculado), \`/vincular\`, \`/desvincular\`.

## Desvincular

Desde **Configuración → Telegram → Desvincular**, o enviando \`/desvincular\` al bot. Dejás de recibir notificaciones; podés volver a conectarte cuando quieras.
`,
  },
  {
    id: 'busqueda-agregar-caso',
    title: 'Buscador jurídico y "Agregar a mi caso"',
    category: 'casos',
    description: 'Busca normas en el corpus ecuatoriano y adjunta una norma a tu caso: descarga el PDF, lo vectoriza y lo suma al expediente.',
    keywords: ['búsqueda', 'buscador', 'corpus', 'norma', 'agregar', 'adjuntar', 'caso', 'pdf'],
    icon: '🔎',
    body: `## El buscador jurídico

Poweria Legal indexa un corpus de leyes y códigos ecuatorianos (cientos de normas vectorizadas). Podés buscarlas:

- Desde el **buscador de la app** (\`/search\`) — filtrá por tipo de documento (Constitución, Ley, Código, Reglamento, Jurisprudencia) y por jurisdicción.
- Desde la **Sala de Litigación**, pestaña *Buscar artículo* — citá "Art. 76 Constitución" o "234 COIP" y obtené el contenido al instante.
- La **búsqueda jurídica avanzada** permite filtrar por jerarquía normativa (Constitución, tratados, códigos orgánicos, leyes, reglamentos, resoluciones, ordenanzas) y por ámbito (nacional, intermedio, local, internacional).

## Agregar una norma a tu caso

Cuando encontrás una norma relevante, podés sumarla al expediente con **"Agregar a mi caso"**. El sistema:

1. **Descarga el PDF oficial** de la norma.
2. **Extrae y vectoriza** su texto en chunks.
3. Lo **adjunta como documento del caso** que elijas.

A partir de ahí esa norma forma parte del **cerebro del expediente**: el chat IA del caso, el generador de documentos y los análisis la tienen disponible como fuente.

## Diferencia con subir un documento

- *Subir documento* incorpora un archivo tuyo (evidencia, contrato, providencia).
- *Agregar a mi caso* trae una **norma del corpus** ya identificada — no subís nada, el sistema la descarga y la indexa por vos.

## Nota

Adjuntar una norma no toca el resto del expediente: es aditivo. Si la norma ya estaba en el caso, no se duplica.
`,
  },
  {
    id: 'sala-razonamiento',
    title: 'Fundamentación Jurídica Avanzada y Sala de Razonamiento',
    category: 'litigacion',
    description: 'Debatí tu tesis con la IA y guardá análisis que alimentan el cerebro del caso para mejores documentos.',
    keywords: ['fundamentación', 'razonamiento', 'sala', 'tesis', 'estrategia', 'deliberación', 'cerebro', 'análisis'],
    icon: '🧠',
    body: `## Fundamentación Jurídica Avanzada

En la página de detalle del caso, el panel **Fundamentación Jurídica Avanzada** lista todos los **análisis jurídicos guardados** del expediente. Cada análisis es un documento \`ai_analysis\` que ya forma parte del **cerebro del caso**: cuanto más analiza el abogado, mejores son los argumentos que la IA tiene para redactar documentos e informes.

Cada entrada muestra su origen: **IA** (ícono balanza, violeta) o **abogado** (ícono pluma, fucsia), con la norma y la fecha. Click en cualquiera para leer el análisis completo. El panel se actualiza solo cuando se guarda un análisis nuevo.

## Sala de Razonamiento Jurídico

Desde ese panel abrís la **Sala de Razonamiento Jurídico**: el espacio donde el abogado escribe su propio análisis y lo **debate con la IA**. La IA pone el planteamiento a prueba con argumentos jurídicos; si el abogado insiste, todo queda registrado y el resultado se incorpora al cerebro del caso como un documento fechado.

### Los 4 modos

- ⚖️ **Tesis del Caso** — sostené una posición jurídica; la IA la pone a prueba con la objeción más fuerte.
- ✍️ **Razonamiento del Abogado** — pensá en voz alta; la IA acompaña y afina tu razonamiento.
- 🎯 **Mesa de Estrategia** — evaluá una diligencia o decisión (pericia, investigación) con la IA.
- ⚔️ **Deliberación Jurídica** — debatí un punto controvertido; la IA hace de abogado del diablo.

### Flujo

1. **Elegí el modo** según lo que necesites.
2. **Debatí** — escribí tu planteamiento, la IA responde; podés ir y venir.
3. **Generá el documento** — la conversación se condensa en un documento editable.
4. **Agregalo al cerebro del caso** — queda guardado como análisis del expediente y aparece en la Fundamentación Jurídica Avanzada.

## Por qué importa

Cada análisis guardado mejora todo lo que la IA produce después en ese caso: un cerebro de expediente más rico significa demandas, alegatos e informes mejor fundados.
`,
  },
];
