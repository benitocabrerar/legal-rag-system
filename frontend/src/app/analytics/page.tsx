'use client';

import { useState } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import { useAnalytics, useQueryTrends, useDocumentTrends } from '@/hooks/useApiQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Activity,
  FileText,
  Briefcase,
  Target,
  TrendingUp,
  Calendar,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const timeframes = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' },
];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('30d');

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useAnalytics(timeframe);
  const { data: queryTrends, isLoading: queryTrendsLoading } = useQueryTrends(timeframe);
  const { data: documentTrends, isLoading: documentTrendsLoading } = useDocumentTrends(timeframe);

  if (analyticsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <BackToDashboard />
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            Error al cargar los datos de análisis. Por favor, intente nuevamente.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análisis y Estadísticas</h1>
            <p className="mt-2 text-gray-600">
              Métricas de uso y rendimiento del sistema
            </p>
          </div>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Consultas"
            value={analytics?.totalQueries || 0}
            icon={Activity}
            loading={analyticsLoading}
            color="blue"
            trend={analytics?.queryTrend}
          />
          <KPICard
            title="Documentos Procesados"
            value={analytics?.documentsProcessed || 0}
            icon={FileText}
            loading={analyticsLoading}
            color="green"
            trend={analytics?.documentTrend}
          />
          <KPICard
            title="Casos Activos"
            value={analytics?.activeCases || 0}
            icon={Briefcase}
            loading={analyticsLoading}
            color="yellow"
          />
          <KPICard
            title="Precisión IA"
            value={`${analytics?.aiAccuracy || 0}%`}
            icon={Target}
            loading={analyticsLoading}
            color="purple"
            trend={analytics?.accuracyTrend}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Query Trends Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Tendencia de Consultas
              </CardTitle>
              <CardDescription>Consultas realizadas en el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              {queryTrendsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={queryTrends?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="queries"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Consultas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Document Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Distribución por Tipo de Documento
              </CardTitle>
              <CardDescription>Documentos procesados por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              {documentTrendsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={documentTrends?.typeDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(documentTrends?.typeDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* AI Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Métricas de Rendimiento IA
              </CardTitle>
              <CardDescription>Precisión, relevancia y tiempo de respuesta</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.aiMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8b5cf6" name="Valor (%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Usage Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Uso del Sistema
              </CardTitle>
              <CardDescription>Actividad diaria del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.usageOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" fill="#3b82f6" name="Usuarios" />
                    <Bar dataKey="queries" fill="#10b981" name="Consultas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas Adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <StatItem
                label="Tiempo Promedio de Respuesta"
                value={`${analytics?.avgResponseTime || 0}ms`}
                loading={analyticsLoading}
              />
              <StatItem
                label="Tasa de Éxito"
                value={`${analytics?.successRate || 0}%`}
                loading={analyticsLoading}
              />
              <StatItem
                label="Documentos por Caso (Promedio)"
                value={analytics?.avgDocsPerCase || 0}
                loading={analyticsLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  loading,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: any;
  loading: boolean;
  color: string;
  trend?: number;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className={`rounded-full p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
                <Icon className="h-6 w-6" />
              </div>
              {trend !== undefined && (
                <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              <p className="mt-1 text-sm text-gray-600">{title}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value, loading }: { label: string; value: string | number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      {loading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <p className="mt-1 text-sm text-gray-600">{label}</p>
        </>
      )}
    </div>
  );
}
