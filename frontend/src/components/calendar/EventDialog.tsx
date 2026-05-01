'use client';

import { useState, useEffect, useRef } from 'react';
import { Event, EventType, CreateEventData } from '@/types/calendar';
import { X, FileText, KeyRound, Video, UploadCloud, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventsExtractAPI } from '@/lib/api';

/** Lightweight in-frontend version of src/lib/convocatoria.ts (the protocol). */
const TAG_PATTERNS: Array<[RegExp, 'source' | 'passcode' | 'provider']> = [
  [/^\[FUENTE\]\s*/i,        'source'],
  [/^\[CODIGO\]\s*/i,        'passcode'],
  [/^\[CÓDIGO\]\s*/i,        'passcode'],
  [/^\[PASSCODE\]\s*/i,      'passcode'],
  [/^\[CONTRASE[ÑN]A\]\s*/i, 'passcode'],
  [/^\[PROVEEDOR\]\s*/i,     'provider'],
  [/^\[PROVIDER\]\s*/i,      'provider'],
];

function parseNotes(notes: string) {
  const out = { source: '', passcode: '', provider: '', free: [] as string[] };
  for (const raw of (notes || '').split('\n')) {
    const line = raw.trim();
    if (!line) { out.free.push(''); continue; }
    let matched = false;
    for (const [re, key] of TAG_PATTERNS) {
      if (re.test(line)) {
        const value = line.replace(re, '').trim();
        if (value) (out as any)[key] = value;
        matched = true; break;
      }
    }
    if (!matched) out.free.push(raw);
  }
  return { ...out, free: out.free.join('\n').trim() };
}

function buildNotes(meta: { source: string; passcode: string; provider: string; free: string }): string {
  const lines: string[] = [];
  if (meta.source.trim())   lines.push(`[FUENTE] ${meta.source.trim()}`);
  if (meta.provider.trim()) lines.push(`[PROVEEDOR] ${meta.provider.trim()}`);
  if (meta.passcode.trim()) lines.push(`[CODIGO] ${meta.passcode.trim()}`);
  if (meta.free.trim()) {
    if (lines.length > 0) lines.push('');
    lines.push(meta.free.trim());
  }
  return lines.join('\n');
}

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEventData) => Promise<void>;
  event?: Event | null;
  defaultDate?: Date;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'MEETING', label: 'Reunión' },
  { value: 'HEARING', label: 'Audiencia' },
  { value: 'DEADLINE', label: 'Fecha límite' },
  { value: 'CONSULTATION', label: 'Consulta' },
  { value: 'COURT_DATE', label: 'Fecha de corte' },
  { value: 'DOCUMENT_FILING', label: 'Presentación de documentos' },
  { value: 'MEDIATION', label: 'Mediación' },
  { value: 'DEPOSITION', label: 'Deposición' },
  { value: 'OTHER', label: 'Otro' },
];

export function EventDialog({ isOpen, onClose, onSave, event, defaultDate }: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateEventData>({
    title: '',
    description: '',
    type: 'MEETING',
    startTime: '',
    endTime: '',
    location: '',
    meetingLink: '',
    allDay: false,
    timezone: 'America/Guayaquil',
    notes: '',
  });
  const [convocatoria, setConvocatoria] = useState({
    source: '', passcode: '', provider: '', free: '',
  });
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractStatus, setExtractStatus] = useState<{ filename: string; confidence: number; warnings: string[] } | null>(null);
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const applyExtraction = async (file: File) => {
    setExtractError('');
    setExtracting(true);
    setExtractStatus(null);
    try {
      const result = await eventsExtractAPI.fromProvidencia(file);
      const ev = result.event;
      const filled = new Set<string>();
      const next = { ...formData };
      if (ev.title) { next.title = ev.title; filled.add('title'); }
      if (ev.type)  { next.type = ev.type as EventType; filled.add('type'); }
      if (ev.startTime) { next.startTime = ev.startTime.slice(0, 16); filled.add('startTime'); }
      if (ev.endTime)   { next.endTime   = ev.endTime.slice(0, 16);   filled.add('endTime'); }
      if (ev.location)    { next.location = ev.location; filled.add('location'); }
      if (ev.meetingLink) { next.meetingLink = ev.meetingLink; filled.add('meetingLink'); }
      if (ev.description) { next.description = ev.description; filled.add('description'); }
      setFormData(next);

      const conv = { ...convocatoria };
      if (ev.source)   { conv.source = ev.source; filled.add('source'); }
      if (ev.meetingPasscode) { conv.passcode = ev.meetingPasscode; filled.add('passcode'); }
      if (ev.meetingProvider) { conv.provider = ev.meetingProvider; filled.add('provider'); }
      setConvocatoria(conv);

      setExtractStatus({ filename: result.filename, confidence: ev.confidence, warnings: ev.warnings ?? [] });
      setExtractedFields(filled);
    } catch (err: any) {
      setExtractError(err?.response?.data?.message ?? 'No pude procesar el documento.');
    } finally {
      setExtracting(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyExtraction(f);
    e.target.value = '';
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyExtraction(f);
  };

  const filledChip = (key: string) =>
    extractedFields.has(key)
      ? <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-violet-700 bg-violet-100 border border-violet-200 rounded-full px-1.5 py-0.5"><Sparkles className="w-2.5 h-2.5" />IA</span>
      : null;

  useEffect(() => {
    if (event) {
      const parsed = parseNotes(event.notes || '');
      setFormData({
        title: event.title,
        description: event.description || '',
        type: event.type,
        startTime: new Date(event.startTime).toISOString().slice(0, 16),
        endTime: new Date(event.endTime).toISOString().slice(0, 16),
        location: event.location || '',
        meetingLink: event.meetingLink || '',
        allDay: event.allDay,
        timezone: event.timezone,
        notes: event.notes || '',
      });
      setConvocatoria({
        source: parsed.source, passcode: parsed.passcode,
        provider: parsed.provider, free: parsed.free,
      });
    } else if (defaultDate) {
      const start = new Date(defaultDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(defaultDate);
      end.setHours(10, 0, 0, 0);

      setFormData((prev) => ({
        ...prev,
        startTime: start.toISOString().slice(0, 16),
        endTime: end.toISOString().slice(0, 16),
      }));
    }
  }, [event, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const composedNotes = buildNotes(convocatoria);
      await onSave({
        ...formData,
        notes: composedNotes,
        // Cast through unknown so we can pass a transient field that
        // doesn't break the typed API contract.
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {event ? 'Editar evento' : 'Nuevo evento'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* AI Providencia drop-zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  'rounded-xl border-2 border-dashed p-3 transition-colors cursor-pointer',
                  extracting
                    ? 'border-indigo-400 bg-indigo-50/40'
                    : dragOver
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-violet-300 bg-gradient-to-r from-violet-50 to-indigo-50 hover:border-violet-400',
                )}
                onClick={() => !extracting && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.tif,.tiff,.heic"
                  className="hidden"
                  onChange={onPickFile}
                />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow shadow-violet-500/30 shrink-0">
                    {extracting
                      ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                      : <UploadCloud className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-violet-900 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-violet-500" />
                      Autocompletar desde una providencia
                    </div>
                    {extracting ? (
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Leyendo el documento con IA…
                      </p>
                    ) : extractStatus ? (
                      <p className="text-[11px] text-violet-700 mt-0.5 truncate">
                        ✓ {extractStatus.filename} · confianza {Math.round(extractStatus.confidence * 100)}%
                      </p>
                    ) : (
                      <p className="text-[11px] text-violet-700 mt-0.5">
                        Arrastra un PDF / imagen / DOCX o haz click. La IA llenará los campos.
                      </p>
                    )}
                  </div>
                </div>
                {extractError && (
                  <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                    {extractError}
                  </div>
                )}
                {extractStatus?.warnings && extractStatus.warnings.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {extractStatus.warnings.map((w, i) => (
                      <div key={i} className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>{filledChip('title')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de evento <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha y hora de inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha y hora de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={formData.allDay}
                  onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700">
                  Evento de todo el día
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enlace de reunión{filledChip('meetingLink')}
                  </label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800">Convocatoria a la audiencia</span>
                  <span className="text-[10px] text-violet-500">— de dónde vino el enlace</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-violet-900 mb-1">
                    Fuente <span className="text-violet-500 font-normal">(providencia, oficio, correo del juez/fiscal…)</span>{filledChip('source')}
                  </label>
                  <textarea
                    rows={2}
                    value={convocatoria.source}
                    onChange={(e) => setConvocatoria((c) => ({ ...c, source: e.target.value }))}
                    placeholder="Providencia 0123-2026 del Juzgado de lo Civil — recibida por correo el 28 abr 2026"
                    className="w-full px-2.5 py-1.5 text-sm border border-violet-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-violet-900 mb-1 flex items-center gap-1">
                      <Video className="w-3 h-3" /> Proveedor{filledChip('provider')}
                    </label>
                    <select
                      value={convocatoria.provider}
                      onChange={(e) => setConvocatoria((c) => ({ ...c, provider: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-violet-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                    >
                      <option value="">Auto-detectar</option>
                      <option value="zoom">Zoom</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="meet">Google Meet</option>
                      <option value="webex">Cisco Webex</option>
                      <option value="jitsi">Jitsi</option>
                      <option value="whereby">Whereby</option>
                      <option value="skype">Skype</option>
                      <option value="in_person">Presencial</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-violet-900 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> Código / Contraseña{filledChip('passcode')}
                    </label>
                    <input
                      type="text"
                      value={convocatoria.passcode}
                      onChange={(e) => setConvocatoria((c) => ({ ...c, passcode: e.target.value }))}
                      placeholder="123-456-789"
                      className="w-full px-2.5 py-1.5 text-sm border border-violet-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales
                </label>
                <textarea
                  rows={2}
                  value={convocatoria.free}
                  onChange={(e) => setConvocatoria((c) => ({ ...c, free: e.target.value }))}
                  placeholder="Notas internas, recordatorios..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? 'Guardando...' : event ? 'Actualizar' : 'Crear evento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
