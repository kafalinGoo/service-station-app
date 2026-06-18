import { useEffect, useState } from "react";
import { API } from "@/pages/appTypes";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(masterId: number | null, userId: number | null = null) {
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  useEffect(() => {
    if (!supported || (!masterId && !userId)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const res = await fetch(`${API.pushSubscribe}?vapid_public_key=1`);
        const raw = await res.json();
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        const vapidKey = d.vapid_public_key;
        if (!vapidKey) { console.warn("[push] VAPID key missing"); return; }

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        const subJson = sub.toJSON();
        const payload: Record<string, unknown> = {
          action: "subscribe",
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        };
        if (masterId) payload.master_id = masterId;
        if (userId) payload.user_id = userId;

        console.log("[push] subscribing", payload);
        const saveRes = await fetch(API.pushSubscribe, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const saveData = await saveRes.json();
        console.log("[push] saved", saveData);
        setSubscribed(true);
      } catch (e) {
        const err = e as Error;
        console.error("[push] error", err?.name, err?.message, String(e));
      }
    };

    register();
  }, [supported, masterId, userId]);

  return { subscribed, supported };
}