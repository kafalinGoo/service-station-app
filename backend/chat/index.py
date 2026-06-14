"""
Чат между клиентом и мастером по заявке.
GET  ?request_id=X&since_id=Y  - получить сообщения
POST {request_id, sender_id, sender_role, text} - отправить сообщение
"""
import json
import os
import psycopg2

SCHEMA = "t_p3896276_service_station_app"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}


def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if method == "GET":
        params = event.get("queryStringParameters") or {}
        request_id = params.get("request_id")
        since_id = int(params.get("since_id", 0))

        if not request_id:
            cur.close(); conn.close()
            return err("request_id обязателен")

        cur.execute(
            f"""
            SELECT cm.id, cm.sender_id, cm.sender_role, cm.text,
                   TO_CHAR(cm.created_at + INTERVAL '3 hours', 'HH24:MI') AS time,
                   COALESCE(u.name, m.name, 'Неизвестно') AS sender_name
            FROM {SCHEMA}.chat_messages cm
            LEFT JOIN {SCHEMA}.users u ON cm.sender_role = 'client' AND u.id = cm.sender_id
            LEFT JOIN {SCHEMA}.masters m ON cm.sender_role = 'master' AND m.id = cm.sender_id
            WHERE cm.request_id = %s AND cm.id > %s
            ORDER BY cm.created_at ASC
            LIMIT 100
            """,
            (int(request_id), since_id),
        )
        rows = cur.fetchall()
        messages = [
            {"id": r[0], "sender_id": r[1], "sender_role": r[2], "text": r[3], "time": r[4], "sender_name": r[5]}
            for r in rows
        ]
        cur.close(); conn.close()
        return ok({"messages": messages})

    elif method == "POST":
        body = json.loads(event.get("body") or "{}")
        request_id = body.get("request_id")
        sender_id = body.get("sender_id")
        sender_role = body.get("sender_role")
        text = (body.get("text") or "").strip()

        if not all([request_id, sender_id, sender_role, text]):
            cur.close(); conn.close()
            return err("request_id, sender_id, sender_role и text обязательны")

        if sender_role not in ("client", "master"):
            cur.close(); conn.close()
            return err("sender_role должен быть client или master")

        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.chat_messages (request_id, sender_id, sender_role, text)
            VALUES (%s, %s, %s, %s)
            RETURNING id, TO_CHAR(created_at + INTERVAL '3 hours', 'HH24:MI')
            """,
            (int(request_id), int(sender_id), sender_role, text),
        )
        msg_id, time = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({"id": msg_id, "time": time})

    cur.close(); conn.close()
    return err("Метод не поддерживается", 405)