/**
 * Convocatoria parser.
 *
 * The Event model already has a `notes` text field. We use it as a
 * lightweight structured store for hearing-convocation metadata so we
 * don't need a Prisma migration. Lines that start with a recognized tag
 * are interpreted; everything else stays as free-form note.
 *
 *   [FUENTE]   Providencia 0123-2026 del Juzgado de lo Civil — recibida 28 abr 2026
 *   [CODIGO]   123-456-789
 *   [SALA]     Sala 3 de Audiencias
 *   [PROVIDENCIA]  doc:abcd-1234
 *   [PROVEEDOR]    zoom
 *
 * The serializer keeps any free-form prose underneath. The protocol is
 * loose by design — round-trippable but tolerant of users editing the
 * notes by hand.
 */

export interface ConvocatoriaMeta {
  /** Human-readable origin: who issued the convocation, when, how. */
  source?: string;
  /** Meeting passcode/code provided by the issuer. */
  passcode?: string;
  /** Override for auto-detection (zoom/teams/meet/jitsi/webex/in_person/other). */
  provider?: string;
  /** Free-form prose left under the structured tags. */
  freeText?: string;
}

const TAGS: Array<[RegExp, keyof Omit<ConvocatoriaMeta, 'freeText'>]> = [
  [/^\[FUENTE\]\s*/i,        'source'],
  [/^\[CODIGO\]\s*/i,        'passcode'],
  [/^\[CÓDIGO\]\s*/i,        'passcode'],
  [/^\[PASSCODE\]\s*/i,      'passcode'],
  [/^\[CONTRASE[ÑN]A\]\s*/i, 'passcode'],
  [/^\[PROVEEDOR\]\s*/i,     'provider'],
  [/^\[PROVIDER\]\s*/i,      'provider'],
];

export function parseConvocatoria(notes: string | null | undefined): ConvocatoriaMeta {
  if (!notes) return {};
  const meta: ConvocatoriaMeta = {};
  const free: string[] = [];
  for (const raw of notes.split('\n')) {
    const line = raw.trim();
    if (!line) { free.push(''); continue; }
    let matched = false;
    for (const [re, key] of TAGS) {
      if (re.test(line)) {
        const value = line.replace(re, '').trim();
        if (value) (meta as any)[key] = value;
        matched = true;
        break;
      }
    }
    if (!matched) free.push(raw);
  }
  const freeText = free.join('\n').trim();
  if (freeText) meta.freeText = freeText;
  return meta;
}

/**
 * Round-trip: produce a notes string from structured + free text.
 * Tagged lines come first so they remain easy to locate.
 */
export function serializeConvocatoria(meta: ConvocatoriaMeta): string {
  const out: string[] = [];
  if (meta.source)   out.push(`[FUENTE] ${meta.source}`);
  if (meta.provider) out.push(`[PROVEEDOR] ${meta.provider}`);
  if (meta.passcode) out.push(`[CODIGO] ${meta.passcode}`);
  if (meta.freeText) {
    if (out.length > 0) out.push('');
    out.push(meta.freeText);
  }
  return out.join('\n');
}

/**
 * Best-effort inference of the meeting provider from the URL.
 * Returns one of the known slugs, or 'other'.
 */
export function detectProvider(meetingLink: string | null | undefined, fallback?: string | null): string {
  const explicit = (fallback || '').trim().toLowerCase();
  if (explicit) return explicit;
  if (!meetingLink) return 'other';
  const u = meetingLink.toLowerCase();
  if (u.includes('zoom.us') || u.includes('zoomgov.com')) return 'zoom';
  if (u.includes('teams.microsoft.com') || u.includes('teams.live.com')) return 'teams';
  if (u.includes('meet.google.com'))   return 'meet';
  if (u.includes('webex.com'))         return 'webex';
  if (u.includes('jitsi.'))            return 'jitsi';
  if (u.includes('whereby.'))          return 'whereby';
  if (u.includes('skype.'))            return 'skype';
  return 'other';
}

/** Pretty Spanish label for a provider slug (UI only). */
export function providerLabel(p: string | null | undefined): string {
  switch ((p || '').toLowerCase()) {
    case 'zoom':    return 'Zoom';
    case 'teams':   return 'Microsoft Teams';
    case 'meet':    return 'Google Meet';
    case 'webex':   return 'Cisco Webex';
    case 'jitsi':   return 'Jitsi Meet';
    case 'whereby': return 'Whereby';
    case 'skype':   return 'Skype';
    case 'in_person': return 'Presencial';
    case 'other':   return 'Videollamada';
    default:        return p ? p[0]?.toUpperCase() + p.slice(1) : 'Videollamada';
  }
}
