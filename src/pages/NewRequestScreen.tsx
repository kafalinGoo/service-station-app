import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  API, Screen, Bid, AuthUser,
  masters, services, CAR_LIST,
  loadUserCars,
} from "./appTypes";
import { Stars } from "./appHelpers";

export function NewRequestScreen({ setScreen, targetMasterId, user }: { setScreen: (s: Screen) => void; targetMasterId: number | null; user: AuthUser }) {
  const [selectedService, setSelectedService] = useState("");
  const [description, setDescription] = useState("");
  const [car, setCar] = useState(() => {
    const saved = loadUserCars();
    return saved.length === 1 ? saved[0].model : "";
  });
  const [city, setCity] = useState("");
  const [cityLoading, setCityLoading] = useState(false);
  const [cityEdit, setCityEdit] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [carFocused, setCarFocused] = useState(false);
  const carSuggestions = car.trim().length >= 2
    ? CAR_LIST.filter(c => c.toLowerCase().includes(car.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    if (targetMasterId) return;
    setCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=ru`,
            { headers: { "User-Agent": "AutoTechApp/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const detected = addr.city || addr.town || addr.village || addr.municipality || "";
          if (detected) { setCity(detected); setCityInput(detected); }
        } catch { /* ignore */ }
        finally { setCityLoading(false); }
      },
      () => { setCityLoading(false); }
    );
  }, [targetMasterId]);

  const [vin, setVin] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");
  const [vinDetails, setVinDetails] = useState("");

  const handleVinDecode = async () => {
    const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (cleaned.length !== 17) { setVinError("VIN должен содержать 17 символов"); return; }
    setVinLoading(true); setVinError(""); setVinDetails("");
    try {
      const res = await fetch(`${API.decodeVin}?vin=${cleaned}`);
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok || data.error) { setVinError(data.error || "VIN не распознан"); }
      else { setCar(data.car); setVinDetails(data.details || ""); }
    } catch { setVinError("Ошибка соединения"); }
    finally { setVinLoading(false); }
  };

  const [requestId, setRequestId] = useState<number | null>(null);
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [bids, setBids] = useState<Bid[]>([]);
  const [polling, setPolling] = useState(false);
  const [requestTargetMasterId, setRequestTargetMasterId] = useState<number | null>(null);

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
      if (parsed.request?.target_master_id != null) {
        setRequestTargetMasterId(parsed.request.target_master_id);
      }
    } catch (_) { /* ignore polling errors */ }
  }, []);

  useEffect(() => {
    if (!requestId || !polling) return;
    fetchBids(requestId);
    const interval = setInterval(() => fetchBids(requestId), 5000);
    return () => clearInterval(interval);
  }, [requestId, polling, fetchBids]);

  const handleSubmit = async () => {
    if (!selectedService || !car.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(API.createRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selectedService,
          car: car.trim(),
          description,
          client_id: user.id,
          ...(city ? { city } : {}),
          ...(targetMasterId ? { master_id: targetMasterId } : {}),
        }),
      });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      setRequestId(data.request_id);
      setNotifiedCount(data.notified_masters);
      setPolling(true);
    } catch { setError("Не удалось отправить запрос. Проверьте соединение."); }
    finally { setLoading(false); }
  };

  // ── Экран ожидания откликов ──────────────────────────────────────────────
  if (requestId) {
    return (
      <div className="flex flex-col gap-5 pb-4 animate-fade-in">
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

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Отклики мастеров</h3>
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
            <div className="card-neon rounded-xl p-6 flex flex-col items-center gap-3 text-center">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 neon-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Мастера получили запрос и скоро начнут отвечать</p>
              <p className="text-xs text-muted-foreground/60">Обычно первые отклики приходят за 5–15 минут</p>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 neon-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bids.map((bid, i) => (
                <div key={bid.bid_id} className="card-neon rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  {requestTargetMasterId === bid.master.id && (
                    <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 w-fit">
                      <Icon name="Star" size={12} className="text-accent" />
                      <span className="text-xs font-semibold text-accent">Персональный запрос</span>
                    </div>
                  )}
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
                      {bid.master.address && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Icon name="MapPin" size={10} className="text-muted-foreground/60 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground/60">{bid.master.address}</p>
                        </div>
                      )}
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
                    <button onClick={() => setScreen("chat")} className="flex-1 py-2 rounded-lg text-xs font-bold border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-all">
                      Написать
                    </button>
                    <button className="flex-1 py-2 rounded-lg text-xs font-bold btn-neon">Принять</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setScreen("home")} className="py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold">
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
        {targetMasterId ? (() => {
          const m = masters.find(x => x.id === targetMasterId);
          return m ? (
            <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
              <Icon name="User" size={14} className="text-neon-cyan flex-shrink-0" />
              <p className="text-xs text-neon-cyan">Запрос уйдёт напрямую — <span className="font-semibold">{m.name}</span>, {m.station}</p>
            </div>
          ) : null;
        })() : (
          <p className="text-xs text-muted-foreground">Запрос будет разослан всем мастерам по выбранной категории</p>
        )}
      </div>

      {!targetMasterId && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border">
          <Icon name="MapPin" size={14} className="text-neon-cyan flex-shrink-0" />
          {cityLoading ? (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-3 h-3 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
              <span className="text-xs text-muted-foreground">Определяю город...</span>
            </div>
          ) : cityEdit ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                className="input-neon flex-1 px-2 py-1 rounded-lg text-xs"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Введите город"
                autoFocus
              />
              <button onClick={() => { setCity(cityInput.trim()); setCityEdit(false); }}
                className="text-xs text-neon-cyan font-semibold px-2 py-1 rounded-lg hover:bg-neon-cyan/10 transition-colors">
                Ок
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-1">
              <span className="text-sm text-white">{city || <span className="text-muted-foreground">Город не определён</span>}</span>
              <button onClick={() => { setCityInput(city); setCityEdit(true); }}
                className="text-xs text-muted-foreground hover:text-neon-cyan transition-colors flex items-center gap-1">
                <Icon name="Pencil" size={11} />изменить
              </button>
            </div>
          )}
        </div>
      )}

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
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">ОПРЕДЕЛИТЬ АВТОМОБИЛЬ ПО VIN</label>
        <div className="flex gap-2">
          <input
            className="input-neon flex-1 px-4 py-3 rounded-xl text-sm font-mono tracking-widest uppercase"
            value={vin}
            onChange={(e) => { setVin(e.target.value.toUpperCase()); setVinError(""); setVinDetails(""); }}
            placeholder="17 символов VIN"
            maxLength={17}
          />
          <button onClick={handleVinDecode} disabled={vin.trim().length < 17 || vinLoading}
            className="btn-neon px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap">
            {vinLoading
              ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
              : <Icon name="ScanLine" size={16} />}
            {vinLoading ? "Запрос..." : "Найти"}
          </button>
        </div>
        {vinError && (
          <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
            <Icon name="AlertCircle" size={12} />{vinError}
          </p>
        )}
        {vinDetails && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 flex items-center gap-2">
            <Icon name="CheckCircle" size={14} className="text-neon-cyan flex-shrink-0" />
            <p className="text-xs text-neon-cyan/80">{vinDetails}</p>
          </div>
        )}
      </div>

      <div className="relative">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Автомобиль</label>
        <input
          className="input-neon w-full px-4 py-3 rounded-xl text-sm"
          value={car}
          onChange={(e) => setCar(e.target.value)}
          onFocus={() => setCarFocused(true)}
          onBlur={() => setTimeout(() => setCarFocused(false), 150)}
          placeholder="Начните вводить марку и модель..."
          autoComplete="off"
        />
        {carFocused && carSuggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-neon-cyan/20 bg-[hsl(220,20%,8%)] shadow-xl overflow-hidden animate-scale-in">
            {carSuggestions.map((s, i) => {
              const idx = s.toLowerCase().indexOf(car.toLowerCase());
              return (
                <button key={i} onMouseDown={() => { setCar(s); setCarFocused(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-neon-cyan/10 transition-colors flex items-center gap-3 border-b border-border/40 last:border-0">
                  <Icon name="Car" size={14} className="text-neon-cyan/50 flex-shrink-0" />
                  <span className="text-foreground/70">
                    {s.slice(0, idx)}
                    <span className="text-neon-cyan font-semibold">{s.slice(idx, idx + car.length)}</span>
                    {s.slice(idx + car.length)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
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

      <button disabled={!selectedService || !car.trim() || loading} onClick={handleSubmit}
        className="btn-neon py-3 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? (
          <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Отправляем...</>
        ) : (
          <><Icon name="Send" size={16} />Отправить</>
        )}
      </button>
    </div>
  );
}