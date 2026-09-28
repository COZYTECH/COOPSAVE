import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { getApiError } from '../lib/api';
import { formatDate } from '../lib/format';
import { notificationApi } from '../services/notificationApi';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setNotifications(await notificationApi.list()); } catch (loadError) { setError(getApiError(loadError, 'Unable to load notifications.')); } finally { setLoading(false); } }, []);
  useEffect(() => { document.title = 'Pamoja | Notifications'; load(); }, [load]);
  const markRead = async (notification) => { try { const updated = await notificationApi.markRead(notification.id); setNotifications((current) => current.map((item) => item.id === notification.id ? updated : item)); } catch (readError) { setError(getApiError(readError, 'Unable to update notification.')); } };
  if (loading) return <LoadingState label="Loading notifications..." />;
  return <div className="space-y-5"><PageHeader eyebrow="Activity" title="Notifications" description="Due contribution reminders and operational updates for your Ajo memberships." actions={<Button type="button" variant="secondary" onClick={load}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</Button>} />{error && <Alert>{error}</Alert>}<Card className="overflow-hidden"><div className="divide-y divide-pamoja-forest/8">{notifications.map((notification) => <div key={notification.id} className={`flex gap-4 px-5 py-4 ${notification.readAt ? '' : 'bg-pamoja-sage/50'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pamoja-sage text-pamoja-forest"><Bell className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-pamoja-ink">{notification.title}</p><p className="mt-1 text-sm text-pamoja-muted">{notification.body}</p></div>{!notification.readAt && <Button type="button" variant="secondary" onClick={() => markRead(notification)}><Check className="h-4 w-4" aria-hidden="true" />Mark read</Button>}</div><p className="mt-2 text-xs text-pamoja-muted">{formatDate(notification.createdAt)}</p></div></div>)}{notifications.length === 0 && <div className="p-6 text-sm text-pamoja-muted">No notifications yet.</div>}</div></Card></div>;
};
