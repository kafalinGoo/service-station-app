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

export default function Index() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const isMaster = user?.role === "master";

  const [screen, setScreen] = useState<Screen>(() =>
    getStoredUser()?.role === "master" ? "master-requests" : "home"
  );
  const [targetMasterId, setTargetMasterId] = useState<number | null>(null);
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

  const goToNewRequest = (masterId?: number) => {
    setTargetMasterId(masterId ?? null);
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
          {/* Клиентские экраны */}
          {screen === "home"             && <HomeScreen setScreen={setScreen} goToNewRequest={goToNewRequest} />}
          {screen === "new-request"      && <NewRequestScreen setScreen={setScreen} targetMasterId={targetMasterId} user={user} />}
          {screen === "history"          && <HistoryScreen setScreen={setScreen} user={user} />}
          {screen === "chat"             && <ChatScreen />}
          {screen === "reviews"          && <ReviewsScreen />}
          {/* Мастер */}
          {screen === "master-requests"  && <MasterRequestsScreen user={user} />}
          {/* Общие */}
          {screen === "profile"          && <ProfileScreen user={user} onLogout={handleLogout} />}
          {screen === "notifications"    && <NotificationsScreen user={user} />}
          {screen === "analytics"        && <AnalyticsScreen />}
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