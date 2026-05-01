'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Briefcase, Save, ArrowLeft, Image as ImageIcon } from 'lucide-react';

interface LawyerProfile {
  fullName: string;
  identificationType?: string;
  identificationNumber?: string;
  barNumber?: string;
  lawFirm?: string;
  title?: string;
  specialization?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  officePhone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  bankAccount?: string;
  bankName?: string;
  signatureImageUrl?: string;
  letterheadImageUrl?: string;
  notes?: string;
}

export default function LawyerSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<LawyerProfile>({
    fullName: '',
    identificationType: 'CEDULA',
    title: 'Abogado',
    country: 'Ecuador',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/lawyer-profile')
      .then((r) => {
        if (r.data.profile) setData(r.data.profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fld = (k: keyof LawyerProfile) => ({
    value: (data as any)[k] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setData({ ...data, [k]: e.target.value || null } as any),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.fullName) return alert('Nombre completo es obligatorio');
    setSaving(true);
    setSuccess('');
    try {
      const r = await api.put('/lawyer-profile', data);
      setData(r.data.profile);
      setSuccess('Perfil guardado. Estos datos se incluirán automáticamente en todos tus escritos.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Configuración
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Perfil del Abogado Patrocinador</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Estos datos se usarán en escritos, autorizaciones, encabezados y notificaciones de todos tus casos.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={save}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6"
      >
        <Section title="Identificación profesional">
          <Input label="Nombre completo *" {...fld('fullName')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo de identificación" {...fld('identificationType')} options={[['CEDULA','Cédula'],['RUC','RUC'],['PASAPORTE','Pasaporte']]} />
            <Input label="Número" {...fld('identificationNumber')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Matrícula profesional / Foro" {...fld('barNumber')} />
            <Input label="Título profesional" placeholder="Ej: Abogado, Doctor en Jurisprudencia" {...fld('title')} />
          </div>
          <Input label="Estudio jurídico / Despacho" placeholder="Ej: Estudio Jurídico Cabrera & Asociados" {...fld('lawFirm')} />
          <Input label="Especialización" placeholder="Ej: Penal, Civil, Tributario" {...fld('specialization')} />
        </Section>

        <Section title="Dirección de oficina">
          <Input label="Dirección" {...fld('address')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Ciudad" {...fld('city')} />
            <Input label="Provincia" {...fld('province')} />
            <Input label="País" {...fld('country')} />
          </div>
        </Section>

        <Section title="Contacto">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono oficina" {...fld('officePhone')} />
            <Input label="Celular" {...fld('mobile')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email profesional" type="email" {...fld('email')} />
            <Input label="Sitio web" type="url" {...fld('website')} />
          </div>
        </Section>

        <Section title="Datos bancarios (opcional, para facturación)">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Banco" {...fld('bankName')} />
            <Input label="Número de cuenta" {...fld('bankAccount')} />
          </div>
        </Section>

        <Section title="Firma y membrete (URLs)">
          <Input
            label="URL de firma escaneada"
            placeholder="https://...firma.png"
            {...fld('signatureImageUrl')}
          />
          <Input
            label="URL de membrete del despacho"
            placeholder="https://...membrete.png"
            {...fld('letterheadImageUrl')}
          />
          <p className="text-xs text-gray-500 -mt-2">
            <ImageIcon className="w-3 h-3 inline" /> Pronto podrás subir directamente desde tu computadora.
          </p>
        </Section>

        <Section title="Notas / observaciones">
          <Textarea {...fld('notes')} placeholder="Información adicional para escritos: nº de procurador electrónico, notas para honorarios, etc." />
        </Section>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
            {success}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <input
        {...props}
        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </label>
  );
}

function Textarea({ ...props }: any) {
  return (
    <textarea
      {...props}
      rows={4}
      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
    />
  );
}

function Select({ label, options, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select
        {...props}
        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      >
        {options.map(([v, lbl]: [string, string]) => (
          <option key={v} value={v}>{lbl}</option>
        ))}
      </select>
    </label>
  );
}
