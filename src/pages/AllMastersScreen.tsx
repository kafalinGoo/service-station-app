import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { API, ordersWord } from "./appTypes";
import { Stars, Avatar } from "./appHelpers";

interface ApiMaster {
  id: number;
  name: string;
  station: string;
  specialty: string;
  rating: number;
  reviews_count: number;
  completed_orders: number;
  online: boolean;
  avatar: string;
  address: string | null;
  city: string | null;
}

interface Props {
  city: string;
  onBack: () => void;
  goToNewRequest: (masterId?: number) => void;
}

const SPECIALTIES = ["ТО", "Двигатели", "Электрика", "Ходовая", "Кузов", "Шиномонтаж", "Русификация"];

export function AllMastersScreen({ city, onBack, goToNewRequest }: Props) {
  const [masters, setMasters] = useState<ApiMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityInput, setCityInput] = useState(city);
  const [appliedCity, setAppliedCity] = useState(city);
  const [activeSpec, setActiveSpec] = useState<string | null>(null);

  const fetchMasters = async (c: string) => {
    setLoading(true);
    try {
      const url = c.trim()
        ? `${API.getBids}?mode=masters&city=${encodeURIComponent(c.trim())}`
        : `${API.getBids}?mode=masters`;
      const res = await fetch(url);
      const data = await res.json();
      setMasters(data.masters || []);
    } catch {
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters(appliedCity);
  }, [appliedCity]);

  const filtered = activeSpec
    ? masters.filter(m => m.specialty.toLowerCase().includes(activeSpec.toLowerCase()))
    : masters;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"
        >
          <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Все мастера</h2>
          <p className="text-xs text-muted-foreground">
            По рейтингу · {filtered.length} {filtered.length !== masters.length ? `из ${masters.length}` : "найдено"}
          </p>
        </div>
      </div>

      {/* Фильтр по городу */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border">
          <Icon name="MapPin" size={14} className="text-neon-cyan flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAppliedCity(cityInput)}
            placeholder="Город..."
          />
          {cityInput && (
            <button onClick={() => { setCityInput(""); setAppliedCity(""); }}
              className="text-muted-foreground hover:text-white transition-colors">
              <Icon name="X" size={13} />
            </button>
          )}
        </div>
        <button
          onClick={() => setAppliedCity(cityInput)}
          className="btn-neon px-4 rounded-xl text-sm font-semibold"
        >
          Найти
        </button>
      </div>

      {/* Фильтр по специализации */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSpec(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            activeSpec === null
              ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
              : "border-border text-muted-foreground hover:border-neon-cyan/30"
          }`}
        >
          Все
        </button>
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSpec(activeSpec === s ? null : s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeSpec === s
                ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                : "border-border text-muted-foreground hover:border-neon-cyan/30"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card-neon rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 bg-secondary rounded w-2/3" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                  <div className="h-3 bg-secondary rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-neon rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <Icon name="SearchX" size={32} className="text-muted-foreground/40" />
          <p className="text-sm font-semibold text-white">Мастера не найдены</p>
          <p className="text-xs text-muted-foreground">
            {activeSpec
              ? `Нет мастеров по специализации «${activeSpec}»${appliedCity ? ` в городе «${appliedCity}»` : ""}`
              : appliedCity
                ? `В городе «${appliedCity}» мастеров пока нет`
                : "Нет зарегистрированных мастеров"}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {activeSpec && (
              <button onClick={() => setActiveSpec(null)}
                className="text-xs text-neon-cyan underline underline-offset-2">
                Сбросить специализацию
              </button>
            )}
            {appliedCity && (
              <button onClick={() => { setCityInput(""); setAppliedCity(""); }}
                className="text-xs text-neon-cyan underline underline-offset-2">
                Показать всех мастеров
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((m, i) => (
            <div key={m.id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar initials={m.avatar || m.name.slice(0, 2).toUpperCase()} />
                  {m.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background neon-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.station}</p>
                    </div>
                    <span className="text-xs font-mono-tech text-neon-cyan/60 flex-shrink-0 ml-2">
                      {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                  </div>
                  {m.address && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Icon name="MapPin" size={10} className="text-muted-foreground/60 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground/60 truncate">{m.address}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Stars rating={m.rating} />
                    <span className="text-xs font-mono-tech text-neon-cyan">{m.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">· {m.reviews_count} отзывов</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 truncate max-w-[60%]">
                      {m.specialty}
                    </span>
                    {m.completed_orders > 0 && (
                      <span className="text-xs font-mono-tech"><span className="text-neon-cyan">{m.completed_orders}</span> <span className="text-white">{ordersWord(m.completed_orders)}</span></span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => goToNewRequest(m.id)}
                className="w-full mt-3 py-2 rounded-lg text-xs font-bold btn-neon"
              >
                Записаться
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}