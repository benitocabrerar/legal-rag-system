'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  level: number;
  path: string;
  createdAt: string;
  children?: Specialty[];
  _count?: {
    cases: number;
  };
}

interface SpecialtyFormData {
  name: string;
  description: string;
  parentId: string | null;
}

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [flatSpecialties, setFlatSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [formData, setFormData] = useState<SpecialtyFormData>({
    name: '',
    description: '',
    parentId: null,
  });

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    setLoading(true);
    try {
      const [treeRes, flatRes] = await Promise.all([
        api.get('/admin/specialties', { params: { includeChildren: true } }),
        api.get('/admin/specialties', { params: { includeChildren: false } }),
      ]);
      setSpecialties(treeRes.data.specialties || []);
      setFlatSpecialties(flatRes.data.specialties || []);
    } catch (error) {
      console.error('Error loading specialties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadSpecialties();
      return;
    }

    try {
      const response = await api.get('/admin/specialties/search', {
        params: { query: searchQuery },
      });
      setFlatSpecialties(response.data.specialties || []);
      setViewMode('flat');
    } catch (error) {
      console.error('Error searching specialties:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/admin/specialties', formData);
      alert('Especialidad creada exitosamente');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', parentId: null });
      loadSpecialties();
    } catch (error) {
      console.error('Error creating specialty:', error);
      alert('Error al crear especialidad');
    }
  };

  const handleEdit = async () => {
    if (!selectedSpecialty) return;

    try {
      await api.patch(`/admin/specialties/${selectedSpecialty.id}`, {
        name: formData.name,
        description: formData.description,
        parentId: formData.parentId,
      });
      alert('Especialidad actualizada exitosamente');
      setShowEditModal(false);
      setSelectedSpecialty(null);
      setFormData({ name: '', description: '', parentId: null });
      loadSpecialties();
    } catch (error) {
      console.error('Error updating specialty:', error);
      alert('Error al actualizar especialidad');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la especialidad "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/admin/specialties/${id}`);
      alert('Especialidad eliminada exitosamente');
      loadSpecialties();
    } catch (error) {
      console.error('Error deleting specialty:', error);
      alert('Error al eliminar especialidad');
    }
  };

  const openEditModal = (specialty: Specialty) => {
    setSelectedSpecialty(specialty);
    setFormData({
      name: specialty.name,
      description: specialty.description || '',
      parentId: specialty.parentId,
    });
    setShowEditModal(true);
  };

  const renderTreeNode = (specialty: Specialty, depth = 0) => {
    const hasChildren = specialty.children && specialty.children.length > 0;
    const [expanded, setExpanded] = useState(true);

    return (
      <div key={specialty.id} className="mb-2">
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
            depth === 0
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
              : depth === 1
              ? 'bg-blue-50 border-blue-200'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center space-x-3">
            {hasChildren && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-500 hover:text-gray-700"
              >
                {expanded ? '▼' : '▶'}
              </button>
            )}
            {!hasChildren && <span className="w-4" />}

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{specialty.name}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                  Nivel {specialty.level}
                </span>
                {specialty._count && specialty._count.cases > 0 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700">
                    {specialty._count.cases} casos
                  </span>
                )}
              </div>
              {specialty.description && (
                <p className="text-sm text-gray-600 mt-1">{specialty.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{specialty.path}</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => openEditModal(specialty)}
              className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(specialty.id, specialty.name)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Eliminar
            </button>
          </div>
        </div>

        {hasChildren && expanded && (
          <div className="mt-2">
            {specialty.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFlatList = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Especialidad
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nivel
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ruta
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Casos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {flatSpecialties.map((specialty) => (
            <tr key={specialty.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">{specialty.name}</div>
                  {specialty.description && (
                    <div className="text-sm text-gray-500">{specialty.description}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                  Nivel {specialty.level}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{specialty.path}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {specialty._count?.cases || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => openEditModal(specialty)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(specialty.id, specialty.name)}
                  className="text-red-600 hover:text-red-900"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Especialidades Legales
          </h1>
          <p className="text-gray-600">
            Gestiona las especialidades del derecho: penal, civil, constitucional, administrativo
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          + Nueva Especialidad
        </button>
      </div>

      {/* Search and View Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar especialidades..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Buscar
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Vista Árbol
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'flat'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Vista Lista
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : viewMode === 'tree' ? (
        <div className="space-y-2">{specialties.map((specialty) => renderTreeNode(specialty))}</div>
      ) : (
        renderFlatList()
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Nueva Especialidad</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Derecho Penal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descripción de la especialidad..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidad Padre (Opcional)
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value || null })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Ninguna (Nivel superior)</option>
                  {flatSpecialties.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.path}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '', parentId: null });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSpecialty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Editar Especialidad</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidad Padre
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value || null })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Ninguna (Nivel superior)</option>
                  {flatSpecialties
                    .filter((s) => s.id !== selectedSpecialty.id)
                    .map((specialty) => (
                      <option key={specialty.id} value={specialty.id}>
                        {specialty.path}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSpecialty(null);
                    setFormData({ name: '', description: '', parentId: null });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
