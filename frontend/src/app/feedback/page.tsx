'use client';

import { useState } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import { useSubmitFeedback, useFeedbackStats } from '@/hooks/useApiQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Send,
  CheckCircle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Reporte de Error', color: 'red' },
  { value: 'feature', label: 'Solicitud de Función', color: 'blue' },
  { value: 'improvement', label: 'Mejora', color: 'green' },
  { value: 'general', label: 'General', color: 'gray' },
];

const RATING_LABELS = ['Muy Malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

// Map feedback type colors to badge variants
const colorToBadgeVariant = (color: string): 'destructive' | 'default' | 'success' | 'secondary' => {
  switch (color) {
    case 'red': return 'destructive';
    case 'blue': return 'default';
    case 'green': return 'success';
    case 'gray': return 'secondary';
    default: return 'secondary';
  }
};

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    type: 'general',
    rating: 0,
    subject: '',
    comment: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useSubmitFeedback({
    onSuccess: () => {
      setSubmitted(true);
      setFormData({
        type: 'general',
        rating: 0,
        subject: '',
        comment: '',
      });
      setTimeout(() => setSubmitted(false), 5000);
    },
  });

  const { data: stats, isLoading: statsLoading } = useFeedbackStats();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.comment.trim()) return;

    submitMutation.mutate({
      type: formData.type,
      rating: formData.rating || undefined,
      subject: formData.subject || undefined,
      comment: formData.comment,
    });
  };

  const handleRatingClick = (rating: number) => {
    setFormData({ ...formData, rating });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <BackToDashboard />
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Retroalimentación</h1>
          <p className="mt-2 text-gray-600">
            Ayúdanos a mejorar compartiendo tus comentarios y sugerencias
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Feedback Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Enviar Retroalimentación
                </CardTitle>
                <CardDescription>
                  Comparte tus opiniones, reporta errores o sugiere mejoras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Type */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tipo de Retroalimentación
                    </label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Calificación (Opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleRatingClick(rating)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              rating <= formData.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      {formData.rating > 0 && (
                        <span className="ml-2 text-sm text-gray-600">
                          {RATING_LABELS[formData.rating - 1]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Asunto (Opcional)
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Breve descripción del tema"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Comentario
                    </label>
                    <Textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      placeholder="Describe tu retroalimentación en detalle..."
                      rows={6}
                      required
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-between">
                    <div>
                      {submitted && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            Retroalimentación enviada exitosamente
                          </span>
                        </div>
                      )}
                      {submitMutation.isError && (
                        <div className="text-sm text-red-600">
                          Error al enviar. Por favor, intenta nuevamente.
                        </div>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending || !formData.comment.trim()}
                      className="gap-2"
                    >
                      {submitMutation.isPending ? (
                        <>Enviando...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Enviar
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Tu Retroalimentación Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : stats?.recentFeedback && stats.recentFeedback.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentFeedback.map((feedback: any) => (
                      <div
                        key={feedback.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <Badge
                            variant={
                              colorToBadgeVariant(FEEDBACK_TYPES.find((t) => t.value === feedback.type)?.color || 'gray')
                            }
                          >
                            {FEEDBACK_TYPES.find((t) => t.value === feedback.type)?.label || feedback.type}
                          </Badge>
                          {feedback.rating && (
                            <div className="flex gap-0.5">
                              {[...Array(feedback.rating)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {feedback.subject && (
                          <h4 className="mb-1 font-medium text-gray-900">
                            {feedback.subject}
                          </h4>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {feedback.comment}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    Aún no has enviado ninguna retroalimentación
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Overall Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  Estadísticas Generales
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <div className="text-2xl font-bold text-blue-900">
                        {stats?.totalFeedback || 0}
                      </div>
                      <div className="text-sm text-blue-700">
                        Total de retroalimentaciones
                      </div>
                    </div>

                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <div className="text-2xl font-bold text-green-900">
                          {stats?.averageRating?.toFixed(1) || '0.0'}
                        </div>
                      </div>
                      <div className="text-sm text-green-700">
                        Calificación promedio
                      </div>
                    </div>

                    <div className="rounded-lg bg-purple-50 p-4">
                      <div className="text-2xl font-bold text-purple-900">
                        {stats?.responseRate || 0}%
                      </div>
                      <div className="text-sm text-purple-700">
                        Tasa de respuesta
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Sentimiento General
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-gray-700">Positivo</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {stats?.sentimentStats?.positive || 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${stats?.sentimentStats?.positive || 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-5 w-5 text-red-600" />
                        <span className="text-sm text-gray-700">Negativo</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {stats?.sentimentStats?.negative || 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-red-500"
                        style={{ width: `${stats?.sentimentStats?.negative || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <h3 className="mb-3 font-semibold text-blue-900">
                  Consejos para una buena retroalimentación
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Sé específico y detallado</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Incluye pasos para reproducir errores</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Sugiere soluciones cuando sea posible</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Mantén un tono constructivo</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
