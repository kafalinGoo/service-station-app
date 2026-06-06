import Icon from "@/components/ui/icon";
import { Screen, Master, masters } from "./appTypes";
import { Stars, Avatar } from "./appHelpers";

export function HomeScreen({ setScreen, goToNewRequest }: { setScreen: (s: Screen) => void; goToNewRequest: (masterId?: number) => void }) {
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
            { icon: "Droplets", label: "ТО" },
            { icon: "Zap", label: "Электрика" },
            { icon: "_chassis", label: "Ходовая" },
            { icon: "Shield", label: "Кузов" },
            { icon: "Wind", label: "Климат" },
            { icon: "Settings", label: "Двигатель" },
            { icon: "_tires", label: "Шины" },
            { icon: "Languages", label: "Русификация" },
            { icon: "MoreHorizontal", label: "Другое" },
          ].map((c) => (
            <button key={c.label} onClick={() => goToNewRequest()} className="card-neon rounded-xl p-3 flex flex-col items-center gap-1.5 hover:scale-105 transition-transform">
              {c.icon === "_chassis" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-neon-cyan" style={{ filter: "drop-shadow(0 0 3px currentColor)" }}>
                  <circle cx="6" cy="17" r="3"/>
                  <circle cx="18" cy="17" r="3"/>
                  <path d="M9 17h6"/>
                  <path d="M3 17V9l3-4h12l3 4v8"/>
                  <path d="M6 9h12"/>
                </svg>
              ) : c.icon === "_tires" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-neon-cyan" style={{ filter: "drop-shadow(0 0 3px currentColor)" }}>
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
          <span className="text-xs text-neon-cyan font-mono-tech">Все →</span>
        </div>
        <div className="flex flex-col gap-3">
          {masters.map((m: Master, i: number) => (
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