'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ModelOption {
  id: string;
  label: string;
}

interface AiSettings {
  provider: 'openai' | 'anthropic';
  model: string;
  embedding_model: string;
  temperature: number;
  max_tokens: number;
  api_key_hint: string | null;
  api_key_set: boolean;
  updated_at: string;
  updated_by: string | null;
}

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [available, setAvailable] = useState<{ openai: ModelOption[]; anthropic: ModelOption[] }>({
    openai: [],
    anthropic: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // form state
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const r = await api.get('/admin/ai-settings');
      const s = r.data.settings;
      setSettings(s);
      setAvailable(r.data.availableModels);
      if (s) {
        setProvider(s.provider);
        setModel(s.model);
        setEmbeddingModel(s.embedding_model);
        setTemperature(Number(s.temperature));
        setMaxTokens(Number(s.max_tokens));
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (newProvider: 'openai' | 'anthropic') => {
    setProvider(newProvider);
    // Set sensible default model for the provider
    const list = available[newProvider];
    if (list && list.length > 0) setModel(list[0].id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload: any = { provider, model, embedding_model: embeddingModel, temperature, max_tokens: maxTokens };
      if (apiKey.trim()) payload.api_key = apiKey.trim();

      const r = await api.patch('/admin/ai-settings', payload);
      setSettings(r.data.settings);
      setSuccess('Configuración guardada. La app empezará a usar el nuevo modelo en máximo 30 segundos.');
      setApiKey('');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Cargando configuración…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Modelo de IA</h1>
        <p className="text-gray-600">
          Selecciona el proveedor y modelo de inteligencia artificial. La app usará automáticamente el
          nuevo modelo en cada nueva petición (cache de 30s).
        </p>
      </div>

      {settings && (
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Proveedor activo</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{settings.provider}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Modelo activo</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{settings.model}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleProviderChange('openai')}
              className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                provider === 'openai'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              OpenAI
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange('anthropic')}
              className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                provider === 'anthropic'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              Anthropic (Claude)
            </button>
          </div>
        </div>

        {/* Model */}
        <div>
          <label htmlFor="model" className="block text-sm font-semibold text-gray-700 mb-2">
            Modelo
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {(available[provider] || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.id})
              </option>
            ))}
          </select>
        </div>

        {/* Embedding model — solo OpenAI lo soporta */}
        <div>
          <label htmlFor="embed" className="block text-sm font-semibold text-gray-700 mb-2">
            Modelo de embeddings (siempre OpenAI)
          </label>
          <select
            id="embed"
            value={embeddingModel}
            onChange={(e) => setEmbeddingModel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="text-embedding-3-small">text-embedding-3-small (1536d, recomendado)</option>
            <option value="text-embedding-3-large">text-embedding-3-large (3072d)</option>
            <option value="text-embedding-ada-002">text-embedding-ada-002 (legacy)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Cambiar requiere re-embedding del corpus para mantener consistencia.
          </p>
        </div>

        {/* Temperature & Max Tokens */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="temp" className="block text-sm font-semibold text-gray-700 mb-2">
              Temperature
            </label>
            <input
              id="temp"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="tokens" className="block text-sm font-semibold text-gray-700 mb-2">
              Max tokens
            </label>
            <input
              id="tokens"
              type="number"
              min="100"
              max="64000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* API Key */}
        <div>
          <label htmlFor="apikey" className="block text-sm font-semibold text-gray-700 mb-2">
            API Key {settings?.api_key_set && <span className="text-emerald-600">· configurada {settings.api_key_hint}</span>}
          </label>
          <div className="flex gap-2">
            <input
              id="apikey"
              type={showApiKey ? 'text' : 'password'}
              placeholder={settings?.api_key_set ? 'Dejar vacío para conservar la actual' : 'sk-... o sk-ant-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((s) => !s)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              {showApiKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Se cifra con pgcrypto en Supabase. Si no la cambias, se conserva la actual.
          </p>
        </div>

        {/* Status messages */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}
        {success && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-md font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </form>

      {settings && (
        <div className="mt-6 text-xs text-gray-500">
          Última actualización: {new Date(settings.updated_at).toLocaleString('es-ES')}
          {settings.updated_by && <> · por {settings.updated_by.slice(0, 8)}…</>}
        </div>
      )}
    </div>
  );
}
