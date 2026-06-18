"""
Мастер оставляет отклик на запрос клиента с предложенной ценой.
После отклика клиенту автоматически отправляется уведомление.
Также: GET /?master_id=N&mode=reviews — отзывы мастера
       POST action=review — клиент оставляет отзыв о мастере
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


def ok(data, code=200):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # ── GET: отзывы мастера ───────────────────────────────────────────────────
    if event.get("httpMethod") == "GET":
        params = event.get("queryStringParameters") or {}
        master_id = params.get("master_id")
        if not master_id or params.get("mode") != "reviews":
            return err("Укажите master_id и mode=reviews")
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT r.id, r.rating, r.text, r.created_at, u.name
            FROM {SCHEMA}.reviews r
            JOIN {SCHEMA}.users u ON u.id = r.client_id
            WHERE r.master_id = %s
            ORDER BY r.created_at DESC LIMIT 50
            """,
            (int(master_id),),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return ok({"reviews": [
            {"id": r[0], "rating": r[1], "text": r[2], "created_at": str(r[3]), "client_name": r[4]}
            for r in rows
        ]})

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")

    # ── POST action=review: сохранить отзыв ───────────────────────────────────
    if action == "review":
        client_id = body.get("client_id")
        master_id = body.get("master_id")
        request_id = body.get("request_id")
        rating = body.get("rating")
        text = (body.get("text") or "").strip() or None

        if not all([client_id, master_id, rating]):
            return err("client_id, master_id и rating обязательны")
        if not isinstance(rating, int) or not (1 <= rating <= 5):
            return err("rating должен быть от 1 до 5")

        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()

        if request_id:
            cur.execute(f"SELECT reviewed FROM {SCHEMA}.requests WHERE id = %s", (int(request_id),))
            row = cur.fetchone()
            if row and row[0]:
                cur.close(); conn.close()
                return err("Отзыв для этого заказа уже оставлен", 409)

        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.reviews (master_id, client_id, request_id, rating, text)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
            """,
            (int(master_id), int(client_id), int(request_id) if request_id else None, rating, text),
        )
        review_id = cur.fetchone()[0]

        # Пересчитываем рейтинг
        cur.execute(
            f"""
            UPDATE {SCHEMA}.masters
            SET rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM {SCHEMA}.reviews WHERE master_id = %s),
                reviews_count = (SELECT COUNT(*) FROM {SCHEMA}.reviews WHERE master_id = %s)
            WHERE id = %s
            RETURNING rating, reviews_count
            """,
            (int(master_id), int(master_id), int(master_id)),
        )
        new_rating, new_count = cur.fetchone()

        if request_id:
            cur.execute(f"UPDATE {SCHEMA}.requests SET reviewed = TRUE, status = 'closed' WHERE id = %s", (int(request_id),))

        stars = "★" * rating + "☆" * (5 - rating)
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.notifications (master_id, type, title, text, request_id)
            VALUES (%s, 'review', 'Новый отзыв', %s, %s)
            """,
            (int(master_id), f"{stars}  {text or 'Без комментария'}", int(request_id) if request_id else None),
        )

        conn.commit(); cur.close(); conn.close()
        return ok({"review_id": review_id, "new_rating": float(new_rating), "reviews_count": int(new_count)}, 201)

    # ── POST: создать отклик мастера ──────────────────────────────────────────
    request_id = body.get("request_id")
    master_id = body.get("master_id")
    price = body.get("price")
    comment = body.get("comment", "")

    if not all([request_id, master_id, price]):
        return err("request_id, master_id и price обязательны")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(f"SELECT status, client_id, service FROM {SCHEMA}.requests WHERE id = %s", (request_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return err("Запрос не найден", 404)
    if row[0] != "open":
        cur.close(); conn.close()
        return err("Запрос уже закрыт", 409)

    client_id = row[1]
    service_name = row[2]

    cur.execute(f"SELECT id FROM {SCHEMA}.bids WHERE request_id = %s AND master_id = %s", (request_id, master_id))
    if cur.fetchone():
        cur.close(); conn.close()
        return err("Вы уже откликались на этот запрос", 409)

    cur.execute(
        f"""
        INSERT INTO {SCHEMA}.bids (request_id, master_id, price, comment, status)
        VALUES (%s, %s, %s, %s, 'pending') RETURNING id, created_at
        """,
        (request_id, master_id, price, comment),
    )
    bid_id, created_at = cur.fetchone()

    cur.execute(f"SELECT name, station FROM {SCHEMA}.masters WHERE id = %s", (master_id,))
    master = cur.fetchone()
    master_name = master[0] if master else "Мастер"
    station = master[1] if master else ""

    if client_id:
        price_fmt = f"{int(price):,}".replace(",", " ") + " ₽"
        notif_text = f"{master_name} ({station}) предлагает {price_fmt}"
        if comment:
            notif_text += f" — «{comment[:80]}»"
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.notifications (user_id, type, title, text, request_id)
            VALUES (%s, 'new_bid', %s, %s, %s)
            """,
            (client_id, f"Новый отклик на «{service_name}»", notif_text, request_id),
        )

    conn.commit(); cur.close(); conn.close()
    return ok({"bid_id": bid_id, "request_id": request_id, "master_name": master_name,
               "station": station, "price": price, "comment": comment, "created_at": str(created_at)})