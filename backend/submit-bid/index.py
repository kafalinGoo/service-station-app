"""
Мастер оставляет отклик на запрос клиента с предложенной ценой.
"""
import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    request_id = body.get("request_id")
    master_id = body.get("master_id")
    price = body.get("price")
    comment = body.get("comment", "")

    if not all([request_id, master_id, price]):
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "request_id, master_id и price обязательны"}),
        }

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(
        "SELECT status FROM t_p3896276_service_station_app.requests WHERE id = %s",
        (request_id,),
    )
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Запрос не найден"})}
    if row[0] != "open":
        cur.close(); conn.close()
        return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Запрос уже закрыт"})}

    cur.execute(
        "SELECT id FROM t_p3896276_service_station_app.bids WHERE request_id = %s AND master_id = %s",
        (request_id, master_id),
    )
    if cur.fetchone():
        cur.close(); conn.close()
        return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Вы уже откликались на этот запрос"})}

    cur.execute(
        """
        INSERT INTO t_p3896276_service_station_app.bids
            (request_id, master_id, price, comment, status)
        VALUES (%s, %s, %s, %s, 'pending')
        RETURNING id, created_at
        """,
        (request_id, master_id, price, comment),
    )
    bid_id, created_at = cur.fetchone()

    cur.execute(
        "SELECT name, station FROM t_p3896276_service_station_app.masters WHERE id = %s",
        (master_id,),
    )
    master = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "bid_id": bid_id,
            "request_id": request_id,
            "master_name": master[0] if master else "",
            "station": master[1] if master else "",
            "price": price,
            "comment": comment,
            "created_at": str(created_at),
        }),
    }
