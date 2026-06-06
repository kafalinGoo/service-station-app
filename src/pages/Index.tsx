import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

import {
  API, Screen, AuthUser,
  notifications, navItems, masterNavItems, screenTitles,
  getStoredUser, clearUser,
} from "./appTypes";

import { HomeScreen, HistoryScreen, ChatScreen, ReviewsScreen, AnalyticsScreen } from "./HomeScreens";
import { NewRequestScreen, NotificationsScreen, ProfileScreen } from "./RequestScreens";
import { MasterRequestsScreen } from "./MasterScreens";
import AuthScreen from "./AuthScreen";

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 1800;
    const frame = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(frame);
      else { setFading(true); setTimeout(onDone, 400); }
    };
    requestAnimationFrame(frame);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      style={{ transition: "opacity 0.4s ease", opacity: fading ? 0 : 1 }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full border border-neon-cyan/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="absolute w-24 h-24 rounded-full border border-neon-cyan/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
          <div className="w-20 h-20 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center glow-cyan">
            <Icon name="Wrench" size={36} className="text-neon-cyan" />
          </div>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-3xl font-black font-mono-tech tracking-wider" style={{ animation: "neon-flicker 2.5s ease forwards" }}>AUTO</span>
          <span className="text-3xl font-black text-white tracking-wider">TECH</span>
        </div>
        <style>{`
          @keyframes neon-flicker {
            0%   { color: hsl(185 100% 50%); text-shadow: 0 0 8px hsl(185 100% 50%), 0 0 20px hsl(185 100% 50%); }
            40%  { color: hsl(185 100% 50%); text-shadow: 0 0 8px hsl(185 100% 50%), 0 0 20px hsl(185 100% 50%); }
            44%  { color: hsl(185 100% 10%); text-shadow: none; }
            48%  { color: hsl(185 100% 10%); text-shadow: none; }
            52%  { color: hsl(185 100% 50%); text-shadow: 0 0 8px hsl(185 100% 50%), 0 0 30px hsl(185 100% 50%), 0 0 50px hsl(185 100% 50%); }
            60%  { color: hsl(185 100% 50%); text-shadow: 0 0 8px hsl(185 100% 50%), 0 0 20px hsl(185 100% 50%); }
            100% { color: hsl(185 100% 50%); text-shadow: 0 0 8px hsl(185 100% 50%), 0 0 20px hsl(185 100% 50%); }
          }
        `}</style>

        <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest">Станции ТО</p>

        <div className="w-48 flex flex-col gap-1.5 mt-2">
          <div className="w-full h-0.5 rounded-full bg-neon-cyan/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-neon-cyan transition-none"
              style={{ width: `${progress * 100}%`, boxShadow: "0 0 8px hsl(185 100% 50%)" }}
            />
          </div>
          <p className="text-xs font-mono-tech text-neon-cyan/50 text-right">{Math.round(progress * 100)}%</p>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [splash, setSplash] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const isMaster = user?.role === "master";

  const [screen, setScreen] = useState<Screen>(() =>
    getStoredUser()?.role === "master" ? "master-requests" : "home"
  );
  const [targetMasterId, setTargetMasterId] = useState<number | null>(null);
  const [preselectedService, setPreselectedService] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(notifications.filter(n => !n.read).length);

  useEffect(() => {
    if (!user) return;
    const param = user.role === "master"
      ? `master_id=${user.master_id ?? user.id}`
      : `user_id=${user.id}`;
    fetch(`${API.getNotifications}?${param}`)
      .then(r => r.json())
      .then(raw => {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (typeof d.unread === "number") setUnreadCount(d.unread);
      })
      .catch(() => {});
  }, [screen, user]);

  const goToNewRequest = (masterId?: number, service?: string) => {
    setTargetMasterId(masterId ?? null);
    setPreselectedService(service ?? "");
    setScreen("new-request");
  };

  const handleLogout = () => {
    clearUser();
    setUser(null);
    setScreen("home");
  };

  const handleAuth = (u: AuthUser) => {
    setUser(u);
    setScreen(u.role === "master" ? "master-requests" : "home");
  };

  if (splash) {
    return <SplashScreen onDone={() => setSplash(false)} />;
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const currentNav = isMaster ? masterNavItems : navItems;
  const homeScreen: Screen = isMaster ? "master-requests" : "home";

  return (
    <div className="min-h-screen bg-background grid-bg flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen relative">
        <div className="h-1 bg-gradient-to-r from-neon-cyan via-accent to-neon-cyan opacity-60" />

        <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ background: "hsla(220,20%,5%,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid hsla(185,100%,50%,0.1)" }}>
          <div className="flex items-center gap-3">
            {screen !== homeScreen && (
              <button onClick={() => setScreen(homeScreen)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon name="ChevronLeft" size={18} className="text-neon-cyan" />
              </button>
            )}
            {screen === homeScreen ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono-tech glow-text-cyan text-neon-cyan">AUTO</span>
                <span className="text-xl font-black text-white">TECH</span>
                {isMaster && (
                  <span className="ml-1 text-xs font-mono-tech text-accent/70 border border-accent/20 px-1.5 py-0.5 rounded-md">Мастер</span>
                )}
                {!isMaster && (
                  <span className="ml-1 text-xs font-mono-tech text-neon-cyan/50 border border-neon-cyan/20 px-1.5 py-0.5 rounded-md">v2.0</span>
                )}
              </div>
            ) : (
              <h1 className="text-base font-bold text-white">{screenTitles[screen]}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScreen("notifications")} className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <Icon name="Bell" size={18} className="text-foreground/70" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-cyan text-background text-xs font-bold font-mono-tech flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setScreen("profile")} className="w-9 h-9 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center text-xs font-bold text-neon-cyan">
              {initials}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 overflow-y-auto" style={{ paddingBottom: "100px" }}>
          {isMaster ? (
            <>
              {screen === "master-requests" && <MasterRequestsScreen user={user} />}
              {screen === "analytics"       && <AnalyticsScreen user={user} />}
              {screen === "notifications"   && <NotificationsScreen user={user} />}
              {screen === "profile"         && <ProfileScreen user={user} onLogout={handleLogout} />}
            </>
          ) : (
            <>
              {screen === "home"            && <HomeScreen setScreen={setScreen} goToNewRequest={goToNewRequest} />}
              {screen === "new-request"     && <NewRequestScreen setScreen={setScreen} targetMasterId={targetMasterId} user={user} preselectedService={preselectedService} />}
              {screen === "history"         && <HistoryScreen setScreen={setScreen} user={user} />}
              {screen === "chat"            && <ChatScreen />}
              {screen === "reviews"         && <ReviewsScreen />}
              {screen === "notifications"   && <NotificationsScreen user={user} />}
              {screen === "profile"         && <ProfileScreen user={user} onLogout={handleLogout} />}
              {screen === "analytics"       && <AnalyticsScreen user={user} />}
            </>
          )}
        </main>

        <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-2 pt-2 pb-4">
          <div className="flex justify-around">
            {currentNav.map((item) => {
              const active = screen === item.id;
              const isCenterBtn = item.id === "new-request";
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id as Screen)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${active && !isCenterBtn ? "bg-neon-cyan/10" : ""}`}
                >
                  {isCenterBtn ? (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 ${active ? "btn-neon glow-cyan" : "bg-secondary border border-border"}`}>
                      <Icon name={item.icon} size={24} className={active ? "text-background" : "text-muted-foreground"} />
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Icon name={item.icon} size={22} className={active ? "text-neon-cyan" : "text-muted-foreground"} />
                        {item.id === "notifications" && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-neon-cyan text-background text-[9px] font-bold flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${active ? "text-neon-cyan" : "text-muted-foreground"}`}>{item.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}