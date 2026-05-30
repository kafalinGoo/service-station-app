"""
Получение откликов мастеров по запросу клиента.
GET /?request_id=123
"""
import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    request_id = params.get("request_id")

    if not request_id:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "request_id обязателен"}),
        }

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(
        """
        SELECT r.id, r.service, r.category, r.car, r.description, r.status, r.created_at
        FROM t_p3896276_service_station_app.requests r
        WHERE r.id = %s
        """,
        (request_id,),
    )
    req = cur.fetchone()
    if not req:
        cur.close(); conn.close()
        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Запрос не найден"})}

    request_data = {
        "id": req[0], "service": req[1], "category": req[2],
        "car": req[3], "description": req[4], "status": req[5],
        "created_at": str(req[6]),
    }

    cur.execute(
        """
        SELECT b.id, b.price, b.comment, b.status, b.created_at,
               m.id, m.name, m.station, m.specialty, m.rating,
               m.reviews_count, m.completed_orders, m.online, m.avatar
        FROM t_p3896276_service_station_app.bids b
        JOIN t_p3896276_service_station_app.masters m ON m.id = b.master_id
        WHERE b.request_id = %s
        ORDER BY b.price ASC, b.created_at ASC
        """,
        (request_id,),
    )
    bids = []
    for row in cur.fetchall():
        bids.append({
            "bid_id": row[0],
            "price": row[1],
            "comment": row[2],
            "status": row[3],
            "created_at": str(row[4]),
            "master": {
                "id": row[5], "name": row[6], "station": row[7],
                "specialty": row[8], "rating": float(row[9]),
                "reviews_count": row[10], "completed_orders": row[11],
                "online": row[12], "avatar": row[13],
            },
        })

    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "request": request_data,
            "bids": bids,
            "bids_count": len(bids),
        }),
    }
