import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { API, AuthUser } from "./appTypes";
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
            .filter((b: { bid_status: string; request: { status: string } }) => b.bid_status === "accepted" && b.request.status !== "closed")
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
            .filter((r: { id: number; service: string; car: string; status: string; created_at: string }) => r.status === "accepted")
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

interface ClientReview {
  id: number;
  rating: number;
  text: string | null;
  created_at: string;
  master_name: string;
  station: string;
  service: string | null;
}

export function ReviewsScreen({ user }: { user: AuthUser }) {
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API.getBids}?client_id=${user.id}&mode=client_reviews`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
            <Icon name="Star" size={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-white">Отзывов пока нет</p>
          <p className="text-xs text-muted-foreground">Оставьте отзыв после завершённой заявки</p>
        </div>
      ) : (
        reviews.map((r, i) => (
          <div key={r.id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start gap-3 mb-3">
              <Avatar initials={r.master_name.slice(0, 2).toUpperCase()} color="purple" />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{r.master_name}</p>
                <p className="text-xs text-muted-foreground">{r.station}{r.service ? ` · ${r.service}` : ""}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={r.rating} />
                  <span className="text-xs font-mono-tech text-yellow-400">{r.rating}.0</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-mono-tech">
                {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
            </div>
            {r.text && <p className="text-sm text-foreground/80 leading-relaxed">{r.text}</p>}
          </div>
        ))
      )}
    </div>
  );
}