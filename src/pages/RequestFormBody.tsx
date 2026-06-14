import Icon from "@/components/ui/icon";
import { services } from "./appTypes";

interface Props {
  selectedService: string;
  setSelectedService: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  photos: { url: string; name: string }[];
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (idx: number) => void;
  error: string;
  loading: boolean;
  showAddCarBanner: boolean;
  addingCar: boolean;
  car: string;
  onSubmit: () => void;
  onAddCarAndSubmit: () => void;
  onSkipAddCar: () => void;
}

export function RequestFormBody({
  selectedService, setSelectedService,
  description, setDescription,
  photos, onPhotoUpload, onRemovePhoto,
  error, loading,
  showAddCarBanner, addingCar, car,
  onSubmit, onAddCarAndSubmit, onSkipAddCar,
}: Props) {
  return (
    <>
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
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Описание проблемы</label>
        <textarea className="input-neon w-full px-4 py-3 rounded-xl text-sm resize-none" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите симптомы или что нужно сделать..." />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Фото проблемы</label>
        <input id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={onPhotoUpload} />
        {photos.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((p, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-neon-cyan/20 aspect-square">
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  <button onClick={() => onRemovePhoto(idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center">
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

      {showAddCarBanner && (
        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-4 flex flex-col gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <Icon name="Car" size={20} className="text-neon-cyan mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Добавить в «Мои автомобили»?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Автомобиль <span className="text-neon-cyan font-medium">{car.trim()}</span> не найден в вашем гараже. Добавить его?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddCarAndSubmit} disabled={addingCar}
              className="flex-1 btn-neon py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {addingCar ? "Добавляю..." : "Добавить и отправить"}
            </button>
            <button onClick={onSkipAddCar}
              className="flex-1 py-2 rounded-lg text-sm font-medium border border-white/10 text-muted-foreground hover:text-white transition-colors">
              Отправить без добавления
            </button>
          </div>
        </div>
      )}

      <button disabled={!selectedService || !car.trim() || loading} onClick={onSubmit}
        className="btn-neon py-3 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? (
          <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />Отправляем...</>
        ) : (
          <><Icon name="Send" size={16} />Отправить</>
        )}
      </button>
    </>
  );
}