import Icon from "@/components/ui/icon";
import { masters } from "./appTypes";

interface Props {
  targetMasterId: number | null;
  city: string;
  cityLoading: boolean;
  cityEdit: boolean;
  cityInput: string;
  setCityInput: (v: string) => void;
  setCityEdit: (v: boolean) => void;
  setCity: (v: string) => void;
}

export function RequestFormHeader({
  targetMasterId,
  city,
  cityLoading,
  cityEdit,
  cityInput,
  setCityInput,
  setCityEdit,
  setCity,
}: Props) {
  return (
    <>
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
    </>
  );
}
