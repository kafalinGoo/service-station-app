import os
import json
import psycopg2

SCHEMA = "t_p3896276_service_station_app"


def handler(event: dict, context) -> dict:
    """Закрывает заявки без откликов старше 24 часов и помечает их как expired."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(f"""
        UPDATE {SCHEMA}.requests
        SET status = 'expired'
        WHERE status = 'open'
          AND created_at < NOW() - INTERVAL '24 hours'
          AND NOT EXISTS (
              SELECT 1 FROM {SCHEMA}.bids b WHERE b.request_id = {SCHEMA}.requests.id
          )
        RETURNING id, client_id
    """)
    closed = cur.fetchall()
    conn.commit()

    if closed:
        values = ",".join(
            cur.mogrify("(%s,'expired_request','Заявка не нашла мастера','К сожалению, на вашу заявку никто не откликнулся.',%s)", (client_id, req_id)).decode()
            for req_id, client_id in closed
        )
        cur.execute(f"INSERT INTO {SCHEMA}.notifications (user_id, type, title, text, request_id) VALUES {values}")
        conn.commit()

    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"closed": len(closed), "ids": [r[0] for r in closed]}),
    }