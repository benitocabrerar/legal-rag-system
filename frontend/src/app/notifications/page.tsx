'use client';

import { useState } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import { useTranslation } from '@/lib/i18n';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useApiQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Filter,
  Briefcase,
  FileText,
  AlertCircle,
  Info,
  Calendar,
  Trash2,
} from 'lucide-react';

const NOTIFICATION_TYPES = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'system', labelKey: 'notifications.type_system' },
  { value: 'case', labelKey: 'navigation.cases' },
  { value: 'document', labelKey: 'documents.title' },
  { value: 'task', labelKey: 'navigation.tasks' },
  { value: 'event', labelKey: 'navigation.calendar' },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'case':
      return Briefcase;
    case 'document':
      return FileText;
    case 'task':
      return CheckCheck;
    case 'event':
      return Calendar;
    case 'alert':
      return AlertCircle;
    default:
      return Info;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'case':
      return 'bg-blue-100 text-blue-600';
    case 'document':
      return 'bg-green-100 text-green-600';
    case 'task':
      return 'bg-purple-100 text-purple-600';
    case 'event':
      return 'bg-yellow-100 text-yellow-600';
    case 'alert':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const { data: notifications, isLoading, error, refetch } = useNotifications();
  const markReadMutation = useMarkNotificationRead({
    onSuccess: () => {
      refetch();
    },
  });

  const filteredNotifications = (notifications || [])
    .filter((notif: any) => {
      if (filter !== 'all' && notif.type !== filter) return false;
      if (showUnreadOnly && notif.read) return false;
      return true;
    });

  const unreadCount = (notifications || []).filter((n: any) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleToggleSelection = (id: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map((n: any) => n.id));
    }
  };

  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach((id) => {
      markReadMutation.mutate(id);
    });
    setSelectedNotifications([]);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            Error al cargar las notificaciones. Por favor, intente nuevamente.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <BackToDashboard />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('notifications.title')}</h1>
            <p className="mt-2 text-gray-600">
              {unreadCount > 0 ? (
                <>
                  <span className="font-semibold">{unreadCount}</span>{' '}
                  {t('notifications.filter_unread').toLowerCase()}
                </>
              ) : (
                t('notifications.empty')
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="gap-2"
            >
              {showUnreadOnly ? (
                <>
                  <Bell className="h-4 w-4" />
                  {t('notifications.filter_all')}
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  {t('notifications.filter_unread')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{t('common.filter')}:</span>
                <div className="flex gap-1">
                  {NOTIFICATION_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={filter === type.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter(type.value)}
                    >
                      {t(type.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedNotifications.length} seleccionada
                  {selectedNotifications.length !== 1 && 's'}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleBulkMarkAsRead} className="gap-2">
                    <Check className="h-4 w-4" />
                    {t('notifications.markAllRead')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedNotifications([])}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {t('notifications.empty')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('notifications.empty')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification: any) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);
              const isSelected = selectedNotifications.includes(notification.id);

              return (
                <Card
                  key={notification.id}
                  className={`transition-all ${
                    !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelection(notification.id)}
                        className="mt-1 rounded border-gray-300"
                      />

                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1">
                        <div className="mb-1 flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h3>
                            {notification.type && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {notification.type}
                              </Badge>
                            )}
                          </div>
                          {!notification.read && (
                            <div className="ml-2 h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </div>

                        <p className="mb-2 text-sm text-gray-600">{notification.message}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>

                          <div className="flex gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markReadMutation.isPending}
                                className="gap-1 text-xs"
                              >
                                <Check className="h-3 w-3" />
                                {t('notifications.markAsRead')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Select All */}
        {filteredNotifications.length > 0 && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedNotifications.length === filteredNotifications.length
                ? 'Deseleccionar todas'
                : 'Seleccionar todas'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
