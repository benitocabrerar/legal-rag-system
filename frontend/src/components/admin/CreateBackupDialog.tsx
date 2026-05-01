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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CreateBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface BackupFormData {
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' | 'SCHEMA_ONLY' | 'DATA_ONLY';
  compression: 'NONE' | 'GZIP' | 'BROTLI';
  encryption: boolean;
  description?: string;
  includeTables?: string;
  excludeTables?: string;
  retention?: number;
  webhookUrl?: string;
  emailRecipients?: string;
}

export default function CreateBackupDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateBackupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BackupFormData>({
    defaultValues: {
      type: 'FULL',
      compression: 'GZIP',
      encryption: true,
      retention: 30,
    },
  });

  const onSubmit = async (data: BackupFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Parse table lists
      const includeTables = data.includeTables
        ? data.includeTables.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined;
      const excludeTables = data.excludeTables
        ? data.excludeTables.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined;

      // Parse email recipients
      const emailRecipients = data.emailRecipients
        ? data.emailRecipients.split(',').map((e) => e.trim()).filter(Boolean)
        : undefined;

      const payload = {
        type: data.type,
        compression: data.compression,
        encryption: data.encryption,
        description: data.description,
        includeTables,
        excludeTables,
        retentionDays: data.retention,
        webhookUrl: data.webhookUrl,
        emailRecipients,
      };

      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Respaldo</DialogTitle>
          <DialogDescription>
            Configure los parámetros para el nuevo respaldo de base de datos
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

            {/* Backup Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Respaldo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FULL">
                        Completo (Full) - Base de datos completa
                      </SelectItem>
                      <SelectItem value="INCREMENTAL">
                        Incremental - Solo cambios desde último respaldo
                      </SelectItem>
                      <SelectItem value="DIFFERENTIAL">
                        Diferencial - Cambios desde último respaldo completo
                      </SelectItem>
                      <SelectItem value="SCHEMA_ONLY">
                        Solo Esquema - Sin datos
                      </SelectItem>
                      <SelectItem value="DATA_ONLY">
                        Solo Datos - Sin esquema
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    FULL: Respaldo completo de esquema y datos. Recomendado para primer respaldo.
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
                      <SelectItem value="GZIP">GZIP (Recomendado)</SelectItem>
                      <SelectItem value="BROTLI">Brotli (Mejor compresión)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    GZIP: Balance entre velocidad y compresión. Brotli: Mayor compresión, más lento.
                  </FormDescription>
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
                      Encripta el respaldo usando AES-256-GCM antes de almacenar (Recomendado)
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del respaldo (opcional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Nota descriptiva sobre este respaldo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Include Tables */}
            <FormField
              control={form.control}
              name="includeTables"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incluir Tablas Específicas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="tabla1, tabla2, tabla3"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Lista de tablas separadas por coma. Dejar vacío para incluir todas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exclude Tables */}
            <FormField
              control={form.control}
              name="excludeTables"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excluir Tablas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="tabla_temporal, tabla_cache"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tablas a excluir del respaldo, separadas por coma
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Retention Days */}
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
                    Número de días para mantener este respaldo antes de eliminarlo automáticamente
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
                  <FormLabel>Webhook URL (Notificaciones)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://api.ejemplo.com/webhook"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL para recibir notificaciones sobre el estado del respaldo
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
                    Emails separados por coma para recibir notificaciones
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
                Crear Respaldo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
