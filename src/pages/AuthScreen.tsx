import { useState } from "react";
import Icon from "@/components/ui/icon";
import { API, AuthUser, storeUser } from "./appTypes";

interface Props {
  onAuth: (user: AuthUser) => void;
}

type Mode = "login" | "register";
type Role = "client" | "master";

const SPECIALTIES = ["ТО", "Двигатели", "Электрика", "Ходовая", "Кузов", "Шиномонтаж", "Русификация"];

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("client");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [station, setStation] = useState("");
  const [address, setAddress] = useState("");
  const [specialty, setSpecialty] = useState("ТО");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    let d = digits.startsWith("8") ? "7" + digits.slice(1) : digits;
    if (!d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    let result = "+7";
    if (d.length > 1) result += " (" + d.slice(1, 4);
    if (d.length > 4) result += ") " + d.slice(4, 7);
    if (d.length > 7) result += "-" + d.slice(7, 9);
    if (d.length > 9) result += "-" + d.slice(9, 11);
    return result;
  };

  const rawPhone = (formatted: string) => "+" + formatted.replace(/\D/g, "");

  const handleSubmit = async () => {
    setError("");
    const phoneRaw = rawPhone(phone);
    if (phoneRaw.length < 12) { setError("Введите корректный номер телефона"); return; }
    if (password.length < 6) { setError("Пароль должен быть не менее 6 символов"); return; }
    if (mode === "register" && !name.trim()) { setError("Введите имя"); return; }

    setLoading(true);
    try {
      const bodyData: Record<string, string> = mode === "login"
        ? { action: "login", phone: phoneRaw, password }
        : { action: "register", phone: phoneRaw, password, name: name.trim(), role, specialty, station: station.trim() || "Моя станция", address: address.trim() || undefined };

      const res = await fetch(API.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;

      if (!res.ok) {
        setError(data.error || "Произошла ошибка");
        return;
      }

      const user: AuthUser = { ...data };
      storeUser(user);
      onAuth(user);
    } catch {
      setError("Ошибка соединения. Проверьте интернет.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex justify-center items-center px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-6">

        {/* Лого */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl font-black font-mono-tech glow-text-cyan text-neon-cyan">AUTO</span>
            <span className="text-3xl font-black text-white">TECH</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest">Система ТО v2.0</p>
        </div>

        {/* Карточка */}
        <div className="card-neon rounded-2xl p-6 flex flex-col gap-5">

          {/* Переключатель режима */}
          <div className="flex rounded-xl bg-secondary p-1 gap-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? "bg-neon-cyan text-background" : "text-muted-foreground"}`}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          {/* Роль (только при регистрации) */}
          {mode === "register" && (
            <div className="flex gap-2">
              {([["client", "Клиент", "User"], ["master", "Мастер", "Wrench"]] as [Role, string, string][]).map(([r, label, icon]) => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${role === r ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-border text-muted-foreground hover:border-neon-cyan/30"}`}>
                  <Icon name={icon} size={15} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Имя */}
          {mode === "register" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Имя</label>
              <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" />
            </div>
          )}

          {/* Телефон */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Телефон</label>
            <div className="relative">
              <Icon name="Phone" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="input-neon w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono tracking-wide"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                inputMode="tel" />
            </div>
          </div>

          {/* Пароль */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Пароль</label>
            <div className="relative">
              <Icon name="Lock" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="input-neon w-full pl-10 pr-11 py-3 rounded-xl text-sm"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder={mode === "register" ? "Минимум 6 символов" : "Введите пароль"} />
              <button onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon-cyan transition-colors">
                <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
              </button>
            </div>
          </div>

          {/* Поля мастера */}
          {mode === "register" && role === "master" && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Название станции</label>
                <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={station}
                  onChange={(e) => setStation(e.target.value)} placeholder="Например: AutoPro Сервис" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Адрес</label>
                <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={address}
                  onChange={(e) => setAddress(e.target.value)} placeholder="Например: ул. Ленина, 15" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Специализация</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button key={s} onClick={() => setSpecialty(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${specialty === s ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-border text-muted-foreground hover:border-neon-cyan/30"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ошибка */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30">
              <Icon name="AlertCircle" size={14} className="text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Кнопка */}
          <button onClick={handleSubmit} disabled={loading}
            className="btn-neon py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Подождите...</>
              : <><Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={16} />{mode === "login" ? "Войти" : "Создать аккаунт"}</>
            }
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground/50">AutoTech · Система управления ТО</p>
      </div>
    </div>
  );
}