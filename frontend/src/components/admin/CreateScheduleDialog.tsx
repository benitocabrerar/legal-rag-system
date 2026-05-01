'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ScheduleFormData {
  name: string;
  enabled: boolean;
  frequency: string;
  customCron?: string;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  compression: 'NONE' | 'GZIP' | 'BROTLI';
  encryption: boolean;
  retention?: number;
  webhookUrl?: string;
  emailRecipients?: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Cada Hora' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizado (Cron)' },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
];

export default function CreateScheduleDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateScheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ScheduleFormData>({
    defaultValues: {
      enabled: true,
      frequency: 'daily',
      hour: 2,
      minute: 0,
      backupType: 'FULL',
      compression: 'GZIP',
      encryption: true,
      retention: 30,
    },
  });

  const frequency = form.watch('frequency');

  // Generate cron expression
  const generateCronExpression = (data: ScheduleFormData): string => {
    if (data.frequency === 'custom' && data.customCron) {
      return data.customCron;
    }

    const minute = data.minute || 0;
    const hour = data.hour || 0;
    const dayOfWeek = data.dayOfWeek !== undefined ? data.dayOfWeek : '*';
    const dayOfMonth = data.dayOfMonth || '*';

    switch (data.frequency) {
      case 'hourly':
        return `${minute} * * * *`;
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly':
        return `${minute} ${hour} ${dayOfMonth} * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  };

  const onSubmit = async (data: ScheduleFormData) => {
    setLoading(true);
    setError(null);

    try {
      const cronExpression = generateCronExpression(data);

      // Parse email recipients
      const emailRecipients = data.emailRecipients
        ? data.emailRecipients.split(',').map((e) => e.trim()).filter(Boolean)
        : undefined;

      const payload = {
        name: data.name,
        enabled: data.enabled,
        cronExpression,
        config: {
          type: data.backupType,
          compression: data.compression,
          encryption: data.encryption,
          retentionDays: data.retention,
          webhookUrl: data.webhookUrl,
          emailRecipients,
        },
      };

      const response = await fetch('/api/admin/backups/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar Respaldo Automático</DialogTitle>
          <DialogDescription>
            Configure un respaldo automático recurrente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Schedule Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Programación *</FormLabel>
                  <FormControl>
                    <Input placeholder="Respaldo Diario 2AM" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nombre descriptivo para identificar esta programación
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Enabled */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Habilitar Programación</FormLabel>
                    <FormDescription>
                      Activar/desactivar la ejecución automática de esta programación
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            {frequency !== 'custom' && frequency !== 'hourly' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>0-23</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minuto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>0-59</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Hourly Minute Selection */}
            {frequency === 'hourly' && (
              <FormField
                control={form.control}
                name="minute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minuto de la Hora</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Se ejecutará en el minuto especificado de cada hora (0-59)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Weekly Day Selection */}
            {frequency === 'weekly' && (
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Día de la Semana</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione día" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Monthly Day Selection */}
            {frequency === 'monthly' && (
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Día del Mes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1-31"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Día del mes en que se ejecutará (1-31)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Custom Cron Expression */}
            {frequency === 'custom' && (
              <>
                <FormField
                  control={form.control}
                  name="customCron"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expresión Cron *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0 2 * * *"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Formato: minuto hora día mes día_semana
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Ejemplos de expresiones cron:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• <code>0 2 * * *</code> - Diario a las 2:00 AM</li>
                      <li>• <code>0 */6 * * *</code> - Cada 6 horas</li>
                      <li>• <code>0 0 * * 0</code> - Domingos a medianoche</li>
                      <li>• <code>0 3 1 * *</code> - Primer día del mes a las 3:00 AM</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Backup Type */}
            <FormField
              control={form.control}
              name="backupType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Respaldo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FULL">Completo (Full)</SelectItem>
                      <SelectItem value="INCREMENTAL">Incremental</SelectItem>
                      <SelectItem value="DIFFERENTIAL">Diferencial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Tipo de respaldo a ejecutar automáticamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Compression */}
            <FormField
              control={form.control}
              name="compression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compresión *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">Sin Compresión</SelectItem>
                      <SelectItem value="GZIP">GZIP</SelectItem>
                      <SelectItem value="BROTLI">Brotli</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Encryption */}
            <FormField
              control={form.control}
              name="encryption"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Encriptar Respaldo</FormLabel>
                    <FormDescription>
                      Usar encriptación AES-256-GCM
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Retention */}
            <FormField
              control={form.control}
              name="retention"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retención (días)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                    />
                  </FormControl>
                  <FormDescription>
                    Días para mantener respaldos automáticos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Webhook URL */}
            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://api.ejemplo.com/webhook"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL para notificaciones
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Recipients */}
            <FormField
              control={form.control}
              name="emailRecipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destinatarios de Email</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="admin@ejemplo.com, backup@ejemplo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Emails separados por coma
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Programación
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
