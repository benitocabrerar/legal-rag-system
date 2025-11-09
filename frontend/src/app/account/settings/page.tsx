'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Bell, Plug, Lock, Download, Trash2 } from 'lucide-react';
import { settingsAPI } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get();
      setSettings(data || {});
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await settingsAPI.update(settings);
      alert('Configuración guardada exitosamente');
    } catch (error) {
      alert('Error al guardar la configuración');
    }
  };

  const handleExportData = async () => {
    if (confirm('¿Deseas exportar todos tus datos? Recibirás un email con el archivo.')) {
      try {
        await settingsAPI.exportData();
        alert('Solicitud de exportación enviada. Recibirás un email cuando esté listo.');
      } catch (error) {
        alert('Error al solicitar la exportación');
      }
    }
  };

  const handleDeleteAccount = async () => {
    const email = prompt('Para confirmar, escribe tu email:');
    if (email && confirm('¿Estás seguro? Esta acción no puede deshacerse.')) {
      try {
        await settingsAPI.deleteAccount(email);
        alert('Cuenta eliminada. Serás redirigido.');
        window.location.href = '/';
      } catch (error) {
        alert('Error al eliminar la cuenta');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'integrations', name: 'Integraciones', icon: Plug },
    { id: 'privacy', name: 'Privacidad', icon: Lock },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuración</h2>
        <p className="text-gray-600">Personaliza tu experiencia en Legal AI Dashboard</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
                <select
                  value={settings?.language || 'es'}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zona Horaria</label>
                <select
                  value={settings?.timezone || 'America/Guayaquil'}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="America/Guayaquil">Ecuador (GMT-5)</option>
                  <option value="America/New_York">New York (GMT-4)</option>
                  <option value="Europe/Madrid">Madrid (GMT+1)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
                <select
                  value={settings?.theme || 'light'}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Notificaciones por Email</h4>
                  <p className="text-sm text-gray-600">Recibe actualizaciones importantes</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings?.emailNotifications !== false}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="w-5 h-5 text-indigo-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Resumen Semanal</h4>
                  <p className="text-sm text-gray-600">Recibe un resumen de actividad cada semana</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings?.weeklyDigest !== false}
                  onChange={(e) => setSettings({ ...settings, weeklyDigest: e.target.checked })}
                  className="w-5 h-5 text-indigo-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Alertas de Límites</h4>
                  <p className="text-sm text-gray-600">Notificación al acercarte a tus límites de uso</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings?.usageAlerts !== false}
                  onChange={(e) => setSettings({ ...settings, usageAlerts: e.target.checked })}
                  className="w-5 h-5 text-indigo-600"
                />
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <p className="text-gray-600">Las integraciones estarán disponibles próximamente.</p>
              <div className="grid md:grid-cols-2 gap-4 opacity-50">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Google Drive</h4>
                  <p className="text-sm text-gray-600 mt-1">Sincroniza documentos automáticamente</p>
                  <button disabled className="mt-3 text-sm text-indigo-600 font-medium">Conectar</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Slack</h4>
                  <p className="text-sm text-gray-600 mt-1">Recibe notificaciones en tu equipo</p>
                  <button disabled className="mt-3 text-sm text-indigo-600 font-medium">Conectar</button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🔒 Tu privacidad es importante</h4>
                <p className="text-sm text-blue-800">
                  Todos tus datos están encriptados y nunca compartimos tu información con terceros.
                </p>
              </div>
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Gestión de Datos</h4>
                <div className="space-y-4">
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-3 w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium text-gray-900">Exportar Mis Datos</div>
                      <div className="text-sm text-gray-600">Descarga una copia de toda tu información</div>
                    </div>
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center gap-3 w-full text-left p-4 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-medium text-red-900">Eliminar Mi Cuenta</div>
                      <div className="text-sm text-red-600">Eliminar permanentemente todos tus datos</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab !== 'privacy' && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <button
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
