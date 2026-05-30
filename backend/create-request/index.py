"""
Создание запроса клиента на ТО.
Сохраняет запрос в БД и возвращает список мастеров по категории услуги,
которым "разослан" запрос.
"""
import json
import os
import psycopg2

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
            (client_id, service, category, car, description, status)
        VALUES (%s, %s, %s, %s, %s, 'open')
        RETURNING id, created_at
        """,
        (client_id, service, category, car, description),
    )
    row = cur.fetchone()
    request_id, created_at = row[0], row[1]

    cur.execute(
        """
        SELECT id, name, station, specialty, rating, reviews_count,
               completed_orders, price_from, online, avatar
        FROM t_p3896276_service_station_app.masters
        WHERE specialty = %s
        ORDER BY rating DESC, completed_orders DESC
        LIMIT 10
        """,
        (category,),
    )
    cols = ["id", "name", "station", "specialty", "rating", "reviews_count",
            "completed_orders", "price_from", "online", "avatar"]
    masters = [dict(zip(cols, r)) for r in cur.fetchall()]

    for m in masters:
        m["rating"] = float(m["rating"])

    conn.commit()
    cur.close()
    conn.close()

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
