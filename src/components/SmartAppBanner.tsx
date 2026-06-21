import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const IOS_GIF = "https://cdn.poehali.dev/projects/a7200fd4-8221-44d9-8f62-6b46864044c2/files/8bd505da-dfbc-4167-bd35-86047859d2aa.jpg";
const ANDROID_GIF = "/android-install.gif";
const STORAGE_KEY = "smart-banner-dismissed";

function getOS(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function SmartAppBanner() {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const os = getOS();

  useEffect(() => {
    if (isStandalone()) return;
    if (os === "other") return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, [os]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const gifSrc = os === "ios" ? IOS_GIF : ANDROID_GIF;
  const instruction =
    os === "ios"
      ? 'Нажмите кнопку «Поделиться» внизу Safari, затем выберите «На экран Домой»'
      : 'Нажмите меню браузера (⋮), затем выберите «Добавить на главный экран»';

  return (
    <>
      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
        <div
          className="pointer-events-auto rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4 flex items-center gap-3"
          style={{ boxShadow: "0 0 24px hsl(var(--neon-cyan) / 0.15)" }}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="Smartphone" size={20} className="text-primary" />
          </div>
          <p className="flex-1 text-sm text-foreground leading-snug">
            Хотите пользоваться приложением быстрее? Добавьте его на главный экран за 2 секунды!{" "}
            <button
              onClick={() => setShowModal(true)}
              className="text-primary underline underline-offset-2 font-medium hover:text-primary/80 transition-colors"
            >
              Инструкция
            </button>
          </p>
          <button
            onClick={dismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Закрыть"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Как добавить на главный экран</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden bg-muted border border-border">
                <img
                  src={gifSrc}
                  alt="Инструкция по добавлению на главный экран"
                  className="w-full object-contain max-h-64"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">{instruction}</p>
              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
