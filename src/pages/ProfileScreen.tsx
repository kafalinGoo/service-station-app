import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  API, AuthUser, UserCar,
  CAR_LIST,
  loadUserCars, saveUserCars,
} from "./appTypes";

export function ProfileScreen({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [cars, setCars] = useState<UserCar[]>(() => {
    const saved = loadUserCars();
    return saved.length ? saved : [
      { id: "1", model: "Toyota Camry 2021", plate: "А 847 МС 777", color: "Белый" },
      { id: "2", model: "BMW X5 2020", plate: "В 234 КО 750", color: "Серый" },
    ];
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formModel, setFormModel] = useState("");
  const [formPlate, setFormPlate] = useState("");

  const [modelFocused, setModelFocused] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formVin, setFormVin] = useState("");
  const [formVinLoading, setFormVinLoading] = useState(false);
  const [formVinError, setFormVinError] = useState("");

  // ── Редактирование профиля мастера ────────────────────────────────────────
  const SPECIALTIES = ["ТО", "Двигатели", "Электрика", "Ходовая", "Кузов", "Шиномонтаж", "Русификация"];
  const [editMaster, setEditMaster] = useState(false);
  const [masterStation, setMasterStation] = useState("");
  const [masterSpecialties, setMasterSpecialties] = useState<string[]>([]);
  const [masterAddress, setMasterAddress] = useState("");
  const [masterCity, setMasterCity] = useState("");
  const [masterPriceFrom, setMasterPriceFrom] = useState("");
  const [masterRating, setMasterRating] = useState<number | null>(null);
  const [masterReviewsCount, setMasterReviewsCount] = useState(0);
  const [masterSaving, setMasterSaving] = useState(false);
  const [masterError, setMasterError] = useState("");
  const [masterSuccess, setMasterSuccess] = useState(false);

  const [masterLoading, setMasterLoading] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);

  useEffect(() => {
    if (user.role !== "master" || !user.master_id || masterLoaded) return;
    setMasterLoaded(true);
    fetch(`${API.getBids}?master_id=${user.master_id}&mode=master_info`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (data.id) {
          setMasterStation(data.station || "");
          setMasterSpecialties(data.specialty ? data.specialty.split(", ").filter(Boolean) : []);
          setMasterAddress(data.address || "");
          setMasterCity(data.city || "");
          setMasterPriceFrom(data.price_from ? String(data.price_from) : "");
          setMasterRating(data.rating ?? null);
          setMasterReviewsCount(data.reviews_count ?? 0);
          setNotificationsEnabled(data.notifications_enabled !== false);
        }
      })
      .catch(() => { /* ignore */ });
  }, [user.master_id, user.role, masterLoaded]);

  const openEditMaster = async () => {
    if (!user.master_id) return;
    setMasterError(""); setMasterSuccess(false); setMasterLoading(true);
    try {
      const res = await fetch(`${API.getBids}?master_id=${user.master_id}&mode=master_info`);
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (res.ok && data.id) {
        setMasterStation(data.station || "");
        setMasterSpecialties(data.specialty ? data.specialty.split(", ").filter(Boolean) : []);
        setMasterAddress(data.address || "");
        setMasterCity(data.city || "");
        setMasterPriceFrom(data.price_from ? String(data.price_from) : "");
        setMasterRating(data.rating ?? null);
        setMasterReviewsCount(data.reviews_count ?? 0);
      }
    } catch { /* ignore */ }
    finally { setMasterLoading(false); }
    setEditMaster(true);
  };

  const handleSaveMaster = async () => {
    if (!user.master_id) return;
    setMasterSaving(true); setMasterError(""); setMasterSuccess(false);
    try {
      const payload: Record<string, string | number> = { action: "update_master", master_id: user.master_id };
      if (masterStation.trim()) payload.station = masterStation.trim();
      if (masterSpecialties.length) payload.specialty = masterSpecialties.join(", ");
      payload.address = masterAddress.trim();
      if (masterPriceFrom) payload.price_from = parseInt(masterPriceFrom) || 0;
      const res = await fetch(API.auth, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok) { setMasterError(data.error || "Ошибка"); return; }
      if (data.city) setMasterCity(data.city);
      setMasterSuccess(true);
      setTimeout(() => { setEditMaster(false); setMasterSuccess(false); }, 1200);
    } catch { setMasterError("Ошибка соединения"); }
    finally { setMasterSaving(false); }
  };

  const handleFormVinDecode = async () => {
    const cleaned = formVin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (cleaned.length !== 17) { setFormVinError("VIN должен содержать 17 символов"); return; }
    setFormVinLoading(true); setFormVinError("");
    try {
      const res = await fetch(`${API.decodeVin}?vin=${cleaned}`);
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok || data.error) { setFormVinError(data.error || "VIN не распознан"); }
      else { setFormModel(data.car); }
    } catch { setFormVinError("Ошибка соединения"); }
    finally { setFormVinLoading(false); }
  };

  const modelSuggestions = formModel.trim().length >= 2
    ? CAR_LIST.filter(c => c.toLowerCase().includes(formModel.toLowerCase())).slice(0, 6)
    : [];

  const openAdd = () => { setEditId(null); setFormModel(""); setFormPlate(""); setFormVin(""); setFormVinError(""); setShowForm(true); };
  const openEdit = (car: UserCar) => { setEditId(car.id); setFormModel(car.model); setFormPlate(car.plate ?? ""); setFormVin(""); setFormVinError(""); setShowForm(true); };

  const handleSave = () => {
    if (!formModel.trim()) return;
    let updated: UserCar[];
    if (editId) {
      updated = cars.map(c => c.id === editId ? { ...c, model: formModel.trim(), plate: formPlate.trim() } : c);
    } else {
      updated = [...cars, { id: Date.now().toString(), model: formModel.trim(), plate: formPlate.trim() }];
    }
    setCars(updated); saveUserCars(updated); setShowForm(false);
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSaving, setCpSaving] = useState(false);
  const [cpSuccess, setCpSuccess] = useState(false);

  const handleChangePassword = async () => {
    if (cpNew !== cpConfirm) { setCpError("Пароли не совпадают"); return; }
    if (cpNew.length < 6) { setCpError("Новый пароль должен быть не менее 6 символов"); return; }
    setCpSaving(true); setCpError("");
    try {
      const res = await fetch(API.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", user_id: user.id, current_password: cpCurrent, new_password: cpNew }),
      });
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok) { setCpError(data.error || "Ошибка"); return; }
      setCpSuccess(true);
      setTimeout(() => { setShowChangePassword(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpSuccess(false); }, 1500);
    } catch { setCpError("Ошибка соединения"); }
    finally { setCpSaving(false); }
  };

  const handleDelete = (id: string) => {
    const updated = cars.filter(c => c.id !== id);
    setCars(updated); saveUserCars(updated); setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="relative overflow-hidden rounded-2xl p-5 border border-neon-cyan/20" style={{ background: "linear-gradient(135deg, hsla(185,100%,10%,0.4) 0%, hsla(270,80%,15%,0.3) 100%)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-accent/30 flex items-center justify-center text-2xl font-black text-white border border-neon-cyan/30 glow-cyan">
            {user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.phone}</p>
            {user.role === "master" && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">Мастер</span>
                {masterRating !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-sm">★</span>
                    <span className="text-sm font-bold text-white font-mono-tech">{masterRating}</span>
                    <span className="text-xs text-muted-foreground">· {masterReviewsCount} {masterReviewsCount === 1 ? "отзыв" : masterReviewsCount < 5 ? "отзыва" : "отзывов"}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Блок мастера */}
      {user.role === "master" && user.master_id && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Моя станция</h3>
            <button onClick={openEditMaster} disabled={masterLoading} className="flex items-center gap-1 text-xs text-neon-cyan font-semibold hover:text-neon-cyan/70 transition-colors disabled:opacity-50">
              {masterLoading
                ? <div className="w-3 h-3 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
                : <Icon name="Pencil" size={13} />}
              Редактировать
            </button>
          </div>
          <div className="card-neon rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="Wrench" size={16} className="text-neon-cyan flex-shrink-0" />
              <p className="text-sm text-white font-medium">{masterStation || "Не указана"}</p>
            </div>
            {masterSpecialties.length > 0 && (
              <div className="flex items-start gap-2">
                <Icon name="Tag" size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {masterSpecialties.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {masterCity && (
              <div className="flex items-center gap-2">
                <Icon name="Building2" size={16} className="text-neon-cyan/70 flex-shrink-0" />
                <p className="text-sm text-white">{masterCity}</p>
              </div>
            )}
            {masterAddress && (
              <div className="flex items-center gap-2">
                <Icon name="MapPin" size={16} className="text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{masterAddress}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модал редактирования мастера */}
      {editMaster && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "hsla(220,20%,3%,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-[430px] bg-[hsl(220,20%,7%)] border border-neon-cyan/20 rounded-t-3xl p-5 animate-scale-in flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Данные станции</h3>
              <button onClick={() => setEditMaster(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="X" size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Название станции</label>
              <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={masterStation}
                onChange={(e) => setMasterStation(e.target.value)} placeholder="Например: AutoPro Сервис" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Адрес</label>
              <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={masterAddress}
                onChange={(e) => setMasterAddress(e.target.value)} placeholder="Например: г. Москва, ул. Ленина, 15" />
              <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                <Icon name="Sparkles" size={10} />
                Город определится автоматически по адресу
              </p>
            </div>
            {masterCity && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
                <Icon name="Building2" size={14} className="text-neon-cyan flex-shrink-0" />
                <p className="text-xs text-neon-cyan">Город: <span className="font-semibold">{masterCity}</span></p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                Специализация
                {masterSpecialties.length > 0 && <span className="text-neon-cyan ml-1 normal-case font-normal">· {masterSpecialties.length}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => {
                  const active = masterSpecialties.includes(s);
                  return (
                    <button key={s} onClick={() => setMasterSpecialties(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-border text-muted-foreground hover:border-neon-cyan/30"}`}>
                      {active && <span className="mr-1">✓</span>}{s}
                    </button>
                  );
                })}
              </div>
            </div>
            {masterError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
                <Icon name="AlertCircle" size={14} className="text-destructive flex-shrink-0" />
                <p className="text-xs text-destructive">{masterError}</p>
              </div>
            )}
            {masterSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30">
                <Icon name="CheckCircle" size={14} className="text-neon-cyan flex-shrink-0" />
                <p className="text-xs text-neon-cyan">Сохранено!</p>
              </div>
            )}
            <button onClick={handleSaveMaster} disabled={masterSaving}
              className="btn-neon py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              {masterSaving
                ? <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Сохранение...</>
                : <><Icon name="Save" size={15} />Сохранить</>}
            </button>
          </div>
        </div>
      )}

      {user.role !== "master" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Мои автомобили</h3>
            <button onClick={openAdd} className="flex items-center gap-1 text-xs text-neon-cyan font-semibold hover:text-neon-cyan/70 transition-colors">
              <Icon name="Plus" size={13} />Добавить
            </button>
          </div>

          {cars.length === 0 ? (
            <button onClick={openAdd} className="w-full card-neon rounded-xl p-6 flex flex-col items-center gap-2 border-dashed border-neon-cyan/20 text-center hover:border-neon-cyan/40 transition-all">
              <Icon name="Car" size={28} className="text-neon-cyan/40" />
              <p className="text-sm text-muted-foreground">Нет автомобилей</p>
              <p className="text-xs text-neon-cyan">+ Добавить первый</p>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {cars.map((car) => (
                <div key={car.id} className={`card-neon rounded-xl p-4 flex items-center gap-3 transition-all ${deleteId === car.id ? "border-destructive/50" : ""}`}>
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="Car" size={20} className="text-neon-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{car.model}</p>
                    <p className="text-xs text-muted-foreground">{[car.plate, car.color].filter(Boolean).join(" · ")}</p>
                  </div>
                  {deleteId === car.id ? (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleDelete(car.id)} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive border border-destructive/30 font-semibold">Удалить</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground">Отмена</button>
                    </div>
                  ) : (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(car)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neon-cyan/10 transition-colors">
                        <Icon name="Pencil" size={14} className="text-neon-cyan/60" />
                      </button>
                      <button onClick={() => setDeleteId(car.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors">
                        <Icon name="Trash2" size={14} className="text-destructive/60" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "hsla(220,20%,3%,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-[430px] bg-[hsl(220,20%,7%)] border border-neon-cyan/20 rounded-t-3xl p-5 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-white">{editId ? "Редактировать" : "Добавить автомобиль"}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="X" size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Определить по VIN <span className="normal-case font-normal text-muted-foreground/60">(необязательно)</span></label>
              <div className="flex gap-2">
                <input className="input-neon flex-1 px-4 py-3 rounded-xl text-sm font-mono tracking-widest uppercase"
                  value={formVin} onChange={(e) => { setFormVin(e.target.value.toUpperCase()); setFormVinError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleFormVinDecode()}
                  placeholder="17 символов VIN" maxLength={17} />
                <button onClick={handleFormVinDecode} disabled={formVinLoading || formVin.length < 17}
                  className="btn-neon px-4 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-1 flex-shrink-0">
                  {formVinLoading ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" /> : <Icon name="Search" size={15} />}
                </button>
              </div>
              {formVinError && <p className="text-xs text-destructive mt-1">{formVinError}</p>}
            </div>

            <div className="relative mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Марка и модель</label>
              <input className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                onFocus={() => setModelFocused(true)}
                onBlur={() => setTimeout(() => setModelFocused(false), 150)}
                placeholder="Например: Toyota Camry 2021" autoComplete="off" />
              {modelFocused && modelSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-neon-cyan/20 bg-[hsl(220,20%,8%)] shadow-xl overflow-hidden">
                  {modelSuggestions.map((s, i) => {
                    const idx = s.toLowerCase().indexOf(formModel.toLowerCase());
                    return (
                      <button key={i} onMouseDown={() => { setFormModel(s); setModelFocused(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-neon-cyan/10 transition-colors flex items-center gap-3 border-b border-border/40 last:border-0">
                        <Icon name="Car" size={13} className="text-neon-cyan/50 flex-shrink-0" />
                        <span className="text-foreground/70">
                          {s.slice(0, idx)}<span className="text-neon-cyan font-semibold">{s.slice(idx, idx + formModel.length)}</span>{s.slice(idx + formModel.length)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Госномер <span className="normal-case font-normal text-muted-foreground/60">(необязательно)</span></label>
              <input className="input-neon w-full px-4 py-3 rounded-xl text-sm font-mono tracking-widest uppercase"
                value={formPlate} onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                placeholder="А 000 АА 000" maxLength={12} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold">Отмена</button>
              <button onClick={handleSave} disabled={!formModel.trim()} className="flex-1 btn-neon py-3 rounded-xl font-bold disabled:opacity-40">
                {editId ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Настройки</h3>

        <div className="flex items-center gap-3 py-3 border-b border-border cursor-pointer" onClick={() => {
          const next = !notificationsEnabled;
          setNotificationsEnabled(next);
          if (user.role === "master" && user.master_id) {
            fetch(API.auth, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "update_master", master_id: user.master_id, notifications_enabled: next }),
            }).catch(() => {});
          }
        }}>
          <Icon name={notificationsEnabled ? "Bell" : "BellOff"} size={18} className="text-neon-cyan" />
          <span className="flex-1 text-sm font-medium text-white">Уведомления</span>
          <div className={`w-11 h-6 rounded-full transition-colors relative ${notificationsEnabled ? "bg-neon-cyan" : "bg-secondary border border-border"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${notificationsEnabled ? "left-5" : "left-0.5"}`} />
          </div>
        </div>

        {[
          { icon: "Globe", label: "Язык", value: "Русский", danger: false, action: null },
          { icon: "Shield", label: "Безопасность", value: "Сменить пароль", danger: false, action: () => setShowChangePassword(true) },
          { icon: "HelpCircle", label: "Поддержка", value: "", danger: false, action: () => window.location.href = `mailto:kafalin@rambler.ru?subject=${encodeURIComponent("Обращение в поддержку AutoTech")}&body=${encodeURIComponent("Опишите вашу проблему или вопрос:\n\n")}` },
          { icon: "LogOut", label: "Выйти", value: "", danger: true, action: onLogout },
        ].map((item) => (
          <div key={item.label} onClick={item.action ?? undefined}
            className={`flex items-center gap-3 py-3 border-b border-border last:border-0 ${item.action ? "cursor-pointer active:opacity-70" : ""}`}>
            <Icon name={item.icon} size={18} className={item.danger ? "text-destructive" : "text-neon-cyan"} />
            <span className={`flex-1 text-sm font-medium ${item.danger ? "text-destructive" : "text-white"}`}>{item.label}</span>
            {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Модал смены пароля */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "hsla(220,20%,3%,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-[430px] bg-[hsl(220,20%,7%)] border border-neon-cyan/20 rounded-t-3xl p-5 animate-scale-in flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Смена пароля</h3>
              <button onClick={() => { setShowChangePassword(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpSuccess(false); }}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="X" size={16} className="text-muted-foreground" />
              </button>
            </div>
            {cpSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Icon name="CheckCircle" size={40} className="text-neon-green" />
                <p className="text-sm font-semibold text-neon-green">Пароль успешно изменён</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Текущий пароль</label>
                  <input type="password" className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={cpCurrent}
                    onChange={(e) => setCpCurrent(e.target.value)} placeholder="Введите текущий пароль" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Новый пароль</label>
                  <input type="password" className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={cpNew}
                    onChange={(e) => setCpNew(e.target.value)} placeholder="Минимум 6 символов" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Подтверждение</label>
                  <input type="password" className="input-neon w-full px-4 py-3 rounded-xl text-sm" value={cpConfirm}
                    onChange={(e) => setCpConfirm(e.target.value)} placeholder="Повторите новый пароль" />
                </div>
                {cpError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
                    <Icon name="AlertCircle" size={14} className="text-destructive flex-shrink-0" />
                    <p className="text-xs text-destructive">{cpError}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground/60">
                  Забыли пароль?{" "}
                  <button onClick={() => window.location.href = `mailto:kafalin@rambler.ru?subject=${encodeURIComponent("Сброс пароля AutoTech")}&body=${encodeURIComponent(`Прошу сбросить пароль для аккаунта: ${user.phone}`)}`}
                    className="text-neon-cyan underline">Написать в поддержку</button>
                </p>
                <button onClick={handleChangePassword} disabled={cpSaving || !cpCurrent || !cpNew || !cpConfirm}
                  className="btn-neon py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {cpSaving ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" /> : <Icon name="Lock" size={15} />}
                  Сохранить
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}