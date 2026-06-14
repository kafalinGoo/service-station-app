import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { API, AuthUser } from "./appTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomingRequest {
  id: number;
  service: string;
  category: string;
  car: string;
  description: string;
  status: string;
  created_at: string;
  target_master_id: number | null;
  already_bid: boolean;
  photos: string[];
}

interface MyBid {
  bid_id: number;
  price: number;
  comment: string;
  bid_status: string;
  bid_created_at: string;
  request: {
    id: number;
    service: string;
    category: string;
    car: string;
    description: string;
    status: string;
    created_at: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} дн назад`;
  } catch { return ""; }
}

function formatPrice(p: number) {
  return p.toLocaleString("ru-RU") + " ₽";
}

// ─── BidModal — форма отклика ─────────────────────────────────────────────────

function BidModal({
  request,
  masterId,
  onClose,
  onSuccess,
}: {
  request: IncomingRequest;
  masterId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const priceNum = parseInt(price.replace(/\D/g, ""));
    if (!priceNum || priceNum < 100) { setError("Укажите корректную цену (от 100 ₽)"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(API.submitBid, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: request.id, master_id: masterId, price: priceNum, comment }),
      });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok) { setError(data.error || "Ошибка при отклике"); return; }
      onSuccess();
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "hsla(0,0%,0%,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-[430px] rounded-t-2xl p-5 flex flex-col gap-4" style={{ background: "hsl(220,20%,7%)", border: "1px solid hsla(185,100%,50%,0.2)", borderBottom: "none" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Откликнуться на заявку</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="rounded-xl px-4 py-3 bg-secondary/60 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">{request.service} · {request.car}</p>
          <p className="text-sm text-white font-medium">{request.description || "Без описания"}</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Ваша цена</label>
          <div className="relative">
            <input
              className="input-neon w-full pl-4 pr-10 py-3 rounded-xl text-sm font-mono"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Например: 3500"
              inputMode="numeric"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            Комментарий <span className="normal-case font-normal text-muted-foreground/60">(необязательно)</span>
          </label>
          <textarea
            className="input-neon w-full px-4 py-3 rounded-xl text-sm resize-none"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите о вашем подходе, опыте..."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
            <Icon name="AlertCircle" size={14} className="text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <button onClick={submit} disabled={loading}
          className="btn-neon py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {loading
            ? <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Отправка...</>
            : <><Icon name="Send" size={15} />Отправить отклик</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── MasterRequestsScreen — входящие заявки ───────────────────────────────────

export function MasterRequestsScreen({ user, onOpenChat }: {
  user: AuthUser;
  onOpenChat: (requestId: number, masterName: string, masterAvatar: string) => void;
}) {
  const masterId = user.master_id ?? user.id;
  const [tab, setTab] = useState<"incoming" | "mybids">("incoming");
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [mybids, setMybids] = useState<MyBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidTarget, setBidTarget] = useState<IncomingRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API.getBids}?master_id=${masterId}&mode=incoming`).then(r => r.json()),
        fetch(`${API.getBids}?master_id=${masterId}&mode=mybids`).then(r => r.json()),
      ]);
      const d1 = typeof r1 === "string" ? JSON.parse(r1) : r1;
      const d2 = typeof r2 === "string" ? JSON.parse(r2) : r2;
      setIncoming(d1.requests || []);
      setMybids(d2.bids || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleBidSuccess = () => {
    setBidTarget(null);
    load();
  };

  const CATEGORY_ICONS: Record<string, string> = {
    "Двигатели": "Gauge", "Электрика": "Zap", "Ходовая": "Circle",
    "Кузов": "Shield", "ТО": "Settings", "Шиномонтаж": "RotateCcw", "Другое": "Wrench",
  };

  const BID_STATUS: Record<string, { label: string; color: string }> = {
    pending:  { label: "Ожидает", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
    accepted: { label: "Принят",  color: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
    rejected: { label: "Отклонён", color: "text-destructive bg-destructive/10 border-destructive/30" },
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Заявки</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Кабинет мастера · {user.name}</p>
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <Icon name="RefreshCw" size={16} className="text-neon-cyan" />
        </button>
      </div>

      {/* Вкладки */}
      <div className="flex rounded-xl bg-secondary p-1 gap-1">
        <button onClick={() => setTab("incoming")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === "incoming" ? "bg-neon-cyan text-background" : "text-muted-foreground"}`}>
          <Icon name="Inbox" size={14} />
          Новые
          {incoming.filter(r => !r.already_bid).length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === "incoming" ? "bg-background/20" : "bg-neon-cyan/15 text-neon-cyan"}`}>
              {incoming.filter(r => !r.already_bid).length}
            </span>
          )}
        </button>
        <button onClick={() => setTab("mybids")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === "mybids" ? "bg-neon-cyan text-background" : "text-muted-foreground"}`}>
          <Icon name="ClipboardList" size={14} />
          Мои отклики
        </button>
      </div>

      {/* Контент */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      ) : tab === "incoming" ? (
        incoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="Inbox" size={28} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-white">Новых заявок нет</p>
            <p className="text-xs text-muted-foreground">Как только клиент создаст запрос — он появится здесь</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {incoming.map((req, i) => (
              <div key={req.id} className={`card-neon rounded-xl p-4 animate-fade-in ${req.already_bid ? "opacity-60" : ""}`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                    <Icon name={CATEGORY_ICONS[req.category] ?? "Wrench"} size={18} className="text-neon-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white truncate">{req.service}</p>
                      {req.target_master_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 flex-shrink-0">Лично вам</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{req.car}</p>
                    {req.description && (
                      <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed line-clamp-2">{req.description}</p>
                    )}
                    {req.photos && req.photos.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {req.photos.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                            className="w-14 h-14 rounded-lg overflow-hidden border border-neon-cyan/20 flex-shrink-0 block">
                            <img src={url} alt="фото" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground/60 font-mono-tech">{timeAgo(req.created_at)}</span>
                      {req.already_bid ? (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground flex items-center gap-1">
                          <Icon name="Check" size={11} />Отклик отправлен
                        </span>
                      ) : (
                        <button onClick={() => setBidTarget(req)}
                          className="btn-neon text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                          <Icon name="Send" size={12} />Откликнуться
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        mybids.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="ClipboardList" size={28} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-white">Вы ещё не откликались</p>
            <p className="text-xs text-muted-foreground">Ваши отклики на заявки клиентов появятся здесь</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mybids.map((bid, i) => {
              const st = BID_STATUS[bid.bid_status] ?? { label: bid.bid_status, color: "text-muted-foreground bg-secondary border-border" };
              return (
                <div key={bid.bid_id} className="card-neon rounded-xl p-4 animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{bid.request.service}</p>
                      <p className="text-xs text-muted-foreground">{bid.request.car}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  {bid.comment && (
                    <p className="text-xs text-foreground/70 leading-relaxed mb-2 line-clamp-2">{bid.comment}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-neon-cyan font-mono-tech">{formatPrice(bid.price)}</span>
                    <div className="flex items-center gap-2">
                      {bid.bid_status === "accepted" && (
                        <button
                          onClick={() => onOpenChat(bid.request.id, user.name, user.name.slice(0, 2).toUpperCase())}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-semibold hover:bg-neon-cyan/20 transition-colors">
                          <Icon name="MessageCircle" size={11} />Чат
                        </button>
                      )}
                      <span className="text-xs text-muted-foreground/60 font-mono-tech">{timeAgo(bid.bid_created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Модалка отклика */}
      {bidTarget && (
        <BidModal
          request={bidTarget}
          masterId={masterId}
          onClose={() => setBidTarget(null)}
          onSuccess={handleBidSuccess}
        />
      )}
    </div>
  );
}