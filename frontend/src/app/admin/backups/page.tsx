'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Clock,
  HardDrive,
  Shield,
  Download,
  Upload,
  Settings,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Trash2,
  Eye,
  RefreshCw,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react';
import CreateBackupDialog from '@/components/admin/CreateBackupDialog';
import CreateScheduleDialog from '@/components/admin/CreateScheduleDialog';
import { useActiveBackups, useBackupSSE } from '@/hooks/useBackupSSE';

// Types
interface Backup {
  id: string;
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' | 'SCHEMA_ONLY' | 'DATA_ONLY';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  compression: 'NONE' | 'GZIP' | 'BROTLI';
  encryption: boolean;
  size?: number;
  compressedSize?: number;
  originalSize?: number;
  location?: string;
  tableCount?: number;
  recordCount?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: any;
}

interface BackupSchedule {
  id: string;
  name: string;
  enabled: boolean;
  cronExpression: string;
  config: any;
  nextRun?: string;
  lastRun?: string;
  lastStatus?: string;
  createdAt: string;
}

interface BackupStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  totalSize: number;
  lastBackup?: Backup;
}

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Real-time SSE connection for active backups
  const { connected: sseConnected, activeBackups } = useActiveBackups(true);

  // Real-time event listener for all backup events
  const { lastEvent } = useBackupSSE({
    enabled: true,
    onEvent: (event) => {
      // Refresh data when backups are completed or failed
      if (event.type === 'completed' || event.type === 'failed') {
        fetchBackups();
        fetchStats();
      }
    }
  });

  // Fetch backups
  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/admin/backups', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();
      setBackups(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backups');
    }
  };

  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/admin/backups/schedules', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const data = await response.json();
      setSchedules(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/backups/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBackups(), fetchSchedules(), fetchStats()]);
      setLoading(false);
    };
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchBackups();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Format bytes
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  // Get status badge
  const getStatusBadge = (status: Backup['status']) => {
    const variants: Record<Backup['status'], { variant: any; icon: any }> = {
      COMPLETED: { variant: 'default', icon: CheckCircle },
      FAILED: { variant: 'destructive', icon: XCircle },
      IN_PROGRESS: { variant: 'secondary', icon: Loader2 },
      PENDING: { variant: 'outline', icon: Clock },
      CANCELLED: { variant: 'outline', icon: XCircle }
    };
    const { variant, icon: Icon } = variants[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  // Delete backup
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      const response = await fetch(`/api/admin/backups/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete backup');
      await fetchBackups();
      await fetchStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete backup');
    }
  };

  // Toggle schedule
  const handleToggleSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/backups/schedules/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to toggle schedule');
      await fetchSchedules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle schedule');
    }
  };

  // Execute schedule manually
  const handleExecuteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/backups/schedules/${id}/execute`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to execute schedule');
      alert('Schedule executed successfully');
      await fetchBackups();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to execute schedule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Respaldos</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">
              Control completo de respaldos de base de datos
            </p>
            {/* Real-time connection indicator */}
            <Badge
              variant={sseConnected ? 'default' : 'outline'}
              className={`flex items-center gap-1 ${sseConnected ? 'bg-green-500' : ''}`}
            >
              {sseConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="text-xs">Tiempo Real Activo</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span className="text-xs">Sin Conexión en Vivo</span>
                </>
              )}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Database className="w-4 h-4 mr-2" />
            Nuevo Respaldo
          </Button>
          <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Programar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchBackups();
              fetchSchedules();
              fetchStats();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Respaldos</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
            <XCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tamaño Total</CardTitle>
            <HardDrive className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats?.totalSize)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Last Backup Info */}
      {stats?.lastBackup && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Último Respaldo Exitoso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{stats.lastBackup.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(stats.lastBackup.completedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamaño</p>
                <p className="font-medium">{formatBytes(stats.lastBackup.compressedSize || stats.lastBackup.size)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tablas</p>
                <p className="font-medium">{stats.lastBackup.tableCount || 0} tablas</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros</p>
                <p className="font-medium">{stats.lastBackup.recordCount?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compresión</p>
                <p className="font-medium">{stats.lastBackup.compression}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Encriptación</p>
                <p className="font-medium">{stats.lastBackup.encryption ? 'Sí' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ubicación</p>
                <p className="font-medium truncate">{stats.lastBackup.location || 'S3'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="backups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backups">Respaldos</TabsTrigger>
          <TabsTrigger value="schedules">Programaciones</TabsTrigger>
          <TabsTrigger value="restore">Restaurar</TabsTrigger>
        </TabsList>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          {/* Active Backups - Real-time */}
          {activeBackups.length > 0 && (
            <Card className="border-blue-500 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Respaldos en Progreso ({activeBackups.length})
                </CardTitle>
                <CardDescription>
                  Seguimiento en tiempo real de respaldos activos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeBackups.map((backup) => (
                  <div
                    key={backup.id}
                    className="p-4 bg-white rounded-lg border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{backup.type}</p>
                        <p className="text-sm text-muted-foreground">
                          Iniciado: {formatDate(backup.startedAt || backup.createdAt)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        {backup.status}
                      </Badge>
                    </div>
                    {/* Progress bar placeholder - will show actual progress via SSE */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span className="text-muted-foreground">Procesando...</span>
                      </div>
                      <Progress value={undefined} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historial de Respaldos</CardTitle>
              <CardDescription>
                Lista completa de respaldos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Tablas</TableHead>
                    <TableHead>Compresión</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No hay respaldos disponibles
                      </TableCell>
                    </TableRow>
                  ) : (
                    backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-medium">{backup.type}</TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell>{formatDate(backup.createdAt)}</TableCell>
                        <TableCell>{formatBytes(backup.compressedSize || backup.size)}</TableCell>
                        <TableCell>{backup.tableCount || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{backup.compression}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedBackup(backup)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {backup.status === 'COMPLETED' && (
                              <Button variant="ghost" size="icon">
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(backup.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Programaciones de Respaldo</CardTitle>
              <CardDescription>
                Respaldos automáticos programados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Expresión Cron</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Próxima Ejecución</TableHead>
                    <TableHead>Última Ejecución</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay programaciones configuradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {schedule.cronExpression}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                            {schedule.enabled ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(schedule.nextRun)}</TableCell>
                        <TableCell>{formatDate(schedule.lastRun)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleSchedule(schedule.id)}
                            >
                              {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExecuteSchedule(schedule.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurar Base de Datos</CardTitle>
              <CardDescription>
                Seleccione un respaldo para restaurar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Advertencia:</strong> Restaurar un respaldo sobrescribirá los datos actuales.
                  Asegúrese de crear un respaldo actual antes de proceder.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Backup Details Dialog */}
      {selectedBackup && (
        <Dialog open={!!selectedBackup} onOpenChange={() => setSelectedBackup(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Respaldo</DialogTitle>
              <DialogDescription>ID: {selectedBackup.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Tipo</p>
                  <p className="text-muted-foreground">{selectedBackup.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Estado</p>
                  {getStatusBadge(selectedBackup.status)}
                </div>
                <div>
                  <p className="text-sm font-medium">Creado</p>
                  <p className="text-muted-foreground">{formatDate(selectedBackup.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Completado</p>
                  <p className="text-muted-foreground">{formatDate(selectedBackup.completedAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tamaño Original</p>
                  <p className="text-muted-foreground">{formatBytes(selectedBackup.originalSize)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tamaño Comprimido</p>
                  <p className="text-muted-foreground">{formatBytes(selectedBackup.compressedSize)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Compresión</p>
                  <p className="text-muted-foreground">{selectedBackup.compression}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Encriptación</p>
                  <p className="text-muted-foreground">{selectedBackup.encryption ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tablas</p>
                  <p className="text-muted-foreground">{selectedBackup.tableCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Registros</p>
                  <p className="text-muted-foreground">{selectedBackup.recordCount?.toLocaleString() || 0}</p>
                </div>
              </div>
              {selectedBackup.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{selectedBackup.error}</AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Backup Dialog */}
      <CreateBackupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          fetchBackups();
          fetchStats();
        }}
      />

      {/* Create Schedule Dialog */}
      <CreateScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSuccess={() => {
          fetchSchedules();
        }}
      />
    </div>
  );
}
