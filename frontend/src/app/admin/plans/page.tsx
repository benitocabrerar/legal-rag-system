'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  nameEnglish: string;
  description: string | null;
  priceMonthlyUSD: number;
  priceYearlyUSD: number;
  storageGB: number;
  documentsLimit: number;
  monthlyQueries: number;
  apiCallsLimit: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEnglish: '',
    description: '',
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    storageGB: 1,
    documentsLimit: 10,
    monthlyQueries: 100,
    apiCallsLimit: 1000,
    features: [] as string[],
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/api/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      await api.post('/admin/plans', formData);
      alert('Plan creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      alert(error.response?.data?.error || 'Error al crear plan');
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      code: plan.code,
      name: plan.name,
      nameEnglish: plan.nameEnglish,
      description: plan.description || '',
      priceMonthlyUSD: plan.priceMonthlyUSD,
      priceYearlyUSD: plan.priceYearlyUSD,
      storageGB: plan.storageGB,
      documentsLimit: plan.documentsLimit,
      monthlyQueries: plan.monthlyQueries,
      apiCallsLimit: plan.apiCallsLimit,
      features: plan.features || [],
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    });
    setShowEditModal(true);
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;

    try {
      await api.patch(`/admin/plans/${selectedPlan.id}`, formData);
      alert('Plan actualizado exitosamente');
      setShowEditModal(false);
      setSelectedPlan(null);
      resetForm();
      loadPlans();
    } catch (error: any) {
      console.error('Error updating plan:', error);
      alert(error.response?.data?.error || 'Error al actualizar plan');
    }
  };

  const handleToggleStatus = async (planId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/plans/${planId}`, { isActive: !currentStatus });
      alert(`Plan ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`);
      loadPlans();
    } catch (error: any) {
      console.error('Error toggling plan status:', error);
      alert(error.response?.data?.error || 'Error al cambiar estado del plan');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      nameEnglish: '',
      description: '',
      priceMonthlyUSD: 0,
      priceYearlyUSD: 0,
      storageGB: 1,
      documentsLimit: 10,
      monthlyQueries: 100,
      apiCallsLimit: 1000,
      features: [],
      isActive: true,
      displayOrder: 0,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.isActive).length,
    inactive: plans.filter((p) => !p.isActive).length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Planes</h1>
          <p className="text-gray-600">Administra los planes de suscripción y sus características</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Crear Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Planes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Inactivos</p>
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No hay planes configurados</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {plan.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Código:</span>
                    <span className="font-medium text-gray-900">{plan.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mensual:</span>
                    <span className="font-bold text-indigo-600">{formatPrice(plan.priceMonthlyUSD)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Anual:</span>
                    <span className="font-bold text-indigo-600">{formatPrice(plan.priceYearlyUSD)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Almacenamiento:</span>
                    <span className="font-medium">{plan.storageGB} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Documentos:</span>
                    <span className="font-medium">{plan.documentsLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consultas/mes:</span>
                    <span className="font-medium">{plan.monthlyQueries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Llamadas API:</span>
                    <span className="font-medium">{plan.apiCallsLimit}</span>
                  </div>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-xs text-gray-600 mb-2">Características:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleStatus(plan.id, plan.isActive)}
                    className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-colors ${
                      plan.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {plan.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold mb-6">
              {showCreateModal ? 'Crear Nuevo Plan' : 'Editar Plan'}
            </h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="free, basic, professional..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orden de Visualización
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre (Español) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Gratis, Básico, Profesional..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre (Inglés) *
                  </label>
                  <input
                    type="text"
                    value={formData.nameEnglish}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEnglish: e.target.value })
                    }
                    placeholder="Free, Basic, Professional..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Breve descripción del plan..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Mensual (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.priceMonthlyUSD}
                    onChange={(e) =>
                      setFormData({ ...formData, priceMonthlyUSD: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Anual (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.priceYearlyUSD}
                    onChange={(e) =>
                      setFormData({ ...formData, priceYearlyUSD: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Almacenamiento (GB) *
                  </label>
                  <input
                    type="number"
                    value={formData.storageGB}
                    onChange={(e) =>
                      setFormData({ ...formData, storageGB: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Límite de Documentos *
                  </label>
                  <input
                    type="number"
                    value={formData.documentsLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, documentsLimit: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consultas Mensuales *
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyQueries}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyQueries: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Límite de Llamadas API *
                  </label>
                  <input
                    type="number"
                    value={formData.apiCallsLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, apiCallsLimit: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Plan activo (visible para usuarios)
                </label>
              </div>
            </div>

            <div className="flex space-x-4 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedPlan(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={showCreateModal ? handleCreatePlan : handleUpdatePlan}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                {showCreateModal ? 'Crear Plan' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
