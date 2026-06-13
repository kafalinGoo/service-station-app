import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AuthUser, API } from "./appTypes";
import { Stars } from "./appHelpers";

interface Review {
  id: number;
  rating: number;
  text: string | null;
  created_at: string;
  client_name: string;
}

function ReviewsModal({ masterId, onClose }: { masterId: number; onClose: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch(`${API.submitBid}?master_id=${masterId}&mode=reviews`)
      .then(r => r.json())
      .then(raw => {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        setReviews(d.reviews || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  function timeAgo(iso: string) {
    try {
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60) return "только что";
      if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
      return `${Math.floor(diff / 86400)} дн назад`;
    } catch { return ""; }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "hsla(0,0%,0%,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[430px] rounded-t-2xl flex flex-col max-h-[88vh]"
        style={{ background: "hsl(220,20%,7%)", border: "1px solid hsla(185,100%,50%,0.2)", borderBottom: "none" }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-base font-bold text-white">Мои отзывы</p>
            {avg && <p className="text-xs text-muted-foreground mt-0.5">Средняя оценка: <span className="text-yellow-400 font-semibold">{avg} ★</span></p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <Icon name="Star" size={36} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
              <p className="text-xs text-muted-foreground/60">Они появятся после выполненных заказов</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="card-neon rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent border border-accent/30 flex items-center justify-center text-xs font-bold">
                      {r.client_name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-white">{r.client_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground/60 font-mono-tech">{timeAgo(r.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Stars rating={r.rating} />
                  <span className="text-xs font-mono-tech text-yellow-400">{r.rating}.0</span>
                </div>
                {r.text && <p className="text-sm text-foreground/80 leading-relaxed">{r.text}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const PERIODS = ["Неделя", "Месяц", "Квартал", "Год"] as const;
type Period = typeof PERIODS[number];
const PERIOD_API: Record<Period, string> = {
  "Неделя": "week", "Месяц": "month", "Квартал": "quarter", "Год": "year",
};
const PERIOD_LABELS: Record<Period, string> = {
  "Неделя": "Выручка за неделю", "Месяц": "Выручка за месяц",
  "Квартал": "Выручка за квартал", "Год": "Выручка за год",
};

interface AnalyticsData {
  revenue: number;
  revenue_delta: string;
  orders: number;
  orders_delta: string;
  avg_check: number;
  avg_check_delta: string;
  clients: number;
  clients_delta: string;
  rating: number;
  reviews_count: number;
  top_services: { name: string; revenue: number }[];
  bars: number[];
  bar_labels: string[];
}

export function AnalyticsScreen({ user }: { user: AuthUser }) {
  const [showReviews, setShowReviews] = useState(false);
  const [period, setPeriod] = useState<Period>("Месяц");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.master_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API.analytics}?master_id=${user.master_id}&period=${PERIOD_API[period]}`)
      .then(r => r.json())
      .then(raw => {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, user.master_id]);

  if (!loading && !user.master_id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Icon name="BarChart2" size={48} className="text-muted-foreground/30" />
        <p className="text-sm font-semibold text-white">Аналитика недоступна</p>
        <p className="text-xs text-muted-foreground">Раздел доступен только для мастеров</p>
      </div>
    );
  }

  const bars = data?.bars ?? [];
  const barLabels = data?.bar_labels ?? [];
  const maxVal = bars.length ? Math.max(...bars, 1) : 1;
  const svcMax = data?.top_services.length ? Math.max(...data.top_services.map(s => s.revenue), 1) : 1;

  const fmtMoney = (v: number) => v.toLocaleString("ru");
  const fmtDelta = (d: string) => (d.startsWith("+") || d.startsWith("-") ? d : `+${d}`);

  const metrics = data ? [
    { label: "Заказов выполнено", value: String(data.orders), delta: fmtDelta(data.orders_delta), icon: "CheckCircle", color: "text-neon-green", onClick: undefined },
    { label: "Средний чек", value: data.avg_check ? `${fmtMoney(data.avg_check)} ₽` : "—", delta: fmtDelta(data.avg_check_delta), icon: "TrendingUp", color: "text-neon-cyan", onClick: undefined },
    { label: "Новых клиентов", value: String(data.clients), delta: fmtDelta(data.clients_delta), icon: "Users", color: "text-accent", onClick: undefined },
    { label: "Рейтинг", value: data.rating ? `${data.rating} ★` : "—", delta: `${data.reviews_count} отз.`, icon: "Star", color: "text-yellow-400", onClick: () => setShowReviews(true) },
  ] : [];

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${period === p ? "bg-neon-cyan text-background" : "bg-secondary text-muted-foreground hover:text-white"}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="card-neon rounded-xl p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{PERIOD_LABELS[period]}</p>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-9 bg-secondary rounded w-40 mb-2" />
            <div className="h-3 bg-secondary rounded w-32 mb-5" />
            <div className="flex items-end gap-2 h-24">
              {[0,1,2,3,4].map(i => <div key={i} className="flex-1 bg-secondary rounded-t-lg" style={{ height: `${30 + i * 10}px` }} />)}
            </div>
          </div>
        ) : (
          <>
            <p className="text-3xl font-black text-white font-mono-tech glow-text-cyan">
              {data ? fmtMoney(data.revenue) : "0"} <span className="text-lg">₽</span>
            </p>
            <p className="text-xs text-neon-green mt-1">↑ {data?.revenue_delta ?? "—"}</p>
            <div className="flex items-end gap-2 mt-5 h-24">
              {bars.length === 0 ? (
                <p className="text-xs text-muted-foreground self-center mx-auto">Нет данных за период</p>
              ) : bars.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${Math.max((v / maxVal) * 80, v > 0 ? 4 : 0)}px`,
                      background: i === bars.length - 1 ? "linear-gradient(180deg, hsl(185,100%,50%), hsl(185,100%,30%))" : "hsla(185,100%,50%,0.2)",
                      boxShadow: i === bars.length - 1 ? "0 0 12px hsla(185,100%,50%,0.4)" : "none",
                    }} />
                  <span className="text-xs text-muted-foreground truncate max-w-full">{barLabels[i]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          [0,1,2,3].map(i => (
            <div key={i} className="card-neon rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-4 mb-2" />
              <div className="h-6 bg-secondary rounded w-16 mt-2 mb-1" />
              <div className="h-3 bg-secondary rounded w-24 mb-1" />
              <div className="h-3 bg-secondary rounded w-12" />
            </div>
          ))
        ) : metrics.map((m) => (
          m.onClick ? (
            <button key={m.label} onClick={m.onClick}
              className="card-neon rounded-xl p-4 text-left hover:border-yellow-400/40 transition-all relative">
              <Icon name={m.icon} size={18} className={m.color} />
              <p className="text-xl font-black text-white font-mono-tech mt-2">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-xs text-neon-green mt-1">{m.delta}</p>
              <Icon name="ChevronRight" size={12} className="absolute top-4 right-4 text-muted-foreground/40" />
            </button>
          ) : (
            <div key={m.label} className="card-neon rounded-xl p-4">
              <Icon name={m.icon} size={18} className={m.color} />
              <p className="text-xl font-black text-white font-mono-tech mt-2">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-xs text-neon-green mt-1">{m.delta}</p>
            </div>
          )
        ))}
      </div>

      {!loading && data && data.top_services.length > 0 && (
        <div className="card-neon rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Топ услуг по выручке</p>
          {data.top_services.map((s) => (
            <div key={s.name} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white">{s.name}</span>
                <span className="font-mono-tech text-neon-cyan">{fmtMoney(s.revenue)} ₽</span>
              </div>
              <div className="progress-neon h-2">
                <div className="progress-neon-fill h-full transition-all duration-300"
                  style={{ width: `${Math.round((s.revenue / svcMax) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data && data.top_services.length === 0 && (
        <div className="card-neon rounded-xl p-6 flex flex-col items-center gap-2 text-center">
          <Icon name="BarChart2" size={32} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Нет выполненных заказов за период</p>
          <p className="text-xs text-muted-foreground/60">Данные появятся после первого принятого отклика</p>
        </div>
      )}

      {showReviews && user.master_id && (
        <ReviewsModal masterId={user.master_id} onClose={() => setShowReviews(false)} />
      )}
    </div>
  );
}