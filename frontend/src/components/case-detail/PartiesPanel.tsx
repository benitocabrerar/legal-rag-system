'use client';

/**
 * Panel de partes del caso:
 *   - Cliente(s) representado(s)
 *   - Perfil del abogado (compartido entre todos los casos)
 *   - Notificaciones oficiales (juzgados, fiscalías, contraparte)
 *
 * Botón "Auto-llenar con IA" lee los documentos del caso y extrae los datos.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Users, Briefcase, Mail, Sparkles, Plus, Pencil, Trash2, X,
  Check, ChevronDown, ChevronUp, Save, RefreshCw, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  fullName: string;
  identificationType?: string;
  identificationNumber?: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  occupation?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  employer?: string;
  notes?: string;
  role?: string;
  linkId?: string;
}

interface Notification {
  id: string;
  entityType: string;
  entityName: string;
  email?: string;
  additionalEmails?: string[];
  phone?: string;
  address?: string;
  referenceNumber?: string;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
}

interface LawyerProfile {
  fullName: string;
  identificationNumber?: string;
  barNumber?: string;
  lawFirm?: string;
  email?: string;
  mobile?: string;
}

interface Props {
  caseId: string;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  JUZGADO: '⚖️ Juzgado',
  FISCALIA: '🛡️ Fiscalía',
  CONTRALORIA: '🏛️ Contraloría',
  CONTRAPARTE: '👥 Contraparte',
  NOTARIA: '📜 Notaría',
  OTROS: '📋 Otros',
};

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: 'Cliente principal',
  CO_ACTOR: 'Co-actor',
  DEMANDADO: 'Demandado',
  TERCERO: 'Tercero',
};

export function PartiesPanel({ caseId }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingNotif, setEditingNotif] = useState<Notification | null>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, n, l] = await Promise.all([
        api.get(`/cases/${caseId}/clients`),
        api.get(`/cases/${caseId}/notifications`),
        api.get('/lawyer-profile'),
      ]);
      setClients(c.data.clients || []);
      setNotifications(n.data.notifications || []);
      setLawyer(l.data.profile);
    } catch (e) {
      console.error('Error loading parties:', e);
    } finally {
      setLoading(false);
    }
  };

  const extractWithAI = async () => {
    setExtracting(true);
    setExtractionResult(null);
    try {
      const r = await api.post(`/cases/${caseId}/extract-client-data`, {});
      setExtractionResult(r.data.extracted);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al extraer datos con IA');
    } finally {
      setExtracting(false);
    }
  };

  const acceptExtractedClient = async (extracted: any) => {
    try {
      // 1. Crear cliente
      const c = await api.post('/clients', {
        fullName: extracted.fullName,
        identificationType: extracted.identificationType,
        identificationNumber: extracted.identificationNumber,
        birthDate: extracted.birthDate,
        gender: extracted.gender,
        nationality: extracted.nationality,
        maritalStatus: extracted.maritalStatus,
        occupation: extracted.occupation,
        address: extracted.address,
        city: extracted.city,
        province: extracted.province,
        phone: extracted.phone,
        mobile: extracted.mobile,
        email: extracted.email,
        employer: extracted.employer,
      });
      // 2. Vincular al caso
      await api.post(`/cases/${caseId}/clients/${c.data.client.id}`, {
        role: extracted.role || 'PRINCIPAL',
      });
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar cliente');
    }
  };

  const acceptExtractedNotif = async (extracted: any) => {
    try {
      await api.post(`/cases/${caseId}/notifications`, extracted);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar notificación');
    }
  };

  const removeClientLink = async (clientId: string) => {
    if (!confirm('¿Quitar este cliente del caso? El cliente queda en tu lista global.')) return;
    await api.delete(`/cases/${caseId}/clients/${clientId}`);
    await loadAll();
  };

  const removeNotif = async (notifId: string) => {
    if (!confirm('¿Eliminar esta notificación?')) return;
    await api.delete(`/notifications/${notifId}`);
    await loadAll();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200"
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-gray-900">
            Partes y notificaciones del caso
          </h2>
          <span className="text-xs text-gray-500">
            · {clients.length} cliente{clients.length !== 1 ? 's' : ''}
            · {notifications.length} notificacion{notifications.length !== 1 ? 'es' : ''}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {!expanded ? null : (
        <div className="p-6 space-y-6">
          {/* AI Extraction Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Extracción automática con IA
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Lee los documentos cargados y extrae datos del cliente, juzgados, fiscalías, etc. Tú revisas y aceptas.
                  </p>
                </div>
              </div>
              <button
                onClick={extractWithAI}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Auto-llenar con IA
                  </>
                )}
              </button>
            </div>

            {/* Resultado de IA */}
            {extractionResult && (
              <div className="mt-4 space-y-3 pt-4 border-t border-emerald-200">
                {extractionResult.clients?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 mb-2">
                      🧑 Clientes detectados ({extractionResult.clients.length})
                    </p>
                    <div className="space-y-2">
                      {extractionResult.clients.map((c: any, i: number) => (
                        <div key={i} className="bg-white border border-emerald-200 rounded p-3 flex items-start justify-between gap-3">
                          <div className="text-sm flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{c.fullName || '(sin nombre)'}</p>
                            <p className="text-xs text-gray-600">
                              {c.identificationType} {c.identificationNumber && `· ${c.identificationNumber}`}
                              {c.role && ` · ${ROLE_LABELS[c.role] || c.role}`}
                            </p>
                            {c.address && <p className="text-xs text-gray-500 truncate">{c.address}</p>}
                          </div>
                          <button
                            onClick={() => acceptExtractedClient(c)}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3 inline mr-1" /> Aceptar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractionResult.notifications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 mb-2">
                      📬 Notificaciones detectadas ({extractionResult.notifications.length})
                    </p>
                    <div className="space-y-2">
                      {extractionResult.notifications.map((n: any, i: number) => (
                        <div key={i} className="bg-white border border-emerald-200 rounded p-3 flex items-start justify-between gap-3">
                          <div className="text-sm flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">
                              {ENTITY_TYPE_LABELS[n.entityType] || n.entityType} · {n.entityName}
                            </p>
                            {n.email && <p className="text-xs text-gray-600">📧 {n.email}</p>}
                            {n.referenceNumber && <p className="text-xs text-gray-500">Ref: {n.referenceNumber}</p>}
                          </div>
                          <button
                            onClick={() => acceptExtractedNotif(n)}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3 inline mr-1" /> Aceptar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Abogado responsable */}
          <section className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Abogado patrocinador</h3>
              </div>
              <Link
                href="/dashboard/settings/lawyer"
                className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                Editar perfil <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            {lawyer ? (
              <div className="text-sm text-gray-700 space-y-0.5">
                <p className="font-semibold">{lawyer.fullName}</p>
                {lawyer.barNumber && <p className="text-xs text-gray-600">Mat. profesional: {lawyer.barNumber}</p>}
                {lawyer.lawFirm && <p className="text-xs text-gray-600">{lawyer.lawFirm}</p>}
                <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
                  {lawyer.email && <span>📧 {lawyer.email}</span>}
                  {lawyer.mobile && <span>📱 {lawyer.mobile}</span>}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Aún no has configurado tu perfil profesional.{' '}
                <Link href="/dashboard/settings/lawyer" className="text-indigo-600 hover:underline">
                  Configurar ahora
                </Link>
              </div>
            )}
          </section>

          {/* Clientes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Clientes / Partes representadas ({clients.length})
              </h3>
              <button
                onClick={() => setEditingClient({ fullName: '', id: 'NEW' } as any)}
                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar cliente
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : clients.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Sin clientes asociados. Usa "Auto-llenar con IA" o "Agregar cliente".
              </p>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => (
                  <div key={c.id} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{c.fullName}</p>
                          {c.role && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {ROLE_LABELS[c.role] || c.role}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          {c.identificationNumber && (
                            <p>{c.identificationType || 'CEDULA'}: <span className="font-mono">{c.identificationNumber}</span></p>
                          )}
                          {c.address && <p>📍 {c.address}{c.city && `, ${c.city}`}{c.province && `, ${c.province}`}</p>}
                          <div className="flex flex-wrap gap-3 text-gray-500">
                            {c.email && <span>📧 {c.email}</span>}
                            {c.mobile && <span>📱 {c.mobile}</span>}
                            {c.phone && <span>☎ {c.phone}</span>}
                          </div>
                          {c.occupation && <p className="text-gray-500">💼 {c.occupation}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingClient(c)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeClientLink(c.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                          title="Quitar del caso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notificaciones */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                Notificaciones oficiales ({notifications.length})
              </h3>
              <button
                onClick={() => setEditingNotif({ id: 'NEW', entityType: 'JUZGADO', entityName: '' } as any)}
                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar destinatario
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Sin destinatarios configurados. Aquí guardas correos de juzgados, fiscalías y contraparte para envíos oficiales.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {notifications.map((n) => (
                  <div key={n.id} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-indigo-700 mb-0.5">
                          {ENTITY_TYPE_LABELS[n.entityType] || n.entityType}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">{n.entityName}</p>
                        {n.email && (
                          <a
                            href={`mailto:${n.email}`}
                            className="text-xs text-indigo-600 hover:underline block mt-0.5"
                          >
                            📧 {n.email}
                          </a>
                        )}
                        {n.additionalEmails && n.additionalEmails.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            CC: {n.additionalEmails.join(', ')}
                          </p>
                        )}
                        {n.referenceNumber && <p className="text-xs text-gray-500 mt-0.5">Ref: {n.referenceNumber}</p>}
                        {n.contactPerson && <p className="text-xs text-gray-500">{n.contactPerson}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => setEditingNotif(n)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeNotif(n.id)}
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal edición cliente */}
      {editingClient && (
        <ClientEditModal
          caseId={caseId}
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => {
            setEditingClient(null);
            loadAll();
          }}
        />
      )}

      {/* Modal edición notificación */}
      {editingNotif && (
        <NotificationEditModal
          caseId={caseId}
          notification={editingNotif}
          onClose={() => setEditingNotif(null)}
          onSaved={() => {
            setEditingNotif(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// MODAL EDICIÓN DE CLIENTE
// ===========================================================================
function ClientEditModal({
  caseId, client, onClose, onSaved,
}: {
  caseId: string; client: Client; onClose: () => void; onSaved: () => void;
}) {
  const isNew = client.id === 'NEW';
  const [data, setData] = useState<Client>({
    ...client,
    identificationType: client.identificationType || 'CEDULA',
    nationality: client.nationality || 'Ecuatoriana',
    country: client.country || 'Ecuador',
  });
  const [role, setRole] = useState(client.role || 'PRINCIPAL');
  const [saving, setSaving] = useState(false);

  const fld = (k: keyof Client) => ({
    value: (data as any)[k] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setData({ ...data, [k]: e.target.value || null }),
  });

  const save = async () => {
    if (!data.fullName) return alert('Nombre completo es obligatorio');
    setSaving(true);
    try {
      let clientId = data.id;
      if (isNew) {
        const r = await api.post('/clients', data);
        clientId = r.data.client.id;
      } else {
        await api.patch(`/clients/${clientId}`, data);
      }
      // Vincular o re-vincular al caso
      await api.post(`/cases/${caseId}/clients/${clientId}`, { role });
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold">{isNew ? 'Nuevo cliente' : 'Editar cliente'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-auto p-6 space-y-4">
          <Input label="Nombre completo *" {...fld('fullName')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo de identificación" {...fld('identificationType')} options={[['CEDULA','Cédula'],['RUC','RUC'],['PASAPORTE','Pasaporte']]} />
            <Input label="Número" {...fld('identificationNumber')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Rol en este caso" value={role} onChange={(e: any) => setRole(e.target.value)} options={[['PRINCIPAL','Cliente principal'],['CO_ACTOR','Co-actor'],['DEMANDADO','Demandado'],['TERCERO','Tercero']]} />
            <Input label="Nacionalidad" {...fld('nationality')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Fecha nacimiento" type="date" {...fld('birthDate')} />
            <Select label="Género" {...fld('gender')} options={[['','—'],['Masculino','Masculino'],['Femenino','Femenino'],['Otro','Otro']]} />
            <Select label="Estado civil" {...fld('maritalStatus')} options={[['','—'],['Soltero/a','Soltero/a'],['Casado/a','Casado/a'],['Divorciado/a','Divorciado/a'],['Viudo/a','Viudo/a'],['Unión de hecho','Unión de hecho']]} />
          </div>
          <Input label="Profesión / Ocupación" {...fld('occupation')} />
          <Input label="Dirección" {...fld('address')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Ciudad" {...fld('city')} />
            <Input label="Provincia" {...fld('province')} />
            <Input label="País" {...fld('country')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Teléfono" {...fld('phone')} />
            <Input label="Celular" {...fld('mobile')} />
            <Input label="Email" type="email" {...fld('email')} />
          </div>
          <Input label="Empleador" {...fld('employer')} />
          <Textarea label="Notas" {...fld('notes')} />
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// MODAL NOTIFICACIÓN
// ===========================================================================
function NotificationEditModal({
  caseId, notification, onClose, onSaved,
}: {
  caseId: string; notification: Notification; onClose: () => void; onSaved: () => void;
}) {
  const isNew = notification.id === 'NEW';
  const [data, setData] = useState<Notification>(notification);
  const [saving, setSaving] = useState(false);

  const fld = (k: keyof Notification) => ({
    value: (data as any)[k] || '',
    onChange: (e: any) => setData({ ...data, [k]: e.target.value || null } as any),
  });

  const save = async () => {
    if (!data.entityName) return alert('Nombre de la entidad es obligatorio');
    setSaving(true);
    try {
      const payload: any = { ...data };
      if (isNew) {
        await api.post(`/cases/${caseId}/notifications`, payload);
      } else {
        await api.patch(`/notifications/${data.id}`, payload);
      }
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold">{isNew ? 'Nueva notificación' : 'Editar notificación'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-auto p-6 space-y-4">
          <Select
            label="Tipo de entidad"
            {...fld('entityType')}
            options={[
              ['JUZGADO', '⚖️ Juzgado'],
              ['FISCALIA', '🛡️ Fiscalía'],
              ['CONTRALORIA', '🏛️ Contraloría'],
              ['CONTRAPARTE', '👥 Contraparte'],
              ['NOTARIA', '📜 Notaría'],
              ['OTROS', '📋 Otros'],
            ]}
          />
          <Input label="Nombre de la entidad *" placeholder="Ej: Tribunal de Garantías Penales con sede en Quito" {...fld('entityName')} />
          <Input label="Email principal" type="email" {...fld('email')} />
          <Input label="Persona de contacto" placeholder="Ej: Dr. Roberto Andrade (Juez)" {...fld('contactPerson')} />
          <Input label="Número de referencia/proceso" {...fld('referenceNumber')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" {...fld('phone')} />
            <Input label="Dirección" {...fld('address')} />
          </div>
          <Textarea label="Notas" {...fld('notes')} />
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// HELPERS UI
// ===========================================================================
function Input({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <input
        {...props}
        className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </label>
  );
}

function Textarea({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <textarea
        {...props}
        rows={3}
        className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
      />
    </label>
  );
}

function Select({ label, options, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select
        {...props}
        className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      >
        {options.map(([v, lbl]: [string, string]) => (
          <option key={v} value={v}>{lbl}</option>
        ))}
      </select>
    </label>
  );
}
