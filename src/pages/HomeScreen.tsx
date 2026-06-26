import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Screen, ApiMaster, API, ordersWord } from "./appTypes";
import { Stars, Avatar } from "./appHelpers";

export function HomeScreen({ setScreen, goToNewRequest, onShowAllMasters }: { setScreen: (s: Screen) => void; goToNewRequest: (masterId?: number, service?: string) => void; onShowAllMasters: () => void }) {
  const [masters, setMasters] = useState<ApiMaster[]>([]);

  useEffect(() => {
    fetch(`${API.getBids}?mode=masters`)
      .then(r => r.json())
      .then(d => setMasters((d.masters || []).slice(0, 4)))
      .catch(() => {});
  }, []);

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
          <button onClick={() => goToNewRequest()} className="btn-neon px-5 py-2.5 rounded-xl text-sm font-bold">
            + Новый запрос
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Мастеров", value: "247", icon: "Wrench", color: "text-neon-cyan" },
          { label: "Станций", value: "38", icon: "Building2", color: "text-accent" },
          { label: "Заказов", value: "12K+", icon: "CheckCircle", color: "text-neon-orange" },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl p-4 text-center" style={{ background: "hsla(220,20%,9%,0.8)", border: "1px solid hsla(220,20%,20%,0.5)" }}>
            <div className={`absolute inset-0 opacity-5`} style={{ background: `radial-gradient(circle at 50% 0%, currentColor, transparent 70%)` }} />
            <div className={`text-2xl font-black font-mono-tech ${s.color}`}>{s.value}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Icon name={s.icon} size={11} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold uppercase tracking-widest mb-3 text-sm text-gray-200">Категории услуг</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: "Droplets", label: "ТО", service: "Замена масла и фильтров" },
            { icon: "Zap", label: "Электрика", service: "Электрика" },
            { icon: "_chassis", label: "Ходовая", service: "Ходовая часть" },
            { icon: "Shield", label: "Кузов", service: "Кузовные работы" },
            { icon: "Wind", label: "Климат", service: "Кондиционер" },
            { icon: "Settings", label: "Двигатель", service: "Диагностика двигателя" },
            { icon: "_tires", label: "Шины", service: "Шиномонтаж" },
            { icon: "Languages", label: "Русификация", service: "Русификация" },
            { icon: "MoreHorizontal", label: "Другое", service: "Другое" },
          ].map((c) => (
            <button key={c.label} onClick={() => goToNewRequest(undefined, c.service)} className="card-neon rounded-xl p-3 flex flex-col items-center gap-1.5 hover:scale-105 transition-transform">
              {c.icon === "_chassis" ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-neon-cyan">
                  <rect x="0" y="1" width="6.5" height="4" rx="1.2"/>
                  <rect x="17.5" y="1" width="6.5" height="4" rx="1.2"/>
                  <rect x="0" y="19" width="6.5" height="4" rx="1.2"/>
                  <rect x="17.5" y="19" width="6.5" height="4" rx="1.2"/>
                  <rect x="6.5" y="2.5" width="5" height="1" rx="0.5"/>
                  <rect x="12.5" y="2.5" width="5" height="1" rx="0.5"/>
                  <rect x="6.5" y="20.5" width="5" height="1" rx="0.5"/>
                  <rect x="12.5" y="20.5" width="5" height="1" rx="0.5"/>
                  <circle cx="12" cy="5" r="2.2"/>
                  <circle cx="12" cy="19" r="2.2"/>
                  <rect x="11.2" y="7.2" width="1.6" height="9.6" rx="0.8"/>
                </svg>
              ) : c.icon === "_tires" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-neon-cyan">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="7"/>
                  <circle cx="12" cy="12" r="2.5"/>
                  <line x1="12" y1="9.5" x2="12" y2="5"/>
                  <line x1="14.6" y1="10.5" x2="18.3" y2="7.5"/>
                  <line x1="14.6" y1="13.5" x2="18.3" y2="16.5"/>
                  <line x1="12" y1="14.5" x2="12" y2="19"/>
                  <line x1="9.4" y1="13.5" x2="5.7" y2="16.5"/>
                  <line x1="9.4" y1="10.5" x2="5.7" y2="7.5"/>
                </svg>
              ) : (
                <Icon name={c.icon} size={20} className="text-neon-cyan" />
              )}
              <span className="text-xs text-foreground/70">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-200">Топ мастера</h3>
          <button onClick={onShowAllMasters} className="text-xs text-neon-cyan font-mono-tech hover:text-neon-cyan/70 transition-colors">Все →</button>
        </div>
        <div className="flex flex-col gap-3">
          {masters.map((m, i) => (
            <div key={m.id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar initials={m.avatar || m.name.slice(0, 2).toUpperCase()} />
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
                    <span className="text-xs font-mono-tech text-neon-cyan">{m.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">{m.reviews_count} отзывов</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{m.specialty}</span>
                    {m.completed_orders > 0 && <span className="font-mono-tech text-xs font-medium"><span className="text-neon-cyan">{m.completed_orders}</span> <span className="text-white"> {ordersWord(m.completed_orders)}</span></span>}
                  </div>
                </div>
              </div>
              <button onClick={() => goToNewRequest(m.id)} className="w-full mt-3 py-2 rounded-lg text-xs font-bold btn-neon">
                Записаться
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
