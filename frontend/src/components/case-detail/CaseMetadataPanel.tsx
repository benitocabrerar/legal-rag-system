'use client';

/**
 * Panel "Datos del caso" — campos jurídicos completos editables.
 * Botón "Auto-llenar con IA" extrae info de los documentos del caso.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  Scale, Sparkles, Save, RefreshCw, ChevronDown, ChevronUp, Check, X,
  CalendarClock, Building2, Briefcase, FileText, Hash, MapPin,
} from 'lucide-react';

interface CaseData {
  id: string;
  title?: string;
  description?: string;
  clientName?: string;
  caseNumber?: string;
  status?: string;
  legalMatter?: string;
  actionType?: string;
  jurisdiction?: string;
  judicialProcessNumber?: string;
  courtName?: string;
  courtUnit?: string;
  judgeName?: string;
  prosecutorName?: string;
  opposingParty?: string;
  relatedLaws?: string[];
  amountClaimed?: number | null;
  currency?: string;
  filedAt?: string;
  nextHearingAt?: string;
  proceduralStage?: string;
  keyDates?: Array<{ label: string; date: string; description?: string }>;
  factsSummary?: string;
}

interface Props {
  caseId: string;
  onUpdated?: (data: CaseData) => void;
}

const LEGAL_MATTERS = [
  'Penal','Civil','Laboral','Tributario','Constitucional','Administrativo',
  'Familia','Niñez y Adolescencia','Tránsito','Mercantil','Otro',
];

const ACTION_TYPES = [
  'Demanda','Denuncia','Querella','Acción de protección','Hábeas corpus',
  'Hábeas data','Acción extraordinaria de protección','Recurso de apelación',
  'Recurso de casación','Reclamo administrativo','Otro',
];

export function CaseMetadataPanel({ caseId, onUpdated }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [data, setData] = useState<CaseData | null>(null);
  const [original, setOriginal] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<CaseData | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/cases/${caseId}`);
      const c = r.data.case;
      setData(c);
      setOriginal(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const dirty = data && original && JSON.stringify(data) !== JSON.stringify(original);

  const setField = (k: keyof CaseData, v: any) => {
    if (!data) return;
    setData({ ...data, [k]: v === '' ? null : v });
  };

  const setRelatedLaws = (text: string) => {
    if (!data) return;
    const arr = text.split(',').map((s) => s.trim()).filter(Boolean);
    setData({ ...data, relatedLaws: arr });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setSuccess('');
    try {
      const payload: any = { ...data };
      delete payload.id;
      // amount como number; '' → null
      if (typeof payload.amountClaimed === 'string') {
        payload.amountClaimed = payload.amountClaimed ? Number(payload.amountClaimed) : null;
      }
      // dates: convertir ISO completo a YYYY-MM-DD para filed_at
      if (payload.filedAt && payload.filedAt.length > 10) {
        payload.filedAt = payload.filedAt.slice(0, 10);
      }
      const r = await api.patch(`/cases/${caseId}`, payload);
      const updated = r.data.case;
      setData(updated);
      setOriginal(updated);
      setSuccess('Datos guardados');
      onUpdated?.(updated);
      setTimeout(() => setSuccess(''), 2500);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const extractWithAI = async () => {
    setExtracting(true);
    setExtracted(null);
    try {
      const r = await api.post(`/cases/${caseId}/extract-case-data`, {});
      // Mapear claves snake → camel para el front
      const ex = r.data.extracted || {};
      setExtracted({
        id: caseId,
        title: ex.title,
        clientName: ex.clientName,
        caseNumber: ex.caseNumber,
        legalMatter: ex.legal_matter,
        actionType: ex.action_type,
        jurisdiction: ex.jurisdiction,
        judicialProcessNumber: ex.judicial_process_number,
        courtName: ex.court_name,
        courtUnit: ex.court_unit,
        judgeName: ex.judge_name,
        prosecutorName: ex.prosecutor_name,
        opposingParty: ex.opposing_party,
        relatedLaws: ex.related_laws,
        amountClaimed: ex.amount_claimed,
        currency: ex.currency,
        filedAt: ex.filed_at,
        proceduralStage: ex.procedural_stage,
        keyDates: ex.key_dates,
        factsSummary: ex.facts_summary,
        status: ex.status,
      });
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al extraer datos');
    } finally {
      setExtracting(false);
    }
  };

  const applyExtracted = (mode: 'all' | 'empty-only') => {
    if (!data || !extracted) return;
    const next = { ...data };
    for (const k of Object.keys(extracted) as Array<keyof CaseData>) {
      if (k === 'id') continue;
      const exV = extracted[k] as any;
      if (exV === undefined || exV === null || exV === '') continue;
      if (mode === 'empty-only') {
        const cur = (next as any)[k];
        if (cur && (Array.isArray(cur) ? cur.length > 0 : true)) continue;
      }
      (next as any)[k] = exV;
    }
    setData(next);
    setExtracted(null);
  };

  if (loading || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-500">
        {t('cases.loadingCase')}
      </div>
    );
  }

  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_24px_-8px_rgba(15,23,42,0.08)] mb-6 overflow-hidden">
      {/* Accent ribbon */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-700" />

      {/* Header — minimalista, refinado, con quick stats */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-7 py-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border-b border-slate-200/70 group"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Icon orb */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl blur opacity-25" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 grid place-items-center text-white shadow-md">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 tracking-tight">{t('cases.caseDataTitle')}</h2>
              {data.legalMatter && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold uppercase tracking-wider">
                  {data.legalMatter}
                </span>
              )}
              {dirty && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                  Sin guardar
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              {data.clientName && <span className="font-medium text-slate-700">{data.clientName}</span>}
              {data.judicialProcessNumber && (
                <>
                  {data.clientName && <span className="text-slate-300">·</span>}
                  <span className="font-mono">N° {data.judicialProcessNumber}</span>
                </>
              )}
              {data.proceduralStage && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="italic">{data.proceduralStage}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-slate-400 group-hover:text-slate-700 transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {!expanded ? null : (
        <div className="px-7 py-6 space-y-6 bg-gradient-to-b from-white to-slate-50/30">
          {/* AI Extraction Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {t('cases.autoFillAI')}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {t('cases.autoFillAIDesc')}
                  </p>
                </div>
              </div>
              <button
                onClick={extractWithAI}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {extracting ? t('cases.analyzing') : t('cases.autoFillAI')}
              </button>
            </div>

            {extracted && (
              <div className="mt-4 pt-3 border-t border-emerald-200 bg-white rounded p-3">
                <div className="text-xs font-semibold text-emerald-900 mb-2">
                  {t('cases.aiProposed')}
                </div>
                <ExtractedPreview ex={extracted} />
                <div className="flex gap-2 mt-3 pt-2 border-t border-emerald-100">
                  <button
                    onClick={() => applyExtracted('empty-only')}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700"
                  >
                    <Check className="w-3 h-3 inline mr-1" /> {t('cases.fillEmptyOnly')}
                  </button>
                  <button
                    onClick={() => applyExtracted('all')}
                    className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800"
                  >
                    <Check className="w-3 h-3 inline mr-1" /> {t('cases.overwriteAll')}
                  </button>
                  <button
                    onClick={() => setExtracted(null)}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50"
                  >
                    {t('cases.discard')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Identificación */}
          <Section icon={<FileText className="w-4 h-4" />} title={t('cases.identification')}>
            <Input label={t('cases.caseTitle')} value={data.title} onChange={(v) => setField('title', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('cases.principalClient')} value={data.clientName} onChange={(v) => setField('clientName', v)} />
              <Input label={t('cases.internalCaseNumber')} value={data.caseNumber} onChange={(v) => setField('caseNumber', v)} />
            </div>
          </Section>

          {/* Materia y acción */}
          <Section icon={<Scale className="w-4 h-4" />} title={t('cases.matterAndActionType')}>
            <div className="grid grid-cols-2 gap-3">
              <Select label={t('cases.legalMatter')} value={data.legalMatter} onChange={(v) => setField('legalMatter', v)}
                options={[['','—'], ...LEGAL_MATTERS.map(m => [m, m])] as any} />
              <Select label={t('cases.actionType')} value={data.actionType} onChange={(v) => setField('actionType', v)}
                options={[['','—'], ...ACTION_TYPES.map(m => [m, m])] as any} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('cases.jurisdiction')} value={data.jurisdiction} onChange={(v) => setField('jurisdiction', v)} placeholder="Ej: Pichincha" />
              <Input label={t('cases.proceduralStage')} value={data.proceduralStage} onChange={(v) => setField('proceduralStage', v)} placeholder="Ej: Instrucción Fiscal" />
            </div>
          </Section>

          {/* Identificación judicial */}
          <Section icon={<Hash className="w-4 h-4" />} title={t('cases.judicialIdentification')}>
            <Input label={t('cases.judicialProcessNumber')} value={data.judicialProcessNumber} onChange={(v) => setField('judicialProcessNumber', v)} placeholder="Ej: 17282-2026-0001G" />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('cases.courtName')} value={data.courtName} onChange={(v) => setField('courtName', v)} />
              <Input label={t('cases.courtUnit')} value={data.courtUnit} onChange={(v) => setField('courtUnit', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('cases.judge')} value={data.judgeName} onChange={(v) => setField('judgeName', v)} />
              <Input label={t('cases.prosecutor')} value={data.prosecutorName} onChange={(v) => setField('prosecutorName', v)} />
            </div>
            <Input label={t('cases.opposingParty')} value={data.opposingParty} onChange={(v) => setField('opposingParty', v)} />
          </Section>

          {/* Cuantía y fechas */}
          <Section icon={<CalendarClock className="w-4 h-4" />} title={t('cases.amountAndDates')}>
            <div className="grid grid-cols-3 gap-3">
              <Input label={t('cases.claimAmount')} type="number" value={data.amountClaimed ?? ''} onChange={(v) => setField('amountClaimed', v === '' ? null : Number(v))} />
              <Select label={t('cases.currency')} value={data.currency || 'USD'} onChange={(v) => setField('currency', v)}
                options={[['USD','USD'],['EUR','EUR']] as any} />
              <Input label={t('cases.filedDate')} type="date" value={data.filedAt?.slice(0,10)} onChange={(v) => setField('filedAt', v)} />
            </div>
            <Input label={t('cases.nextHearing')} type="datetime-local" value={data.nextHearingAt?.slice(0,16)} onChange={(v) => setField('nextHearingAt', v)} />
          </Section>

          {/* Normas relacionadas */}
          <Section icon={<Briefcase className="w-4 h-4" />} title={t('cases.applicableLaws')}>
            <Input
              label={t('cases.lawsArticles')}
              value={(data.relatedLaws || []).join(', ')}
              onChange={(v) => setRelatedLaws(v)}
              placeholder="Ej: Art. 278 COIP, Art. 76.4 CRE, Art. 188 CT"
            />
            {data.relatedLaws && data.relatedLaws.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.relatedLaws.map((law, i) => (
                  <span
                    key={i}
                    className="
                      inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1
                      bg-gradient-to-br from-blue-50 to-indigo-50
                      text-blue-800 border border-blue-200/60 rounded-md
                      shadow-sm hover:shadow transition-shadow
                    "
                  >
                    <Briefcase className="w-3 h-3 opacity-60" />
                    {law}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Hechos */}
          <Section icon={<FileText className="w-4 h-4" />} title={t('cases.factsSummary')}>
            <Textarea value={data.factsSummary} onChange={(v) => setField('factsSummary', v)} placeholder={t('cases.factsPlaceholder')} />
          </Section>

          {/* Save bar — sticky cuando hay cambios */}
          <div className={`
            sticky bottom-0 -mx-7 -mb-6 px-7 py-4 backdrop-blur-md border-t transition-all
            ${dirty
              ? 'bg-gradient-to-r from-slate-900/95 to-slate-800/95 border-slate-700 text-white shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.25)]'
              : 'bg-white/80 border-slate-200/70'}
          `}>
            <div className="flex items-center justify-between">
              <div className={`text-xs ${dirty ? 'text-amber-300 font-semibold' : 'text-slate-500'} flex items-center gap-2`}>
                {dirty ? (
                  <>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    </span>
                    Hay cambios sin guardar
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Sin cambios pendientes
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {success && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                    <Check className="w-3 h-3" /> {success}
                  </span>
                )}
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className={`
                    inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all
                    ${dirty
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  {saving
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="relative pl-4">
      {/* Línea decorativa lateral */}
      <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-100 to-transparent rounded-full" />
      <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.12em] flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 ring-1 ring-slate-200/70">
          {icon}
        </span>
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

interface InputProps {
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}
function Input({ label, value, onChange, type = 'text', placeholder = '' }: InputProps) {
  return (
    <label className="block group">
      <span className="text-[11px] font-semibold text-slate-600 tracking-wide">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="
          mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900
          placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500
          hover:border-slate-300
          transition-all
          shadow-sm
        "
      />
    </label>
  );
}

interface TextareaProps {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}
function Textarea({ label, value, onChange, placeholder = '' }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="text-[11px] font-semibold text-slate-600 tracking-wide">{label}</span>}
      <textarea
        rows={4}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="
          mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900
          placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500
          hover:border-slate-300
          transition-all shadow-sm resize-none
        "
      />
    </label>
  );
}

interface SelectProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}
function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-600 tracking-wide">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="
          mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500
          hover:border-slate-300
          transition-all shadow-sm
        "
      >
        {options.map(([v, lbl]: [string, string]) => (
          <option key={v} value={v}>{lbl}</option>
        ))}
      </select>
    </label>
  );
}

function ExtractedPreview({ ex }: { ex: CaseData }) {
  const items: Array<[string, any]> = [
    ['Título', ex.title],
    ['Materia', ex.legalMatter],
    ['Tipo de acción', ex.actionType],
    ['Jurisdicción', ex.jurisdiction],
    ['N° proceso', ex.judicialProcessNumber],
    ['Tribunal', ex.courtName],
    ['Juez', ex.judgeName],
    ['Fiscal', ex.prosecutorName],
    ['Parte contraria', ex.opposingParty],
    ['Etapa procesal', ex.proceduralStage],
    ['Cuantía', ex.amountClaimed],
    ['Fecha presentación', ex.filedAt],
    ['Normas', (ex.relatedLaws || []).join(', ')],
  ];
  return (
    <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {items
        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => (
          <div key={k} className="flex gap-2 py-0.5">
            <dt className="font-semibold text-gray-600 min-w-[120px]">{k}:</dt>
            <dd className="text-gray-900">{String(v)}</dd>
          </div>
        ))}
      {ex.factsSummary && (
        <div className="sm:col-span-2 mt-1 pt-1 border-t border-emerald-100">
          <dt className="font-semibold text-gray-600 mb-0.5">Hechos:</dt>
          <dd className="text-gray-900">{ex.factsSummary}</dd>
        </div>
      )}
    </dl>
  );
}
