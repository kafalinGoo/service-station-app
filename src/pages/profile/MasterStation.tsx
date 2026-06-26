import Icon from "@/components/ui/icon";
import { API, SPECIALTIES } from "../appTypes";

interface Props {
  masterId: number;
  masterStation: string;
  setMasterStation: (v: string) => void;
  masterSpecialties: string[];
  setMasterSpecialties: (v: string[]) => void;
  masterAddress: string;
  setMasterAddress: (v: string) => void;
  masterCity: string;
  setMasterCity: (v: string) => void;
  masterLoading: boolean;
  setMasterLoading: (v: boolean) => void;
  masterRating: number | null;
  setMasterRating: (v: number | null) => void;
  masterReviewsCount: number;
  setMasterReviewsCount: (v: number) => void;
  editMaster: boolean;
  setEditMaster: (v: boolean) => void;
  masterSaving: boolean;
  setMasterSaving: (v: boolean) => void;
  masterError: string;
  setMasterError: (v: string) => void;
  masterSuccess: boolean;
  setMasterSuccess: (v: boolean) => void;
}

export function MasterStation({
  masterId,
  masterStation, setMasterStation,
  masterSpecialties, setMasterSpecialties,
  masterAddress, setMasterAddress,
  masterCity, setMasterCity,
  masterLoading, setMasterLoading,
  masterRating, setMasterRating,
  masterReviewsCount, setMasterReviewsCount,
  editMaster, setEditMaster,
  masterSaving, setMasterSaving,
  masterError, setMasterError,
  masterSuccess, setMasterSuccess,
}: Props) {

  const openEditMaster = async () => {
    setMasterError(""); setMasterSuccess(false); setMasterLoading(true);
    try {
      const res = await fetch(`${API.getBids}?master_id=${masterId}&mode=master_info`);
      const raw = await res.json();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (res.ok && data.id) {
        setMasterStation(data.station || "");
        setMasterSpecialties(data.specialty ? data.specialty.split(", ").filter(Boolean) : []);
        setMasterAddress(data.address || "");
        setMasterCity(data.city || "");
        setMasterRating(data.rating ?? null);
        setMasterReviewsCount(data.reviews_count ?? 0);
      }
    } catch { /* ignore */ }
    finally { setMasterLoading(false); }
    setEditMaster(true);
  };

  const handleSaveMaster = async () => {
    setMasterSaving(true); setMasterError(""); setMasterSuccess(false);
    try {
      const payload: Record<string, string | number> = { action: "update_master", master_id: masterId };
      if (masterStation.trim()) payload.station = masterStation.trim();
      if (masterSpecialties.length) payload.specialty = masterSpecialties.join(", ");
      payload.address = masterAddress.trim();
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

  return (
    <>
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
                    <button key={s} onClick={() => setMasterSpecialties(active ? masterSpecialties.filter(x => x !== s) : [...masterSpecialties, s])}
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
    </>
  );
}