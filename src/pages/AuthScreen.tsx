import { useState } from "react";
import Icon from "@/components/ui/icon";
import { API, AuthUser, storeUser, SPECIALTIES } from "./appTypes";
import { PrivacyScreen } from "./PrivacyScreen";

interface Props {
  onAuth: (user: AuthUser) => void;
}

type Mode = "login" | "register";
type Role = "client" | "master";

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("client");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [station, setStation] = useState("");
  const [address, setAddress] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
        : { action: "register", phone: phoneRaw, password, name: name.trim(), role, specialty: specialties.join(", ") || "ТО", station: station.trim() || "Моя станция", address: address.trim() || undefined, privacy_version: "2026-06-12" };

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
          <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest">Сборка 1.0</p>
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
                  onChange={(e) => setAddress(e.target.value)} placeholder="Например: г. Москва, ул. Ленина, 15" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                  Специализация
                  {specialties.length > 0 && <span className="text-neon-cyan ml-1 normal-case font-normal">· выбрано {specialties.length}</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => {
                    const active = specialties.includes(s);
                    return (
                      <button key={s} onClick={() => setSpecialties(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-border text-muted-foreground hover:border-neon-cyan/30"}`}>
                        {active && <span className="mr-1">✓</span>}{s}
                      </button>
                    );
                  })}
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
          <button onClick={handleSubmit} disabled={loading || (mode === "register" && !agreed)}
            className="btn-neon py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Подождите...</>
              : <><Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={16} />{mode === "login" ? "Войти" : "Создать аккаунт"}</>
            }
          </button>

          {/* Согласие (только при регистрации) */}
          {mode === "register" && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${agreed ? "bg-neon-cyan border-neon-cyan" : "border-border bg-transparent hover:border-neon-cyan/50"}`}
              >
                {agreed && <Icon name="Check" size={12} className="text-background" />}
              </button>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Я соглашаюсь с{" "}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowPrivacy(true); }}
                  className="text-neon-cyan underline underline-offset-2 hover:text-neon-cyan/70 transition-colors"
                >
                  политикой конфиденциальности
                </button>{" "}
                и даю согласие на обработку персональных данных
              </span>
            </label>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/50">AutoTech · Персональный ассистент в мире авторемонта</p>
      </div>

      {/* Модал политики конфиденциальности */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "hsla(220,20%,3%,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-[430px] bg-[hsl(220,20%,7%)] border border-neon-cyan/20 rounded-t-3xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
              <h3 className="text-base font-bold text-white">Политика конфиденциальности</h3>
              <button onClick={() => setShowPrivacy(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="X" size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <PrivacyScreen onBack={() => setShowPrivacy(false)} hideBackButton />
            </div>
            <div className="px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => { setAgreed(true); setShowPrivacy(false); }}
                className="btn-neon w-full py-3 rounded-xl font-bold text-sm">
                Принимаю и соглашаюсь
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}