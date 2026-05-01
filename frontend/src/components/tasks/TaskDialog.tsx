'use client';

import { useState, useEffect } from 'react';
import { Task, TaskPriority, CreateTaskData } from '@/types/tasks';
import { X, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tasksAPI } from '@/lib/api';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTaskData) => Promise<void>;
  task?: Task | null;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

export function TaskDialog({ isOpen, onClose, onSave, task }: TaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    tags: [],
    checklistItems: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [checklistInput, setChecklistInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const suggestSubtasks = async () => {
    if (!formData.title || formData.title.length < 3) {
      setAiError('Escribe primero el título de la tarea');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await tasksAPI.suggestSubtasks({ title: formData.title, description: formData.description });
      const startPos = formData.checklistItems?.length || 0;
      const newItems = res.subtasks.map((s, i) => ({ title: s.title, position: startPos + i }));
      setFormData((prev) => ({
        ...prev,
        checklistItems: [...(prev.checklistItems || []), ...newItems],
      }));
    } catch (err: any) {
      setAiError(err?.response?.data?.message ?? 'No se pudieron generar sugerencias');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
        caseId: task.caseId,
        assignedToId: task.assignedToId,
        tags: task.tags || [],
        reminderDate: task.reminderDate
          ? new Date(task.reminderDate).toISOString().slice(0, 16)
          : '',
        checklistItems:
          task.checklistItems?.map((item, index) => ({
            title: item.title,
            position: index,
          })) || [],
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
        tags: [],
        checklistItems: [],
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSave({
        ...formData,
        dueDate: formData.dueDate || undefined,
        reminderDate: formData.reminderDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const addChecklistItem = () => {
    if (checklistInput.trim()) {
      setFormData({
        ...formData,
        checklistItems: [
          ...(formData.checklistItems || []),
          {
            title: checklistInput.trim(),
            position: formData.checklistItems?.length || 0,
          },
        ],
      });
      setChecklistInput('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setFormData({
      ...formData,
      checklistItems: formData.checklistItems?.filter((_, i) => i !== index) || [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-[calc(100vw-1rem)] mx-2 sm:mx-4 sm:my-8 sm:max-w-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {task ? 'Editar tarea' : 'Nueva tarea'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
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
                  Prioridad <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TaskPriority })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiquetas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Añadir etiqueta..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-indigo-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Lista de verificación
                  </label>
                  <button
                    type="button"
                    onClick={suggestSubtasks}
                    disabled={aiLoading || !formData.title || formData.title.length < 3}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all',
                      aiLoading || !formData.title || formData.title.length < 3
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:shadow-md hover:scale-[1.02]',
                    )}
                    title="Genera 4-7 subtareas sugeridas a partir del título"
                  >
                    {aiLoading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Pensando…</>
                    ) : (
                      <><Sparkles className="w-3 h-3" /> Sugerir con IA</>
                    )}
                  </button>
                </div>
                {aiError && <p className="text-[11px] text-rose-600 mb-1.5">{aiError}</p>}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addChecklistItem())
                    }
                    placeholder="Añadir ítem..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.checklistItems?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? 'Guardando...' : task ? 'Actualizar' : 'Crear tarea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
