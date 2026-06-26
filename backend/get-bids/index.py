"""
Универсальный эндпоинт для заявок, откликов и автомобилей пользователя.
GET  /?request_id=N              — отклики по заявке клиента
GET  /?client_id=N               — история заявок клиента
GET  /?client_id=N&request_id=N  — детали заявки + отклики (для клиента)
GET  /?master_id=N&mode=incoming — входящие заявки для мастера
GET  /?master_id=N&mode=mybids   — история откликов мастера
GET  /?user_id=N&mode=cars       — список автомобилей пользователя
POST {action:'accept', bid_id, request_id} — клиент принимает отклик
POST {action:'add_car', user_id, brand, model, year, vin} — добавить авто
POST {action:'delete_car', user_id, car_id} — удалить авто
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


def ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(body, ensure_ascii=False)}

def err(msg: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    # ── POST: принятие отклика клиентом ───────────────────────────────────────
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "accept":
            bid_id = body.get("bid_id")
            request_id = body.get("request_id")
            if not bid_id or not request_id:
                cur.close(); conn.close()
                return err("bid_id и request_id обязательны")

            # Получаем данные заявки
            cur.execute(
                f"SELECT service, car, client_id FROM {SCHEMA}.requests WHERE id = %s",
                (request_id,),
            )
            req = cur.fetchone()
            if not req:
                cur.close(); conn.close()
                return err("Заявка не найдена", 404)
            service, car, client_id = req

            # Получаем данные отклика и мастера
            cur.execute(
                f"""
                SELECT b.master_id, b.price, m.name, m.station
                FROM {SCHEMA}.bids b
                JOIN {SCHEMA}.masters m ON m.id = b.master_id
                WHERE b.id = %s
                """,
                (bid_id,),
            )
            bid_row = cur.fetchone()
            if not bid_row:
                cur.close(); conn.close()
                return err("Отклик не найден", 404)
            master_id, price, master_name, station = bid_row

            # Принимаем этот отклик, отклоняем остальные
            cur.execute(
                f"UPDATE {SCHEMA}.bids SET status = 'accepted' WHERE id = %s",
                (bid_id,),
            )
            cur.execute(
                f"UPDATE {SCHEMA}.bids SET status = 'rejected' WHERE request_id = %s AND id != %s",
                (request_id, bid_id),
            )
            # Закрываем заявку
            cur.execute(
                f"UPDATE {SCHEMA}.requests SET status = 'accepted' WHERE id = %s",
                (request_id,),
            )

            # Уведомляем мастера
            price_fmt = f"{int(price):,}".replace(",", " ") + " ₽"
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.notifications
                    (master_id, type, title, text, request_id)
                VALUES (%s, 'bid_accepted', %s, %s, %s)
                """,
                (
                    master_id,
                    "Ваш отклик принят!",
                    f"Клиент принял вашу цену {price_fmt} на «{service}». Автомобиль: {car}",
                    request_id,
                ),
            )

            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True, "master_name": master_name, "station": station, "price": price})

        if action == "add_car":
            user_id = body.get("user_id")
            brand = (body.get("brand") or "").strip()
            model = body.get("model", "").strip()
            year = body.get("year")
            vin = (body.get("vin") or "").strip() or None
            if not user_id or not brand or not model or not year:
                cur.close(); conn.close()
                return err("user_id, brand, model, year обязательны")
            cur.execute(
                f"SELECT id FROM {SCHEMA}.user_cars WHERE user_id = %s AND brand = %s AND model = %s AND year = %s",
                (int(user_id), brand, model, int(year)),
            )
            existing = cur.fetchone()
            if existing:
                cur.close(); conn.close()
                return err("Такой автомобиль уже добавлен")
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.user_cars (user_id, brand, model, year, vin)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, brand, model, year, vin, created_at
                """,
                (int(user_id), brand, model, int(year), vin),
            )
            row = cur.fetchone()
            car = {"id": row[0], "brand": row[1], "model": row[2], "year": row[3], "vin": row[4], "created_at": str(row[5])}
            conn.commit(); cur.close(); conn.close()
            return ok({"car": car})

        if action == "delete_car":
            car_id = body.get("car_id")
            user_id = body.get("user_id")
            if not car_id or not user_id:
                cur.close(); conn.close()
                return err("car_id и user_id обязательны")
            cur.execute(
                f"SELECT id FROM {SCHEMA}.user_cars WHERE id = %s AND user_id = %s",
                (int(car_id), int(user_id)),
            )
            if not cur.fetchone():
                cur.close(); conn.close()
                return err("Автомобиль не найден", 404)
            cur.execute(
                f"DELETE FROM {SCHEMA}.user_cars WHERE id = %s AND user_id = %s",
                (int(car_id), int(user_id)),
            )
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

        cur.close(); conn.close()
        return err("Неизвестное действие", 400)

    # ── GET: история заявок клиента ───────────────────────────────────────────
    client_id = params.get("client_id")
    request_id = params.get("request_id")
    master_id = params.get("master_id")
    mode = params.get("mode", "incoming")

    if client_id and not request_id:
        cur.execute(
            f"""
            SELECT r.id, r.service, r.category, r.car, r.description,
                   r.status, r.created_at, r.target_master_id,
                   COUNT(b.id) AS bids_count, r.reviewed
            FROM {SCHEMA}.requests r
            LEFT JOIN {SCHEMA}.bids b ON b.request_id = r.id
            WHERE r.client_id = %s
            GROUP BY r.id
            ORDER BY r.created_at DESC
            LIMIT 50
            """,
            (client_id,),
        )
        rows = cur.fetchall()
        requests_list = []
        for row in rows:
            requests_list.append({
                "id": row[0], "service": row[1], "category": row[2],
                "car": row[3], "description": row[4], "status": row[5],
                "created_at": str(row[6]), "target_master_id": row[7],
                "bids_count": row[8], "reviewed": row[9],
            })
        cur.close(); conn.close()
        return ok({"requests": requests_list, "count": len(requests_list)})

    # ── GET: детали заявки + отклики ─────────────────────────────────────────
    if request_id:
        cur.execute(
            f"""
            SELECT r.id, r.service, r.category, r.car, r.description,
                   r.status, r.created_at, r.target_master_id, r.reviewed
            FROM {SCHEMA}.requests r WHERE r.id = %s
            """,
            (request_id,),
        )
        req = cur.fetchone()
        if not req:
            cur.close(); conn.close()
            return err("Запрос не найден", 404)

        request_data = {
            "id": req[0], "service": req[1], "category": req[2],
            "car": req[3], "description": req[4], "status": req[5],
            "created_at": str(req[6]), "target_master_id": req[7], "reviewed": req[8],
        }

        cur.execute(
            f"""
            SELECT b.id, b.price, b.comment, b.status, b.created_at,
                   m.id, m.name, m.station, m.specialty, m.rating,
                   m.reviews_count, m.completed_orders, m.online, m.avatar, m.address,
                   COALESCE(m.phone, u.phone) AS phone
            FROM {SCHEMA}.bids b
            JOIN {SCHEMA}.masters m ON m.id = b.master_id
            LEFT JOIN {SCHEMA}.users u ON u.master_id = m.id
            WHERE b.request_id = %s
            ORDER BY b.price ASC, b.created_at ASC
            """,
            (request_id,),
        )
        bids = []
        for row in cur.fetchall():
            bids.append({
                "bid_id": row[0], "price": row[1], "comment": row[2],
                "status": row[3], "created_at": str(row[4]),
                "master": {
                    "id": row[5], "name": row[6], "station": row[7],
                    "specialty": row[8], "rating": float(row[9]),
                    "reviews_count": row[10], "completed_orders": row[11],
                    "online": row[12], "avatar": row[13], "address": row[14],
                    "phone": row[15],
                },
            })

        cur.close(); conn.close()
        return ok({"request": request_data, "bids": bids, "bids_count": len(bids)})

    # ── GET: входящие заявки для мастера ──────────────────────────────────────
    if master_id and mode == "incoming":
        cur.execute(
            f"""
            SELECT r.id, r.service, r.category, r.car, r.description,
                   r.status, r.created_at, r.target_master_id,
                   EXISTS(
                     SELECT 1 FROM {SCHEMA}.bids b2
                     WHERE b2.request_id = r.id AND b2.master_id = %s
                   ) AS already_bid,
                   COALESCE(r.photos, '{{}}') AS photos
            FROM {SCHEMA}.requests r
            JOIN {SCHEMA}.masters m ON m.id = %s
            WHERE r.status = 'open'
              AND (
                r.target_master_id = %s
                OR (
                  r.target_master_id IS NULL
                  AND (
                    m.specialty = r.category
                    OR m.specialty LIKE r.category || ', %%'
                    OR m.specialty LIKE '%%, ' || r.category || ', %%'
                    OR m.specialty LIKE '%%, ' || r.category
                  )
                )
              )
            ORDER BY r.created_at DESC
            LIMIT 50
            """,
            (master_id, master_id, master_id),
        )
        rows = cur.fetchall()
        requests_list = []
        for row in rows:
            requests_list.append({
                "id": row[0], "service": row[1], "category": row[2],
                "car": row[3], "description": row[4], "status": row[5],
                "created_at": str(row[6]), "target_master_id": row[7],
                "already_bid": row[8], "photos": list(row[9]) if row[9] else [],
            })
        cur.close(); conn.close()
        return ok({"requests": requests_list, "count": len(requests_list)})

    # ── GET: история откликов мастера ─────────────────────────────────────────
    if master_id and mode == "mybids":
        cur.execute(
            f"""
            SELECT b.id, b.price, b.comment, b.status, b.created_at,
                   r.id, r.service, r.category, r.car, r.description, r.status, r.created_at
            FROM {SCHEMA}.bids b
            JOIN {SCHEMA}.requests r ON r.id = b.request_id
            WHERE b.master_id = %s
            ORDER BY b.created_at DESC
            LIMIT 50
            """,
            (master_id,),
        )
        rows = cur.fetchall()
        bids = []
        for row in rows:
            bids.append({
                "bid_id": row[0], "price": row[1], "comment": row[2],
                "bid_status": row[3], "bid_created_at": str(row[4]),
                "request": {
                    "id": row[5], "service": row[6], "category": row[7],
                    "car": row[8], "description": row[9],
                    "status": row[10], "created_at": str(row[11]),
                },
            })
        cur.close(); conn.close()
        return ok({"bids": bids, "count": len(bids)})

    # ── GET: автомобили пользователя ──────────────────────────────────────────
    user_id = params.get("user_id")
    if user_id and mode == "cars":
        cur.execute(
            f"""
            SELECT id, brand, model, year, vin, created_at
            FROM {SCHEMA}.user_cars
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (int(user_id),),
        )
        cols = ["id", "brand", "model", "year", "vin", "created_at"]
        cars = []
        for row in cur.fetchall():
            car = dict(zip(cols, row))
            car["created_at"] = str(car["created_at"])
            cars.append(car)
        cur.close(); conn.close()
        return ok({"cars": cars})

    # ── GET: список мастеров по городу ───────────────────────────────────────
    if mode == "masters":
        city = params.get("city", "").strip()
        if city:
            cur.execute(
                f"""
                SELECT id, name, station, specialty, rating, reviews_count,
                       completed_orders, online, avatar, address, city
                FROM {SCHEMA}.masters
                WHERE LOWER(city) = LOWER(%s)
                ORDER BY rating DESC, reviews_count DESC
                """,
                (city,),
            )
        else:
            cur.execute(
                f"""
                SELECT id, name, station, specialty, rating, reviews_count,
                       completed_orders, online, avatar, address, city
                FROM {SCHEMA}.masters
                ORDER BY rating DESC, reviews_count DESC
                """,
            )
        rows = cur.fetchall()
        masters = []
        for row in rows:
            masters.append({
                "id": row[0], "name": row[1], "station": row[2], "specialty": row[3],
                "rating": float(row[4]), "reviews_count": row[5], "completed_orders": row[6],
                "online": row[7], "avatar": row[8],
                "address": row[9], "city": row[10],
            })
        cur.close(); conn.close()
        return ok({"masters": masters, "count": len(masters), "city": city})

    # ── GET: данные мастера ───────────────────────────────────────────────────
    if master_id and mode == "master_info":
        cur.execute(
            f"""
            SELECT id, name, station, specialty, rating, reviews_count,
                   completed_orders, online, avatar, address, city,
                   notifications_enabled
            FROM {SCHEMA}.masters WHERE id = %s
            """,
            (int(master_id),),
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Мастер не найден", 404)
        cur.close(); conn.close()
        return ok({
            "id": row[0], "name": row[1], "station": row[2], "specialty": row[3],
            "rating": float(row[4]), "reviews_count": row[5], "completed_orders": row[6],
            "online": row[7], "avatar": row[8], "address": row[9], "city": row[10],
            "notifications_enabled": row[11] if row[11] is not None else True,
        })

    # ── GET: отзывы клиента (что он оставил) ─────────────────────────────────
    if client_id and mode == "client_reviews":
        cur.execute(
            f"""
            SELECT rv.id, rv.rating, rv.text, rv.created_at,
                   m.name AS master_name, m.station, r.service
            FROM {SCHEMA}.reviews rv
            JOIN {SCHEMA}.masters m ON m.id = rv.master_id
            LEFT JOIN {SCHEMA}.requests r ON r.id = rv.request_id
            WHERE rv.client_id = %s
            ORDER BY rv.created_at DESC
            """,
            (int(client_id),),
        )
        rows = cur.fetchall()
        reviews = [
            {
                "id": row[0], "rating": row[1], "text": row[2],
                "created_at": str(row[3]), "master_name": row[4],
                "station": row[5], "service": row[6],
            }
            for row in rows
        ]
        cur.close(); conn.close()
        return ok({"reviews": reviews})

    # ── GET: отзывы о мастере ─────────────────────────────────────────────────
    if master_id and mode == "reviews":
        cur.execute(
            f"""
            SELECT rv.id, rv.rating, rv.text, rv.created_at,
                   u.name AS client_name
            FROM {SCHEMA}.reviews rv
            JOIN {SCHEMA}.users u ON u.id = rv.client_id
            WHERE rv.master_id = %s
            ORDER BY rv.created_at DESC
            LIMIT 50
            """,
            (int(master_id),),
        )
        rows = cur.fetchall()
        reviews = [
            {
                "id": row[0], "rating": row[1], "text": row[2],
                "created_at": str(row[3]), "client_name": row[4],
            }
            for row in rows
        ]
        cur.execute(
            f"SELECT COALESCE(AVG(rating),0), COUNT(*) FROM {SCHEMA}.reviews WHERE master_id = %s",
            (int(master_id),),
        )
        stat = cur.fetchone()
        cur.close(); conn.close()
        return ok({
            "reviews": reviews,
            "avg_rating": round(float(stat[0]), 1),
            "total": int(stat[1]),
        })

    cur.close(); conn.close()
    return err("Укажите client_id, master_id или request_id")