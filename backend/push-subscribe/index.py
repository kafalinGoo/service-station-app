"""
Управление Web Push подписками мастеров.
POST {action:'subscribe', master_id, endpoint, p256dh, auth} — сохранить подписку
POST {action:'unsubscribe', master_id, endpoint} — удалить подписку
GET  ?vapid_public_key=1 — получить публичный VAPID ключ
"""
import json
import os
import psycopg2

SCHEMA = "t_p3896276_service_station_app"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET" and params.get("vapid_public_key"):
        return ok({"vapid_public_key": os.environ.get("VAPID_PUBLIC_KEY", "")})

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")
        master_id = body.get("master_id")
        endpoint = body.get("endpoint")

        if not master_id or not endpoint:
            return err("master_id и endpoint обязательны")

        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()

        if action == "subscribe":
            p256dh = body.get("p256dh", "")
            auth = body.get("auth", "")
            if not p256dh or not auth:
                cur.close(); conn.close()
                return err("p256dh и auth обязательны")
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.push_subscriptions (master_id, endpoint, p256dh, auth)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (master_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
                """,
                (int(master_id), endpoint, p256dh, auth),
            )
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

        if action == "unsubscribe":
            cur.execute(
                f"UPDATE {SCHEMA}.push_subscriptions SET endpoint = endpoint WHERE master_id = %s AND endpoint = %s",
                (int(master_id), endpoint),
            )
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

        cur.close(); conn.close()
        return err("Неизвестное действие")

    return err("Метод не поддерживается", 405)
