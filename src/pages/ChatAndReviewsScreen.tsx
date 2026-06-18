import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { reviews, API, AuthUser } from "./appTypes";
import { Stars, Avatar } from "./appHelpers";

// ─── ChatScreen ───────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_role: string;
  text: string;
  time: string;
  sender_name: string;
}

export function ChatScreen({ user, requestId, masterName, masterAvatar, onBack }: {
  user: AuthUser | null;
  requestId: number | null;
  masterName: string;
  masterAvatar: string;
  onBack?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = async () => {
    if (!requestId) return;
    try {
      const res = await fetch(`${API.chat}?request_id=${requestId}&since_id=${lastIdRef.current}`);
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const newMsgs: ChatMessage[] = data.messages || [];
      if (newMsgs.length > 0) {
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        setMsgs(prev => [...prev, ...newMsgs]);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!requestId) return;
    lastIdRef.current = 0;
    setMsgs([]);
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!message.trim() || !user || !requestId || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    try {
      const res = await fetch(API.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          sender_id: user.role === "master" ? user.master_id : user.id,
          sender_role: user.role,
          text,
        }),
      });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const newMsg: ChatMessage = {
        id: data.id,
        sender_id: user.role === "master" ? (user.master_id ?? user.id) : user.id,
        sender_role: user.role,
        text,
        time: data.time,
        sender_name: user.name,
      };
      lastIdRef.current = data.id;
      setMsgs(prev => [...prev, newMsg]);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const isMine = (msg: ChatMessage) => {
    if (!user) return false;
    if (user.role === "master") return msg.sender_role === "master" && msg.sender_id === user.master_id;
    return msg.sender_role === "client" && msg.sender_id === user.id;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="card-neon rounded-xl p-3 mb-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon name="ChevronLeft" size={18} className="text-neon-cyan" />
          </button>
        )}
        <div className="relative">
          <Avatar initials={masterAvatar || "М"} color="purple" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">{masterName || "Мастер"}</p>
          <p className="text-xs text-neon-green">Чат по заявке #{requestId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Icon name="MessageCircle" size={32} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Начните переписку</p>
          </div>
        )}
        {msgs.map((m) => {
          const mine = isMine(m);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${mine ? "bubble-mine" : "bubble-other"} px-4 py-2.5`}>
                {!mine && <p className="text-xs text-accent font-semibold mb-1">{m.sender_name}</p>}
                <p className="text-sm text-white leading-relaxed">{m.text}</p>
                <p className={`text-xs mt-1 ${mine ? "text-neon-cyan/50 text-right" : "text-muted-foreground"}`}>{m.time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-4">
        <input
          className="input-neon flex-1 px-4 py-2.5 rounded-xl text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Написать сообщение..."
          disabled={!requestId}
        />
        <button onClick={send} disabled={!message.trim() || sending || !requestId}
          className="w-10 h-10 rounded-xl btn-neon flex items-center justify-center flex-shrink-0 disabled:opacity-40">
          {sending
            ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
            : <Icon name="Send" size={16} />}
        </button>
      </div>
    </div>
  );
}

// ─── ChatListScreen ───────────────────────────────────────────────────────────

interface AcceptedRequest {
  id: number;
  service: string;
  car: string;
  status: string;
  created_at: string;
  masterName: string;
  masterAvatar: string;
}

export function ChatListScreen({ user, onOpenChat }: {
  user: AuthUser;
  onOpenChat: (requestId: number, masterName: string, masterAvatar: string) => void;
}) {
  const [items, setItems] = useState<AcceptedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role === "master") {
      fetch(`${API.getBids}?master_id=${user.master_id}&mode=mybids`)
        .then(r => r.json())
        .then(raw => {
          const d = typeof raw === "string" ? JSON.parse(raw) : raw;
          const accepted = (d.bids || [])
            .filter((b: { bid_status: string }) => b.bid_status === "accepted")
            .map((b: { bid_status: string; request: { id: number; service: string; car: string; status: string; created_at: string } }) => ({
              id: b.request.id,
              service: b.request.service,
              car: b.request.car,
              status: b.request.status,
              created_at: b.request.created_at,
              masterName: user.name,
              masterAvatar: user.name.slice(0, 2).toUpperCase(),
            }));
          setItems(accepted);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch(`${API.getBids}?client_id=${user.id}`)
        .then(r => r.json())
        .then(raw => {
          const d = typeof raw === "string" ? JSON.parse(raw) : raw;
          const accepted = (d.requests || [])
            .filter((r: { id: number; service: string; car: string; status: string; created_at: string }) => r.status === "accepted" || r.status === "closed")
            .map((r: { id: number; service: string; car: string; status: string; created_at: string }) => ({
              id: r.id,
              service: r.service,
              car: r.car,
              status: r.status,
              created_at: r.created_at,
              masterName: "Мастер",
              masterAvatar: "М",
            }));
          setItems(accepted);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="card-neon rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-secondary rounded w-40 mb-2" />
            <div className="h-3 bg-secondary rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Icon name="MessageCircle" size={48} className="text-muted-foreground/30" />
        <p className="text-sm font-semibold text-white">Нет активных чатов</p>
        <p className="text-xs text-muted-foreground">Чаты появятся после принятия заявки</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onOpenChat(item.id, item.masterName, item.masterAvatar)}
          className="card-neon rounded-xl p-4 text-left hover:border-neon-cyan/40 transition-all w-full"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 flex items-center justify-center text-sm font-bold font-mono-tech flex-shrink-0">
              <Icon name="MessageCircle" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{item.service}</p>
              <p className="text-xs text-muted-foreground truncate">{item.car}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${item.status === "closed" ? "text-muted-foreground bg-secondary border-border" : "text-neon-green bg-neon-green/10 border-neon-green/30"}`}>
                {item.status === "closed" ? "Закрыта" : "Активна"}
              </span>
              <Icon name="ChevronRight" size={14} className="text-muted-foreground/40" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Заявка #{item.id}</p>
        </button>
      ))}
    </div>
  );
}

// ─── ReviewsScreen ────────────────────────────────────────────────────────────

export function ReviewsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {!showForm ? (
        <>
          <div className="card-neon rounded-xl p-4 flex items-center gap-5">
            <div className="text-center">
              <p className="text-4xl font-black text-white font-mono-tech">4.8</p>
              <Stars rating={4.8} />
              <p className="text-xs text-muted-foreground mt-1">512 отзывов</p>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const pct = star === 5 ? 75 : star === 4 ? 18 : star === 3 ? 5 : 1;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-2">{star}</span>
                    <div className="progress-neon flex-1 h-2">
                      <div className="progress-neon-fill h-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono-tech w-6">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => setShowForm(true)} className="btn-neon py-3 rounded-xl font-bold">+ Оставить отзыв</button>

          {reviews.map((r, i) => (
            <div key={r.id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start gap-3 mb-3">
                <Avatar initials={r.avatar} color="purple" />
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{r.master}</p>
                  <p className="text-xs text-muted-foreground">{r.station} · {r.service}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={r.rating} />
                    <span className="text-xs font-mono-tech text-yellow-400">{r.rating}.0</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono-tech">{r.date.split(" ").slice(0, 2).join(" ")}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{r.text}</p>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-cyan transition-colors mt-3">
                <Icon name="ThumbsUp" size={12} /> Полезно
              </button>
            </div>
          ))}
        </>
      ) : (
        <div className="flex flex-col gap-4 animate-scale-in">
          {submitted ? (
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <Icon name="CheckCircle" size={48} className="text-neon-cyan" />
              <h3 className="text-xl font-bold text-white">Отзыв отправлен!</h3>
              <p className="text-sm text-muted-foreground">Спасибо за вашу оценку</p>
              <button onClick={() => { setShowForm(false); setSubmitted(false); setRating(0); setText(""); }} className="btn-neon px-6 py-2.5 rounded-xl font-bold">
                Назад к отзывам
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white">Оценить мастера</h3>
              <div className="card-neon rounded-xl p-4 flex items-center gap-3">
                <Avatar initials="AK" />
                <div>
                  <p className="font-semibold text-white text-sm">Алексей Коваль</p>
                  <p className="text-xs text-muted-foreground">AutoPro Сервис · ORD-2847</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block">Ваша оценка</label>
                <div className="flex gap-3 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s)} className="text-3xl transition-transform hover:scale-110">
                      <span className={s <= rating ? "star-filled" : "star-empty"}>★</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Комментарий</label>
                <textarea className="input-neon w-full px-4 py-3 rounded-xl text-sm resize-none" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Поделитесь впечатлением от работы мастера..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold">Отмена</button>
                <button disabled={!rating} onClick={() => setSubmitted(true)} className="flex-1 btn-neon py-3 rounded-xl font-bold disabled:opacity-40">Отправить</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}