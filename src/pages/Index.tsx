import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = {
  createRequest: "https://functions.poehali.dev/628f6c50-4120-4f96-a248-9d96677095e2",
  getBids:       "https://functions.poehali.dev/474bd80e-7fe6-40b8-a4f2-9ef3144a6ae9",
  submitBid:     "https://functions.poehali.dev/18647c14-ab2a-4a4e-ae2e-ca2d139dfe20",
  decodeVin:     "https://functions.poehali.dev/50d346e2-4e25-47c2-bdc1-aa10367a98ff",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen =
  | "home"
  | "new-request"
  | "history"
  | "chat"
  | "profile"
  | "notifications"
  | "reviews"
  | "analytics";

interface Master {
  id: number;
  name: string;
  station: string;
  rating: number;
  reviews: number;
  specialty: string;
  price: string;
  online: boolean;
  avatar: string;
  completedOrders: number;
}

interface ApiMaster {
  id: number;
  name: string;
  station: string;
  specialty: string;
  rating: number;
  reviews_count: number;
  completed_orders: number;
  price_from: number;
  online: boolean;
  avatar: string;
}

interface Bid {
  bid_id: number;
  price: number;
  comment: string;
  status: string;
  created_at: string;
  master: ApiMaster;
}

interface Order {
  id: string;
  service: string;
  master: string;
  station: string;
  date: string;
  status: "new" | "progress" | "done" | "cancelled";
  price: string;
  car: string;
}

interface Notification {
  id: number;
  title: string;
  text: string;
  time: string;
  read: boolean;
  type: "status" | "message" | "promo" | "review";
}

interface Review {
  id: number;
  master: string;
  station: string;
  rating: number;
  text: string;
  date: string;
  service: string;
  avatar: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const masters: Master[] = [
  { id: 1, name: "Алексей Коваль", station: "AutoPro Сервис", rating: 4.9, reviews: 312, specialty: "Двигатели", price: "от 2 500 ₽", online: true, avatar: "AK", completedOrders: 847 },
  { id: 2, name: "Дмитрий Синицын", station: "TechDrive", rating: 4.8, reviews: 215, specialty: "Электрика", price: "от 1 800 ₽", online: true, avatar: "ДС", completedOrders: 634 },
  { id: 3, name: "Игорь Петров", station: "МастерТО", rating: 4.7, reviews: 189, specialty: "Ходовая", price: "от 1 200 ₽", online: false, avatar: "ИП", completedOrders: 512 },
  { id: 4, name: "Виктор Лазарев", station: "AutoPro Сервис", rating: 4.8, reviews: 278, specialty: "Кузов", price: "от 3 000 ₽", online: true, avatar: "ВЛ", completedOrders: 703 },
];

const orders: Order[] = [
  { id: "ORD-2847", service: "Замена масла и фильтров", master: "Алексей Коваль", station: "AutoPro Сервис", date: "28 мая 2026", status: "done", price: "3 200 ₽", car: "Toyota Camry 2021" },
  { id: "ORD-2901", service: "Диагностика двигателя", master: "Дмитрий Синицын", station: "TechDrive", date: "30 мая 2026", status: "progress", price: "2 800 ₽", car: "BMW X5 2020" },
  { id: "ORD-2935", service: "Замена тормозных колодок", master: "Игорь Петров", station: "МастерТО", date: "31 мая 2026", status: "new", price: "4 500 ₽", car: "Toyota Camry 2021" },
  { id: "ORD-2760", service: "Замена аккумулятора", master: "Виктор Лазарев", station: "AutoPro Сервис", date: "15 мая 2026", status: "done", price: "6 800 ₽", car: "BMW X5 2020" },
  { id: "ORD-2703", service: "Шиномонтаж (4 колеса)", master: "Игорь Петров", station: "МастерТО", date: "10 мая 2026", status: "cancelled", price: "1 600 ₽", car: "Toyota Camry 2021" },
];

const notifications: Notification[] = [
  { id: 1, title: "Заказ принят в работу", text: "Дмитрий Синицын начал диагностику вашего BMW X5", time: "5 мин назад", read: false, type: "status" },
  { id: 2, title: "Новое сообщение", text: "Алексей Коваль: «Масло заменено, готов отчёт»", time: "2 часа назад", read: false, type: "message" },
  { id: 3, title: "Заказ выполнен", text: "ORD-2847 успешно завершён. Стоимость: 3 200 ₽", time: "Вчера", read: true, type: "status" },
  { id: 4, title: "Оставьте отзыв", text: "Как прошло обслуживание у Алексея Коваля?", time: "Вчера", read: true, type: "review" },
  { id: 5, title: "Акция AutoPro Сервис", text: "Скидка 20% на ТО при записи до 5 июня", time: "2 дня назад", read: true, type: "promo" },
];

const reviews: Review[] = [
  { id: 1, master: "Алексей Коваль", station: "AutoPro Сервис", rating: 5, text: "Профессионал высшего уровня! Всё чётко, быстро и по делу. Двигатель работает как новый.", date: "28 мая 2026", service: "Замена масла", avatar: "AK" },
  { id: 2, master: "Дмитрий Синицын", station: "TechDrive", rating: 5, text: "Нашёл проблему в электрике за 20 минут, которую другие 3 сервиса не могли найти месяц. Рекомендую!", date: "22 мая 2026", service: "Диагностика", avatar: "ДС" },
  { id: 3, master: "Игорь Петров", station: "МастерТО", rating: 4, text: "Хорошая работа по ходовой. Небольшая задержка, но качество на высоте.", date: "18 мая 2026", service: "Ходовая", avatar: "ИП" },
];

const chatMessages = [
  { id: 1, mine: false, text: "Добрый день! Ваш автомобиль принят. Начинаем диагностику двигателя.", time: "10:32" },
  { id: 2, mine: true, text: "Отлично, спасибо! Сколько примерно займёт?", time: "10:35" },
  { id: 3, mine: false, text: "Около 2 часов. По завершении пришлю полный отчёт с фото.", time: "10:36" },
  { id: 4, mine: false, text: "Предварительно нашли небольшую утечку масла. Устранить прямо сейчас?", time: "11:15" },
  { id: 5, mine: true, text: "Да, пожалуйста, устраните всё сразу.", time: "11:18" },
  { id: 6, mine: false, text: "Принято! Добавлю к чеку. Итоговая сумма будет около 4 200 ₽.", time: "11:19" },
];

const services = [
  "Замена масла и фильтров",
  "Диагностика двигателя",
  "Тормозная система",
  "Ходовая часть",
  "Электрика",
  "Кузовные работы",
  "Шиномонтаж",
  "Кондиционер",
  "Трансмиссия",
  "Другое",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Stars = ({ rating }: { rating: number }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= Math.round(rating) ? "star-filled text-sm" : "star-empty text-sm"}>★</span>
    ))}
  </span>
);

const StatusBadge = ({ status }: { status: Order["status"] }) => {
  const labels = { new: "Новый", progress: "В работе", done: "Выполнен", cancelled: "Отменён" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono-tech status-${status}`}>
      {labels[status]}
    </span>
  );
};

const Avatar = ({ initials, color = "cyan" }: { initials: string; color?: "cyan" | "purple" }) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono-tech flex-shrink-0 ${color === "cyan" ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30" : "bg-accent/15 text-accent border border-accent/30"}`}>
    {initials}
  </div>
);

// ─── Screens ─────────────────────────────────────────────────────────────────

function HomeScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="relative overflow-hidden rounded-2xl p-5 border border-neon-cyan/20" style={{ background: "linear-gradient(135deg, hsla(185,100%,15%,0.3) 0%, hsla(270,80%,20%,0.2) 100%)" }}>
        <img src="https://cdn.poehali.dev/projects/a7200fd4-8221-44d9-8f62-6b46864044c2/files/57206cd8-84f0-4fb4-aa39-2a3ad0dbb629.jpg" alt="AutoTech" className="absolute inset-0 w-full h-full object-cover opacity-20 rounded-2xl" />
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(185,100%,50%) 0%, transparent 70%)" }} />
        <div className="relative">
          <p className="text-xs font-mono-tech text-neon-cyan/70 uppercase tracking-widest mb-1">Система ТО v2.0</p>
          <h2 className="text-2xl font-black text-white leading-tight mb-3">
            Найди мастера<br /><span className="glow-text-cyan text-neon-cyan">за 60 секунд</span>
          </h2>
          <button onClick={() => setScreen("new-request")} className="btn-neon px-5 py-2.5 rounded-xl text-sm font-bold">
            + Новый запрос
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Мастеров", value: "247", icon: "Wrench" },
          { label: "Станций", value: "38", icon: "Building2" },
          { label: "Заказов", value: "12K+", icon: "CheckCircle" },
        ].map((s) => (
          <div key={s.label} className="card-neon rounded-xl p-3 text-center">
            <Icon name={s.icon} size={18} className="text-neon-cyan mx-auto mb-1" />
            <div className="text-lg font-black text-white font-mono-tech">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Категории услуг</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: "Droplets", label: "ТО" },
            { icon: "Zap", label: "Электрика" },
            { icon: "Gauge", label: "Ходовая" },
            { icon: "Shield", label: "Кузов" },
            { icon: "Wind", label: "Климат" },
            { icon: "Settings", label: "Двигатель" },
            { icon: "Circle", label: "Шины" },
            { icon: "MoreHorizontal", label: "Другое" },
          ].map((c) => (
            <button key={c.label} onClick={() => setScreen("new-request")} className="card-neon rounded-xl p-3 flex flex-col items-center gap-1.5 hover:scale-105 transition-transform">
              <Icon name={c.icon} size={20} className="text-neon-cyan" />
              <span className="text-xs text-foreground/70">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Топ мастера</h3>
          <span className="text-xs text-neon-cyan font-mono-tech">Все →</span>
        </div>
        <div className="flex flex-col gap-3">
          {masters.map((m, i) => (
            <div key={m.id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar initials={m.avatar} />
                  {m.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background neon-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.station}</p>
                    </div>
                    <span className="text-xs font-mono-tech text-neon-cyan/70">{i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Stars rating={m.rating} />
                    <span className="text-xs font-mono-tech text-neon-cyan">{m.rating}</span>
                    <span className="text-xs text-muted-foreground">{m.reviews} отзывов</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{m.specialty}</span>
                    <span className="text-xs font-semibold text-white">{m.price}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setScreen("new-request")} className="w-full mt-3 py-2 rounded-lg text-xs font-bold btn-neon">
                Записаться
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewRequestScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [selectedService, setSelectedService] = useState("");
  const [description, setDescription] = useState("");
  const [car, setCar] = useState("");
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // VIN
  const [vin, setVin] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");
  const [vinDetails, setVinDetails] = useState("");

  const handleVinDecode = async () => {
    const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (cleaned.length !== 17) {
      setVinError("VIN должен содержать 17 символов");
      return;
    }
    setVinLoading(true);
    setVinError("");
    setVinDetails("");
    try {
      const res = await fetch(`${API.decodeVin}?vin=${cleaned}`);
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok || data.error) {
        setVinError(data.error || "VIN не распознан");
      } else {
        setCar(data.car);
        setVinDetails(data.details || "");
      }
    } catch {
      setVinError("Ошибка соединения");
    } finally {
      setVinLoading(false);
    }
  };

  // После отправки — экран ожидания откликов
  const [requestId, setRequestId] = useState<number | null>(null);
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [bids, setBids] = useState<Bid[]>([]);
  const [polling, setPolling] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { url, name: file.name }]);
    });
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const fetchBids = useCallback(async (reqId: number) => {
    try {
      const res = await fetch(`${API.getBids}?request_id=${reqId}`);
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setBids(parsed.bids || []);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    if (!requestId || !polling) return;
    fetchBids(requestId);
    const interval = setInterval(() => fetchBids(requestId), 5000);
    return () => clearInterval(interval);
  }, [requestId, polling, fetchBids]);

  const handleSubmit = async () => {
    if (!selectedService || !car.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API.createRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selectedService,
          car: car.trim(),
          description,
          client_id: 1,
        }),
      });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      setRequestId(data.request_id);
      setNotifiedCount(data.notified_masters);
      setPolling(true);
    } catch {
      setError("Не удалось отправить запрос. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  // ── Экран ожидания откликов ──────────────────────────────────────────────
  if (requestId) {
    return (
      <div className="flex flex-col gap-5 pb-4 animate-fade-in">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-neon-cyan/20 text-center"
          style={{ background: "linear-gradient(135deg, hsla(185,100%,10%,0.4) 0%, hsla(270,80%,15%,0.2) 100%)" }}>
          <div className="w-14 h-14 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-3">
            <Icon name="CheckCircle" size={28} className="text-neon-cyan" />
          </div>
          <p className="text-xs font-mono-tech text-neon-cyan/70 uppercase tracking-widest mb-1">
            Запрос #{requestId} отправлен
          </p>
          <h2 className="text-xl font-black text-white mb-1">Ждём отклики мастеров</h2>
          <p className="text-xs text-muted-foreground">
            Запрос разослан <span className="text-neon-cyan font-semibold">{notifiedCount}</span> мастерам по категории «{selectedService}»
          </p>
        </div>

        {/* Детали запроса */}
        <div className="card-neon rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Ваш запрос</p>
          <div className="flex flex-col gap-2">
            {[["Услуга", selectedService], ["Автомобиль", car], ["Описание", description || "—"]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-white font-medium text-right max-w-[60%]">{v}</span>
              </div>
            ))}
            {photos.length > 0 && (
              <div className="flex justify-between text-sm items-center pt-1 border-t border-border mt-1">
                <span className="text-muted-foreground">Фото</span>
                <div className="flex gap-1">
                  {photos.slice(0, 3).map((p, i) => (
                    <img key={i} src={p.url} alt="" className="w-7 h-7 rounded-lg object-cover border border-neon-cyan/20" />
                  ))}
                  {photos.length > 3 && (
                    <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-xs font-bold text-neon-cyan">
                      +{photos.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Отклики */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Отклики мастеров
            </h3>
            <div className="flex items-center gap-2">
              {polling && bids.length === 0 && (
                <span className="text-xs text-neon-cyan/70 font-mono-tech neon-pulse">ожидаем...</span>
              )}
              <span className="text-xs font-mono-tech text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded-full">
                {bids.length}
              </span>
            </div>
          </div>

          {bids.length === 0 ? (
            <div className="card-neon rounded-xl p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <Icon name="Clock" size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Мастера ещё не откликнулись</p>
              <p className="text-xs text-muted-foreground/60">Обычно первые отклики приходят за 5–15 минут</p>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 neon-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bids.map((bid, i) => (
                <div key={bid.bid_id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono-tech flex-shrink-0 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                        {bid.master.avatar}
                      </div>
                      {bid.master.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{bid.master.name}</p>
                      <p className="text-xs text-muted-foreground">{bid.master.station}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Stars rating={bid.master.rating} />
                        <span className="text-xs font-mono-tech text-neon-cyan">{bid.master.rating}</span>
                        <span className="text-xs text-muted-foreground">· {bid.master.completed_orders} заказов</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-white font-mono-tech">{bid.price.toLocaleString("ru")} ₽</p>
                      <p className="text-xs text-neon-green">Предложение</p>
                    </div>
                  </div>
                  {bid.comment && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-secondary/60 border border-border">
                      <p className="text-xs text-foreground/80 italic">«{bid.comment}»</p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setScreen("chat")}
                      className="flex-1 py-2 rounded-lg text-xs font-bold border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-all"
                    >
                      Написать
                    </button>
                    <button className="flex-1 py-2 rounded-lg text-xs font-bold btn-neon">
                      Принять
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setScreen("home")}
          className="py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold"
        >
          На главную
        </button>
      </div>
    );
  }

  // ── Форма создания запроса ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pb-4">
      <div>
        <h2 className="text-lg font-black text-white mb-1">Новый запрос</h2>
        <p className="text-xs text-muted-foreground">Запрос будет разослан всем мастерам по выбранной категории</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Тип услуги</label>
        <div className="grid grid-cols-2 gap-2">
          {services.map((s) => (
            <button key={s} onClick={() => setSelectedService(s)} className={`py-2.5 px-3 rounded-xl text-sm text-left transition-all border ${selectedService === s ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-border bg-secondary text-foreground/70 hover:border-neon-cyan/40"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Определить по VIN</label>
        <div className="flex gap-2">
          <input
            className="input-neon flex-1 px-4 py-3 rounded-xl text-sm font-mono tracking-widest uppercase"
            value={vin}
            onChange={(e) => { setVin(e.target.value.toUpperCase()); setVinError(""); setVinDetails(""); }}
            placeholder="17 символов VIN"
            maxLength={17}
          />
          <button
            onClick={handleVinDecode}
            disabled={vin.trim().length < 17 || vinLoading}
            className="btn-neon px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
          >
            {vinLoading
              ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
              : <Icon name="ScanLine" size={16} />
            }
            {vinLoading ? "Запрос..." : "Найти"}
          </button>
        </div>
        {vinError && (
          <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
            <Icon name="AlertCircle" size={12} />
            {vinError}
          </p>
        )}
        {vinDetails && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 flex items-center gap-2">
            <Icon name="CheckCircle" size={14} className="text-neon-cyan flex-shrink-0" />
            <p className="text-xs text-neon-cyan/80">{vinDetails}</p>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Автомобиль</label>
        <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={car} onChange={(e) => setCar(e.target.value)} placeholder="Марка, модель, год" />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Описание проблемы</label>
        <textarea className="input-neon w-full px-4 py-3 rounded-xl text-sm resize-none" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите симптомы или что нужно сделать..." />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Фото проблемы</label>
        <input id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
        {photos.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((p, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-neon-cyan/20 aspect-square">
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center">
                    <Icon name="X" size={10} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label htmlFor="photo-upload" className="aspect-square rounded-xl border border-dashed border-neon-cyan/30 flex items-center justify-center cursor-pointer hover:border-neon-cyan/60 hover:bg-neon-cyan/5 transition-all">
                  <Icon name="Plus" size={18} className="text-neon-cyan/50" />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono-tech">{photos.length} фото прикреплено</p>
          </>
        ) : (
          <label htmlFor="photo-upload" className="flex flex-col items-center justify-center gap-2 w-full py-5 rounded-xl border border-dashed border-neon-cyan/25 cursor-pointer hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
              <Icon name="Camera" size={20} className="text-neon-cyan" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white font-medium">Прикрепить фото</p>
              <p className="text-xs text-muted-foreground">до 6 фото · JPG, PNG</p>
            </div>
          </label>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        disabled={!selectedService || !car.trim() || loading}
        onClick={handleSubmit}
        className="btn-neon py-3 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
            Отправляем...
          </>
        ) : (
          <>
            <Icon name="Send" size={16} />
            Разослать мастерам
          </>
        )}
      </button>
    </div>
  );
}

function HistoryScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [filter, setFilter] = useState<"all" | Order["status"]>("all");
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "Все" },
          { key: "new", label: "Новые" },
          { key: "progress", label: "В работе" },
          { key: "done", label: "Выполнены" },
          { key: "cancelled", label: "Отменены" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key as "all" | "new" | "progress" | "done" | "cancelled")} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === f.key ? "bg-neon-cyan text-background" : "bg-secondary text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>
      {filtered.map((order, i) => (
        <div key={order.id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-mono-tech text-xs text-neon-cyan/70">{order.id}</p>
              <p className="font-semibold text-white text-sm mt-0.5">{order.service}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Icon name="User" size={12} className="mt-0.5 flex-shrink-0" />
              <span>{order.master} · {order.station}</span>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Icon name="Car" size={12} className="mt-0.5 flex-shrink-0" />
              <span>{order.car}</span>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Icon name="Calendar" size={12} className="mt-0.5 flex-shrink-0" />
              <span>{order.date}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-black text-white font-mono-tech">{order.price}</span>
            <div className="flex gap-2">
              {order.status === "done" && (
                <button onClick={() => setScreen("reviews")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/30">Отзыв</button>
              )}
              <button onClick={() => setScreen("chat")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">Чат</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatScreen() {
  const [message, setMessage] = useState("");
  const [msgs, setMsgs] = useState(chatMessages);

  const send = () => {
    if (!message.trim()) return;
    setMsgs([...msgs, { id: msgs.length + 1, mine: true, text: message, time: "сейчас" }]);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="card-neon rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className="relative">
          <Avatar initials="ДС" color="purple" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">Дмитрий Синицын</p>
          <p className="text-xs text-neon-green">Онлайн · TechDrive</p>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Icon name="Phone" size={14} className="text-neon-cyan" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Icon name="MoreVertical" size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-mono-tech text-muted-foreground px-3 py-1 rounded-full border border-border bg-secondary">ORD-2901 · BMW X5</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${m.mine ? "bubble-mine" : "bubble-other"} px-4 py-2.5`}>
              <p className="text-sm text-white leading-relaxed">{m.text}</p>
              <p className={`text-xs mt-1 ${m.mine ? "text-neon-cyan/50 text-right" : "text-muted-foreground"}`}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="Paperclip" size={16} className="text-muted-foreground" />
        </button>
        <input className="input-neon flex-1 px-4 py-2.5 rounded-xl text-sm" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Написать сообщение..." />
        <button onClick={send} className="w-10 h-10 rounded-xl btn-neon flex items-center justify-center flex-shrink-0">
          <Icon name="Send" size={16} />
        </button>
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="relative overflow-hidden rounded-2xl p-5 border border-neon-cyan/20" style={{ background: "linear-gradient(135deg, hsla(185,100%,10%,0.4) 0%, hsla(270,80%,15%,0.3) 100%)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-accent/30 flex items-center justify-center text-2xl font-black text-white border border-neon-cyan/30 glow-cyan">
            МС
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Михаил Семёнов</h2>
            <p className="text-sm text-muted-foreground">+7 (916) 245-78-32</p>
            <p className="text-xs text-neon-cyan font-mono-tech mt-1">ID: USR-00847</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[{ value: "5", label: "Заказов" }, { value: "4.8", label: "Рейтинг" }, { value: "3", label: "Отзыва" }].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-black text-white font-mono-tech">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Мои автомобили</h3>
          <span className="text-xs text-neon-cyan">+ Добавить</span>
        </div>
        {[
          { name: "Toyota Camry", year: "2021", plate: "А 847 МС 777", color: "Белый" },
          { name: "BMW X5", year: "2020", plate: "В 234 КО 750", color: "Серый" },
        ].map((car) => (
          <div key={car.plate} className="card-neon rounded-xl p-4 mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
              <Icon name="Car" size={20} className="text-neon-cyan" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{car.name} {car.year}</p>
              <p className="text-xs text-muted-foreground">{car.plate} · {car.color}</p>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Способы оплаты</h3>
          <span className="text-xs text-neon-cyan">+ Добавить</span>
        </div>
        {[
          { type: "Visa", last4: "4842", isDefault: true },
          { type: "Mir", last4: "9201", isDefault: false },
        ].map((card) => (
          <div key={card.last4} className="card-neon rounded-xl p-4 mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Icon name="CreditCard" size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{card.type} •••• {card.last4}</p>
              {card.isDefault && <p className="text-xs text-neon-green">Основная карта</p>}
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Настройки</h3>
        {[
          { icon: "Bell", label: "Уведомления", value: "Включены", danger: false },
          { icon: "Globe", label: "Язык", value: "Русский", danger: false },
          { icon: "Shield", label: "Безопасность", value: "", danger: false },
          { icon: "HelpCircle", label: "Поддержка", value: "", danger: false },
          { icon: "LogOut", label: "Выйти", value: "", danger: true },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <Icon name={item.icon} size={18} className={item.danger ? "text-destructive" : "text-neon-cyan"} />
            <span className={`flex-1 text-sm font-medium ${item.danger ? "text-destructive" : "text-white"}`}>{item.label}</span>
            {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsScreen() {
  const [notifs, setNotifs] = useState(notifications);
  const unread = notifs.filter(n => !n.read).length;

  const markRead = (id: number) => {
    setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const iconMap: Record<string, string> = { status: "Activity", message: "MessageCircle", promo: "Tag", review: "Star" };
  const colorMap: Record<string, string> = { status: "text-neon-cyan", message: "text-accent", promo: "text-neon-orange", review: "text-yellow-400" };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {unread > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{unread} непрочитанных</p>
          <button onClick={() => setNotifs(notifs.map(n => ({ ...n, read: true })))} className="text-xs text-neon-cyan">Прочитать все</button>
        </div>
      )}
      {notifs.map((n, i) => (
        <button key={n.id} onClick={() => markRead(n.id)} className={`card-neon rounded-xl p-4 text-left w-full transition-all animate-fade-in ${!n.read ? "border-neon-cyan/30" : "opacity-60"}`} style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? "bg-secondary" : "bg-neon-cyan/10"}`}>
              <Icon name={iconMap[n.type]} size={16} className={colorMap[n.type]} />
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

function ReviewsScreen() {
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

function AnalyticsScreen() {
  const months = ["Янв", "Фев", "Мар", "Апр", "Май"];
  const values = [42000, 58000, 51000, 67000, 73500];
  const maxVal = Math.max(...values);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex gap-2">
        {["Неделя", "Месяц", "Квартал", "Год"].map((p, i) => (
          <button key={p} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i === 1 ? "bg-neon-cyan text-background" : "bg-secondary text-muted-foreground"}`}>{p}</button>
        ))}
      </div>

      <div className="card-neon rounded-xl p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Выручка за май</p>
        <p className="text-3xl font-black text-white font-mono-tech glow-text-cyan">73 500 <span className="text-lg">₽</span></p>
        <p className="text-xs text-neon-green mt-1">↑ +9.7% к прошлому месяцу</p>
        <div className="flex items-end gap-2 mt-5 h-24">
          {values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg transition-all" style={{ height: `${(v / maxVal) * 80}px`, background: i === values.length - 1 ? "linear-gradient(180deg, hsl(185,100%,50%), hsl(185,100%,30%))" : "hsla(185,100%,50%,0.2)", boxShadow: i === values.length - 1 ? "0 0 12px hsla(185,100%,50%,0.4)" : "none" }} />
              <span className="text-xs text-muted-foreground">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Заказов выполнено", value: "24", delta: "+3", icon: "CheckCircle", color: "text-neon-green" },
          { label: "Средний чек", value: "3 063 ₽", delta: "+12%", icon: "TrendingUp", color: "text-neon-cyan" },
          { label: "Новых клиентов", value: "8", delta: "+2", icon: "Users", color: "text-accent" },
          { label: "Рейтинг", value: "4.9 ★", delta: "+0.1", icon: "Star", color: "text-yellow-400" },
        ].map((m) => (
          <div key={m.label} className="card-neon rounded-xl p-4">
            <Icon name={m.icon} size={18} className={m.color} />
            <p className="text-xl font-black text-white font-mono-tech mt-2">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-xs text-neon-green mt-1">↑ {m.delta}</p>
          </div>
        ))}
      </div>

      <div className="card-neon rounded-xl p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Топ услуг по выручке</p>
        {[
          { name: "Замена масла", revenue: 18500, pct: 100 },
          { name: "Диагностика", revenue: 14200, pct: 77 },
          { name: "Тормоза", revenue: 12800, pct: 69 },
          { name: "Ходовая", revenue: 9500, pct: 51 },
          { name: "Электрика", revenue: 7200, pct: 39 },
        ].map((s) => (
          <div key={s.name} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white">{s.name}</span>
              <span className="font-mono-tech text-neon-cyan">{s.revenue.toLocaleString("ru")} ₽</span>
            </div>
            <div className="progress-neon h-2">
              <div className="progress-neon-fill h-full" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card-neon rounded-xl p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Заказы по статусу</p>
        <div className="flex gap-3">
          {[
            { label: "Выполнено", count: 24, color: "bg-neon-green" },
            { label: "В работе", count: 3, color: "bg-neon-orange" },
            { label: "Новые", count: 5, color: "bg-neon-cyan" },
            { label: "Отменено", count: 2, color: "bg-destructive" },
          ].map((s) => (
            <div key={s.label} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full ${s.color} mb-2 mx-auto`} style={{ width: `${(s.count / 34) * 100}%` }} />
              <p className="text-lg font-black text-white font-mono-tech">{s.count}</p>
              <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const navItems = [
  { id: "home", icon: "Home", label: "Главная" },
  { id: "history", icon: "ClipboardList", label: "Заказы" },
  { id: "new-request", icon: "PlusCircle", label: "Запрос" },
  { id: "chat", icon: "MessageCircle", label: "Чат" },
  { id: "analytics", icon: "BarChart2", label: "Аналитика" },
];

const screenTitles: Record<Screen, string> = {
  home: "AutoTech",
  "new-request": "Новый запрос",
  history: "История заказов",
  chat: "Чат с мастером",
  profile: "Профиль",
  notifications: "Уведомления",
  reviews: "Отзывы",
  analytics: "Аналитика",
};

export default function Index() {
  const [screen, setScreen] = useState<Screen>("home");
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background grid-bg flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen relative">
        <div className="h-1 bg-gradient-to-r from-neon-cyan via-accent to-neon-cyan opacity-60" />

        <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ background: "hsla(220,20%,5%,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid hsla(185,100%,50%,0.1)" }}>
          <div className="flex items-center gap-3">
            {screen !== "home" && (
              <button onClick={() => setScreen("home")} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="ChevronLeft" size={18} className="text-neon-cyan" />
              </button>
            )}
            {screen === "home" ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono-tech glow-text-cyan text-neon-cyan">AUTO</span>
                <span className="text-xl font-black text-white">TECH</span>
                <span className="ml-1 text-xs font-mono-tech text-neon-cyan/50 border border-neon-cyan/20 px-1.5 py-0.5 rounded-md">v2.0</span>
              </div>
            ) : (
              <h1 className="text-base font-bold text-white">{screenTitles[screen]}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScreen("notifications")} className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <Icon name="Bell" size={18} className="text-foreground/70" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-cyan text-background text-xs font-bold font-mono-tech flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setScreen("profile")} className="w-9 h-9 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center text-xs font-bold text-neon-cyan">
              МС
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 overflow-y-auto" style={{ paddingBottom: "100px" }}>
          {screen === "home" && <HomeScreen setScreen={setScreen} />}
          {screen === "new-request" && <NewRequestScreen setScreen={setScreen} />}
          {screen === "history" && <HistoryScreen setScreen={setScreen} />}
          {screen === "chat" && <ChatScreen />}
          {screen === "profile" && <ProfileScreen />}
          {screen === "notifications" && <NotificationsScreen />}
          {screen === "reviews" && <ReviewsScreen />}
          {screen === "analytics" && <AnalyticsScreen />}
        </main>

        <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-2 pt-2 pb-4">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button key={item.id} onClick={() => setScreen(item.id as Screen)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${active ? "bg-neon-cyan/10" : ""}`}>
                  {item.id === "new-request" ? (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 ${active ? "btn-neon glow-cyan" : "bg-secondary border border-border"}`}>
                      <Icon name={item.icon} size={24} className={active ? "text-background" : "text-muted-foreground"} />
                    </div>
                  ) : (
                    <Icon name={item.icon} size={22} className={active ? "text-neon-cyan" : "text-muted-foreground"} />
                  )}
                  {item.id !== "new-request" && (
                    <span className={`text-xs font-medium ${active ? "text-neon-cyan" : "text-muted-foreground"}`}>{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}