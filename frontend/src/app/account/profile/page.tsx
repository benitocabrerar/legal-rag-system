'use client';

import React, { useState, useEffect } from 'react';
import { User, Camera, Save, Shield, Mail, Phone, Briefcase, Award } from 'lucide-react';
import { userAPI } from '@/lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await userAPI.getProfile();
      setProfile(userData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userAPI.updateProfile(profile);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      alert('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mi Perfil</h2>
        <p className="text-gray-600">Gestiona tu información personal y profesional</p>
      </div>

      {/* Profile Photo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto de Perfil</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-12 h-12 text-indigo-600" />
              </div>
            )}
            <button className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{profile?.name || 'Usuario'}</h4>
            <p className="text-sm text-gray-600">{profile?.email}</p>
            <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Cambiar foto
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Información Personal</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nombre Completo
              </div>
            </label>
            <input
              type="text"
              value={profile?.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </div>
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">El email no puede ser modificado</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Teléfono
              </div>
            </label>
            <input
              type="tel"
              value={profile?.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="+593 99 999 9999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Número de Matrícula
              </div>
            </label>
            <input
              type="text"
              value={profile?.barNumber || ''}
              onChange={(e) => setProfile({ ...profile, barNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="12-34-567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Estudio Jurídico
              </div>
            </label>
            <input
              type="text"
              value={profile?.lawFirm || ''}
              onChange={(e) => setProfile({ ...profile, lawFirm: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Nombre del estudio"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialización</label>
            <select
              value={profile?.specialization || ''}
              onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Seleccionar...</option>
              <option value="civil">Derecho Civil</option>
              <option value="penal">Derecho Penal</option>
              <option value="laboral">Derecho Laboral</option>
              <option value="constitucional">Derecho Constitucional</option>
              <option value="administrativo">Derecho Administrativo</option>
              <option value="transito">Derecho de Tránsito</option>
              <option value="general">Derecho General</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* Security */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Seguridad
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Cambiar Contraseña</h4>
              <p className="text-sm text-gray-600">Actualiza tu contraseña regularmente</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-700 font-medium">
              Cambiar
            </button>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Autenticación de Dos Factores</h4>
              <p className="text-sm text-gray-600">Agrega una capa extra de seguridad</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-700 font-medium">
              Configurar
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Sesiones Activas</h4>
              <p className="text-sm text-gray-600">Gestiona tus dispositivos conectados</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-700 font-medium">
              Ver Sesiones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
