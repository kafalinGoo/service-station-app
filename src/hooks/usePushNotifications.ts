import { useEffect, useState } from "react";
import { API } from "@/pages/appTypes";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(masterId: number | null) {
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  useEffect(() => {
    if (!supported || !masterId) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const existing = await reg.pushManager.getSubscription();
        if (existing) { setSubscribed(true); return; }

        const res = await fetch(`${API.pushSubscribe}?vapid_public_key=1`);
        const raw = await res.json();
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        const vapidKey = d.vapid_public_key;
        if (!vapidKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const subJson = sub.toJSON();
        await fetch(API.pushSubscribe, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            master_id: masterId,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          }),
        });
        setSubscribed(true);
      } catch { /* браузер отклонил или не поддерживает */ }
    };

    register();
  }, [supported, masterId]);

  return { subscribed, supported };
}
