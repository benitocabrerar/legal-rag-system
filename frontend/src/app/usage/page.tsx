'use client';

import { useState } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Database,
  Search,
  FileText,
  Zap,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const timeframes = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
];

// Mock data - Replace with actual API calls
const mockUsageData = {
  queries: { used: 450, limit: 1000, percentage: 45 },
  storage: { used: 2.3, limit: 10, percentage: 23, unit: 'GB' },
  apiCalls: { used: 1200, limit: 5000, percentage: 24 },
  documents: { used: 85, limit: 200, percentage: 42.5 },
};

const mockUsageHistory = [
  { date: '2024-01-01', queries: 120, storage: 1.8, apiCalls: 300 },
  { date: '2024-01-02', queries: 150, storage: 1.9, apiCalls: 380 },
  { date: '2024-01-03', queries: 180, storage: 2.0, apiCalls: 450 },
  { date: '2024-01-04', queries: 140, storage: 2.1, apiCalls: 420 },
  { date: '2024-01-05', queries: 200, storage: 2.2, apiCalls: 500 },
  { date: '2024-01-06', queries: 160, storage: 2.2, apiCalls: 440 },
  { date: '2024-01-07', queries: 190, storage: 2.3, apiCalls: 480 },
];

const mockFeatureBreakdown = [
  { name: 'Búsqueda Semántica', value: 40 },
  { name: 'Análisis de Documentos', value: 30 },
  { name: 'IA Asistente', value: 20 },
  { name: 'Otros', value: 10 },
];

export default function UsagePage() {
  const [timeframe, setTimeframe] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);

  const handleExportData = () => {
    // Implement export functionality
    const dataStr = JSON.stringify(mockUsageData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usage-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <BackToDashboard />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uso y Estadísticas</h1>
            <p className="mt-2 text-gray-600">
              Monitorea tu consumo de recursos y cuotas disponibles
            </p>
          </div>

          <div className="flex gap-3">
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
            <Button onClick={handleExportData} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Datos
            </Button>
          </div>
        </div>

        {/* Quota Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <QuotaCard
            title="Consultas"
            icon={Search}
            used={mockUsageData.queries.used}
            limit={mockUsageData.queries.limit}
            percentage={mockUsageData.queries.percentage}
            color="blue"
            loading={isLoading}
          />
          <QuotaCard
            title="Almacenamiento"
            icon={Database}
            used={mockUsageData.storage.used}
            limit={mockUsageData.storage.limit}
            percentage={mockUsageData.storage.percentage}
            unit="GB"
            color="green"
            loading={isLoading}
          />
          <QuotaCard
            title="Llamadas API"
            icon={Zap}
            used={mockUsageData.apiCalls.used}
            limit={mockUsageData.apiCalls.limit}
            percentage={mockUsageData.apiCalls.percentage}
            color="purple"
            loading={isLoading}
          />
          <QuotaCard
            title="Documentos"
            icon={FileText}
            used={mockUsageData.documents.used}
            limit={mockUsageData.documents.limit}
            percentage={mockUsageData.documents.percentage}
            color="yellow"
            loading={isLoading}
          />
        </div>

        {/* Usage Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Usage Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Uso a lo Largo del Tiempo
              </CardTitle>
              <CardDescription>
                Historial de consumo por tipo de recurso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockUsageHistory}>
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
                    <Line
                      type="monotone"
                      dataKey="apiCalls"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="API Calls"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Feature Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-green-600" />
                Uso por Característica
              </CardTitle>
              <CardDescription>
                Distribución del uso entre diferentes funciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockFeatureBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockFeatureBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Uso Diario</CardTitle>
            <CardDescription>
              Comparación detallada del consumo de recursos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockUsageHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="queries" fill="#3b82f6" name="Consultas" />
                  <Bar dataKey="apiCalls" fill="#10b981" name="API Calls" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Usage Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Alertas de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockUsageData.queries.percentage > 80 && (
                <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
                  <div>
                    <h4 className="font-semibold text-yellow-900">
                      Alto uso de consultas
                    </h4>
                    <p className="mt-1 text-sm text-yellow-800">
                      Has utilizado el {mockUsageData.queries.percentage}% de tu cuota de consultas.
                      Considera actualizar tu plan.
                    </p>
                  </div>
                </div>
              )}

              {mockUsageData.storage.percentage < 50 && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-900">
                      Uso de almacenamiento saludable
                    </h4>
                    <p className="mt-1 text-sm text-green-800">
                      Estás utilizando solo el {mockUsageData.storage.percentage}% de tu almacenamiento disponible.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas Detalladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left font-semibold text-gray-900">Recurso</th>
                    <th className="pb-3 text-right font-semibold text-gray-900">Usado</th>
                    <th className="pb-3 text-right font-semibold text-gray-900">Límite</th>
                    <th className="pb-3 text-right font-semibold text-gray-900">Porcentaje</th>
                    <th className="pb-3 text-right font-semibold text-gray-900">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 text-gray-900">Consultas</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.queries.used}</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.queries.limit}</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.queries.percentage}%</td>
                    <td className="py-3 text-right">
                      <Badge variant={mockUsageData.queries.percentage > 80 ? 'warning' : 'success'}>
                        {mockUsageData.queries.percentage > 80 ? 'Alto' : 'Normal'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-900">Almacenamiento</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.storage.used} GB</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.storage.limit} GB</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.storage.percentage}%</td>
                    <td className="py-3 text-right">
                      <Badge variant="success">Normal</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-900">Llamadas API</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.apiCalls.used}</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.apiCalls.limit}</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.apiCalls.percentage}%</td>
                    <td className="py-3 text-right">
                      <Badge variant="success">Normal</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-900">Documentos</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.documents.used}</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.documents.limit}</td>
                    <td className="py-3 text-right text-gray-600">{mockUsageData.documents.percentage}%</td>
                    <td className="py-3 text-right">
                      <Badge variant="success">Normal</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuotaCard({
  title,
  icon: Icon,
  used,
  limit,
  percentage,
  unit = '',
  color,
  loading,
}: {
  title: string;
  icon: any;
  used: number;
  limit: number;
  percentage: number;
  unit?: string;
  color: string;
  loading: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const progressColor = percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <Card>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className={`rounded-full p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <Badge variant={percentage > 80 ? 'destructive' : 'secondary'}>
                {percentage}%
              </Badge>
            </div>

            <div className="mb-2">
              <h3 className="text-sm font-medium text-gray-600">{title}</h3>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {used} {unit}
              </div>
              <div className="text-sm text-gray-500">
                de {limit} {unit}
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${progressColor} transition-all`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
