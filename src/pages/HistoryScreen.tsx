import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Screen, AuthUser, API } from "./appTypes";

export interface ApiRequest {
  id: number;
  service: string;
  category: string;
  car: string;
  description: string;
  status: string;
  created_at: string;
  bids_count: number;
  reviewed?: boolean;
}

export interface ApiBid {
  bid_id: number;
  price: number;
  comment: string;
  status: string;
  created_at: string;
  master: {
    id: number; name: string; station: string; specialty: string;
    rating: number; reviews_count: number; completed_orders: number;
    online: boolean; avatar: string; address?: string | null;
  };
}

export const REQ_STATUS: Record<string, { label: string; color: string }> = {
  open:      { label: "Открыта",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  accepted:  { label: "Принята",  color: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
  closed:    { label: "Закрыта",  color: "text-muted-foreground bg-secondary border-border" },
  cancelled: { label: "Отменена", color: "text-destructive bg-destructive/10 border-destructive/30" },
};

export function timeAgo(iso: string) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} дн назад`;
  } catch { return ""; }
}

function RequestDetailModal({
  requestId, user, onClose, onOpenChat,
}: {
  requestId: number; user: AuthUser; onClose: () => void;
  onOpenChat: (masterId: number, masterName: string, masterAvatar: string) => void;
}) {
  const [request, setRequest] = useState<ApiRequest | null>(null);
  const [bids, setBids] = useState<ApiBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [accepted, setAccepted] = useState<{ master_name: string; price: number } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API.getBids}?request_id=${requestId}`);
      const raw = await res.json();
      const d = typeof raw === "string" ? JSON.parse(raw) : raw;
      setRequest(d.request);
      setBids(d.bids || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const acceptBid = async (bid: ApiBid) => {
    setAccepting(bid.bid_id);
    try {
      const res = await fetch(API.getBids, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", bid_id: bid.bid_id, request_id: requestId }),
      });
      const raw = await res.json();
      const d = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (res.ok) {
        setAccepted({ master_name: d.master_name, price: d.price });
        load();
      }
    } catch { /* silent */ }
    finally { setAccepting(null); }
  };

  const acceptedBid = bids.find(b => b.status === "accepted");

  const submitReview = async () => {
    if (!reviewRating || !acceptedBid) return;
    setReviewSending(true);
    try {
      await fetch(API.submitBid, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          client_id: user.id,
          master_id: acceptedBid.master.id,
          request_id: requestId,
          rating: reviewRating,
          text: reviewText.trim() || undefined,
        }),
      });
      setReviewDone(true);
      load();
    } catch { /* silent */ }
    finally { setReviewSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "hsla(0,0%,0%,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[430px] rounded-t-2xl flex flex-col max-h-[88vh]"
        style={{ background: "hsl(220,20%,7%)", border: "1px solid hsla(185,100%,50%,0.2)", borderBottom: "none" }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-base font-bold text-white">{request?.service ?? "Заявка"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{request?.car}</p>
          </div>
          <div className="flex items-center gap-2">
            {request && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${REQ_STATUS[request.status]?.color ?? ""}`}>
                {REQ_STATUS[request.status]?.label ?? request.status}
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Icon name="X" size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {accepted && (
            <div className="rounded-xl px-4 py-3 bg-neon-cyan/10 border border-neon-cyan/30 flex items-center gap-3">
              <Icon name="CheckCircle" size={18} className="text-neon-cyan flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neon-cyan">Отклик принят!</p>
                <p className="text-xs text-muted-foreground">{accepted.master_name} — {accepted.price.toLocaleString("ru-RU")} ₽</p>
              </div>
            </div>
          )}

          {request?.description && (
            <div className="rounded-xl px-4 py-3 bg-secondary/60 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Описание</p>
              <p className="text-sm text-white">{request.description}</p>
            </div>
          )}

          {acceptedBid && !request?.reviewed && user.role === "client" && (
            <div className="rounded-xl p-4 border border-accent/30 bg-accent/5">
              {reviewDone ? (
                <div className="flex items-center gap-2">
                  <Icon name="CheckCircle" size={16} className="text-neon-green" />
                  <p className="text-sm font-semibold text-neon-green">Спасибо за отзыв!</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Оцените мастера — {acceptedBid.master.name}
                  </p>
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setReviewRating(s)}
                        className={`text-2xl transition-transform hover:scale-110 ${s <= reviewRating ? "text-yellow-400" : "text-muted-foreground/30"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input-neon w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                    rows={2}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Комментарий (необязательно)"
                  />
                  <button
                    onClick={submitReview}
                    disabled={!reviewRating || reviewSending}
                    className="mt-2 w-full btn-neon py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                    {reviewSending
                      ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                      : <Icon name="Star" size={14} />}
                    Отправить оценку
                  </button>
                </>
              )}
            </div>
          )}

          {request?.reviewed && acceptedBid && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
              <Icon name="Star" size={14} className="text-yellow-400" />
              <p className="text-xs text-muted-foreground">Вы уже оценили этого мастера</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Отклики мастеров {bids.length > 0 && <span className="text-neon-cyan">({bids.length})</span>}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
              </div>
            ) : bids.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <Icon name="Clock" size={28} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Пока нет откликов</p>
                <p className="text-xs text-muted-foreground/60">Мастера скоро ответят</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bids.map((bid) => {
                  const isAccepted = bid.status === "accepted";
                  const isRejected = bid.status === "rejected";
                  const canAccept = request?.status === "open" && bid.status === "pending";
                  return (
                    <div key={bid.bid_id}
                      className={`rounded-xl p-4 border transition-all ${isAccepted ? "border-neon-cyan/50 bg-neon-cyan/5" : isRejected ? "border-border opacity-50" : "card-neon"}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 bg-accent/15 text-accent border border-accent/30">
                          {bid.master.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{bid.master.name}</p>
                            {isAccepted && <Icon name="CheckCircle" size={14} className="text-neon-cyan flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{bid.master.station}</p>
                          {bid.master.address && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Icon name="MapPin" size={10} className="text-muted-foreground/60 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground/60">{bid.master.address}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-400 text-xs">★</span>
                            <span className="text-xs text-muted-foreground">{bid.master.rating} · {bid.master.reviews_count} отзывов</span>
                          </div>
                          {bid.comment && (
                            <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{bid.comment}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-base font-bold text-neon-cyan font-mono-tech">
                              {bid.price.toLocaleString("ru-RU")} ₽
                            </span>
                            {canAccept && (
                              <button
                                onClick={() => acceptBid(bid)}
                                disabled={accepting === bid.bid_id}
                                className="btn-neon text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-1">
                                {accepting === bid.bid_id
                                  ? <div className="w-3 h-3 rounded-full border-2 border-background border-t-transparent animate-spin" />
                                  : <Icon name="Check" size={12} />
                                }
                                Принять
                              </button>
                            )}
                            {isAccepted && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neon-cyan font-semibold">Выбран</span>
                                <button
                                  onClick={() => { onOpenChat(bid.master.id, bid.master.name, bid.master.avatar); onClose(); }}
                                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-semibold hover:bg-neon-cyan/20 transition-colors">
                                  <Icon name="MessageCircle" size={11} />Чат
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HistoryScreen({ setScreen, user, onOpenChat }: {
  setScreen: (s: Screen) => void;
  user: AuthUser;
  onOpenChat: (requestId: number, masterId: number, masterName: string, masterAvatar: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "accepted" | "closed">("all");
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API.getBids}?client_id=${user.id}`)
      .then(r => r.json())
      .then(raw => {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        setRequests(d.requests || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const FILTERS = [
    { key: "all", label: "Все" },
    { key: "open", label: "Открытые" },
    { key: "accepted", label: "Принятые" },
    { key: "closed", label: "Закрытые" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === f.key ? "bg-neon-cyan text-background" : "bg-secondary text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
            <Icon name="ClipboardList" size={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-white">Заявок пока нет</p>
          <p className="text-xs text-muted-foreground">Создайте первый запрос на обслуживание</p>
          <button onClick={() => setScreen("new-request")}
            className="btn-neon mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Icon name="Plus" size={15} />Новая заявка
          </button>
        </div>
      ) : (
        filtered.map((req, i) => {
          const st = REQ_STATUS[req.status] ?? REQ_STATUS.open;
          return (
            <button key={req.id} onClick={() => setSelectedId(req.id)}
              className="card-neon rounded-xl p-4 animate-fade-in text-left w-full hover:border-neon-cyan/30 transition-all"
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-white text-sm truncate">{req.service}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{req.car}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${st.color}`}>
                  {st.label}
                </span>
              </div>
              {req.description && (
                <p className="text-xs text-foreground/60 mb-2 line-clamp-1">{req.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground/60 font-mono-tech">{timeAgo(req.created_at)}</span>
                <div className="flex items-center gap-1 text-xs text-neon-cyan font-semibold">
                  <Icon name="Send" size={11} />
                  {req.bids_count > 0
                    ? `${req.bids_count} ${req.bids_count === 1 ? "отклик" : req.bids_count < 5 ? "отклика" : "откликов"}`
                    : "Нет откликов"
                  }
                </div>
              </div>
            </button>
          );
        })
      )}

      {selectedId && (
        <RequestDetailModal
          requestId={selectedId}
          user={user}
          onClose={() => setSelectedId(null)}
          onOpenChat={(masterId, masterName, masterAvatar) => {
            onOpenChat(selectedId, masterId, masterName, masterAvatar);
          }}
        />
      )}
    </div>
  );
}