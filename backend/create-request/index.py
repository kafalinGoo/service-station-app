"""
Создание запроса клиента на ТО.
Сохраняет запрос в БД и возвращает список мастеров по категории услуги,
которым "разослан" запрос.
"""
import json
import os
import psycopg2
import psycopg2.extras
import urllib.request

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}

CATEGORY_MAP = {
    "Замена масла и фильтров": "ТО",
    "Диагностика двигателя": "Двигатели",
    "Тормозная система": "Ходовая",
    "Ходовая часть": "Ходовая",
    "Электрика": "Электрика",
    "Кузовные работы": "Кузов",
    "Шиномонтаж": "ТО",
    "Кондиционер": "Электрика",
    "Трансмиссия": "Двигатели",
    "Русификация": "Русификация",
    "Другое": "ТО",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    service = body.get("service", "")
    car = body.get("car", "")
    description = body.get("description", "")
    client_id = body.get("client_id", 1)
    master_id = body.get("master_id")  # если задан — запрос только этому мастеру
    city = (body.get("city") or "").strip() or None
    photos = body.get("photos") or []  # список CDN URL загруженных фото

    if not service or not car:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "service и car обязательны"}),
        }

    category = CATEGORY_MAP.get(service, "ТО")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO t_p3896276_service_station_app.requests
            (client_id, service, category, car, description, status, target_master_id, city, photos)
        VALUES (%s, %s, %s, %s, %s, 'open', %s, %s, %s)
        RETURNING id, created_at
        """,
        (client_id, service, category, car, description, master_id or None, city, photos if photos else []),
    )
    row = cur.fetchone()
    request_id, created_at = row[0], row[1]

    cols = ["id", "name", "station", "specialty", "rating", "reviews_count",
            "completed_orders", "online", "avatar", "address", "city"]

    if master_id:
        cur.execute(
            """
            SELECT id, name, station, specialty, rating, reviews_count,
                   completed_orders, online, avatar, address, city
            FROM t_p3896276_service_station_app.masters
            WHERE id = %s
            """,
            (master_id,),
        )
    else:
        if city:
            cur.execute(
                """
                SELECT id, name, station, specialty, rating, reviews_count,
                       completed_orders, online, avatar, address, city
                FROM t_p3896276_service_station_app.masters
                WHERE (specialty = %s OR specialty LIKE %s OR specialty LIKE %s OR specialty LIKE %s)
                  AND (city = %s OR city IS NULL)
                  AND notifications_enabled = TRUE
                ORDER BY (city = %s) DESC, rating DESC, completed_orders DESC
                LIMIT 10
                """,
                (category, f"{category}, %", f"%, {category}, %", f"%, {category}", city, city),
            )
        else:
            cur.execute(
                """
                SELECT id, name, station, specialty, rating, reviews_count,
                       completed_orders, online, avatar, address, city
                FROM t_p3896276_service_station_app.masters
                WHERE (specialty = %s OR specialty LIKE %s OR specialty LIKE %s OR specialty LIKE %s)
                  AND notifications_enabled = TRUE
                ORDER BY rating DESC, completed_orders DESC
                LIMIT 10
                """,
                (category, f"{category}, %", f"%, {category}, %", f"%, {category}"),
            )

    masters = [dict(zip(cols, r)) for r in cur.fetchall()]
    for m in masters:
        m["rating"] = float(m["rating"])

    # Создаём уведомления всем уведомлённым мастерам (batch INSERT)
    if masters:
        if master_id:
            notif_type = "personal_request"
            notif_title = "Персональный запрос"
            notif_text = f"Клиент выбрал вас для: {service}. Автомобиль: {car}"
        else:
            notif_type = "new_request"
            notif_title = f"Новая заявка: {service}"
            notif_text = f"Автомобиль: {car}" + (f" — {description[:80]}" if description else "")
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO t_p3896276_service_station_app.notifications
                (master_id, type, title, text, request_id)
            VALUES %s
            """,
            [(m["id"], notif_type, notif_title, notif_text, request_id) for m in masters],
        )

    conn.commit()
    cur.close()
    conn.close()

    # Отправляем Web Push уведомления мастерам
    master_ids = [m["id"] for m in masters]
    if master_ids:
        try:
            send_push_url = os.environ.get("SEND_PUSH_URL", "")
            if send_push_url:
                push_payload = json.dumps({
                    "master_ids": master_ids,
                    "title": "Новая заявка",
                    "body": f"{service} · {car}",
                    "data": {"request_id": request_id},
                }).encode()
                req = urllib.request.Request(
                    send_push_url,
                    data=push_payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "request_id": request_id,
            "category": category,
            "notified_masters": len(masters),
            "masters": masters,
            "created_at": str(created_at),
        }),
    }