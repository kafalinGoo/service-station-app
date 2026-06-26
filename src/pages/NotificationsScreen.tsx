import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  API, AuthUser,
  notifications,
  ApiNotif, formatNotifTime,
} from "./appTypes";

export function NotificationsScreen({ user, onUnreadChange }: { user: AuthUser; onUnreadChange?: (count: number) => void }) {
  const iconMap: Record<string, string> = {
    status: "Activity", message: "MessageCircle", promo: "Tag",
    review: "Star", personal_request: "UserCheck", new_bid: "Send",
    new_request: "ClipboardList", bid_accepted: "CheckCircle",
  };
  const colorMap: Record<string, string> = {
    status: "text-neon-cyan", message: "text-accent", promo: "text-neon-orange",
    review: "text-yellow-400", personal_request: "text-accent", new_bid: "text-neon-cyan",
    new_request: "text-neon-cyan", bid_accepted: "text-green-400",
  };

  const [localNotifs, setLocalNotifs] = useState(user.role === "client" ? notifications : []);
  const [apiNotifs, setApiNotifs] = useState<ApiNotif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const param = user.role === "master"
      ? `master_id=${user.master_id ?? user.id}`
      : `user_id=${user.id}`;
    fetch(`${API.getNotifications}?${param}`)
      .then(r => r.json())
      .then(raw => {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        setApiNotifs(d.notifications || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markLocalRead = (id: number) => {
    setLocalNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onUnreadChange?.(next.filter(n => !n.read).length + apiNotifs.filter(n => !n.is_read).length);
      return next;
    });
  };

  const markApiRead = async (id: number) => {
    setApiNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
      onUnreadChange?.(localNotifs.filter(n => !n.read).length + next.filter(n => !n.is_read).length);
      return next;
    });
    fetch(API.getNotifications, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  };

  const markAllRead = () => {
    setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
    const unreadIds = apiNotifs.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length) {
      setApiNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      fetch(API.getNotifications, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      }).catch(() => {});
    }
    onUnreadChange?.(0);
  };

  const totalUnread = localNotifs.filter(n => !n.read).length + apiNotifs.filter(n => !n.is_read).length;
  const hasAny = localNotifs.length > 0 || apiNotifs.length > 0;

  const clearAll = () => {
    setLocalNotifs([]);
    setApiNotifs([]);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {hasAny && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{totalUnread > 0 ? `${totalUnread} непрочитанных` : "Все прочитаны"}</p>
          <div className="flex items-center gap-3">
            {totalUnread > 0 && <button onClick={markAllRead} className="text-xs text-neon-cyan">Прочитать все</button>}
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Очистить</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
        </div>
      )}

      {apiNotifs.map((n, i) => (
        <button key={`api-${n.id}`} onClick={() => markApiRead(n.id)}
          className={`card-neon rounded-xl p-4 text-left w-full transition-all animate-fade-in ${!n.is_read ? "border-accent/40" : "opacity-60"}`}
          style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.is_read ? "bg-secondary" : "bg-accent/10"}`}>
              <Icon name={iconMap[n.type] ?? "Bell"} size={16} className={colorMap[n.type] ?? "text-neon-cyan"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-semibold text-white">{n.title}</p>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1 neon-pulse" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.text}</p>
              <p className="text-xs text-muted-foreground/60 font-mono-tech mt-1.5">{formatNotifTime(n.created_at)}</p>
            </div>
          </div>
        </button>
      ))}

      {localNotifs.map((n, i) => (
        <button key={`local-${n.id}`} onClick={() => markLocalRead(n.id)}
          className={`card-neon rounded-xl p-4 text-left w-full transition-all animate-fade-in ${!n.read ? "border-neon-cyan/30" : "opacity-60"}`}
          style={{ animationDelay: `${(apiNotifs.length + i) * 0.06}s` }}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? "bg-secondary" : "bg-neon-cyan/10"}`}>
              <Icon name={iconMap[n.type] ?? "Bell"} size={16} className={colorMap[n.type] ?? "text-neon-cyan"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-semibold text-white">{n.title}</p>
                {!n.read && <span className="w-2 h-2 rounded-full bg-neon-cyan flex-shrink-0 mt-1 neon-pulse" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.text}</p>
              <p className="text-xs text-muted-foreground/60 font-mono-tech mt-1.5">{n.time}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}