"""
Аналитика для мастера.
GET /?master_id=N&period=week|month|quarter|year
Возвращает: выручку, заказы, клиентов, топ услуг, данные графика, рейтинг.
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = "t_p3896276_service_station_app"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(body, ensure_ascii=False)}

def err(msg: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def period_bounds(period: str):
    now = datetime.now(timezone.utc)
    if period == "week":
        # начало текущей недели (понедельник 00:00 UTC)
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        prev = start - timedelta(days=7)
    elif period == "quarter":
        # начало текущего квартала
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        # начало предыдущего квартала
        prev_q_month = q_month - 3 if q_month > 3 else 10
        prev_year = now.year if q_month > 3 else now.year - 1
        prev = now.replace(year=prev_year, month=prev_q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev = start.replace(year=now.year - 1)
    else:  # month
        start = now - timedelta(days=30)
        prev = now - timedelta(days=60)
    return start, prev, now


def handler(event: dict, context) -> dict:
    """Аналитика мастера по периодам."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    master_id = params.get("master_id")
    period = params.get("period", "month")

    if not master_id:
        return err("master_id обязателен")
    if period not in ("week", "month", "quarter", "year"):
        return err("period: week|month|quarter|year")

    start, prev_start, now = period_bounds(period)
    mid = start  # граница текущего и предыдущего периода

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    # ── Текущий период: принятые отклики мастера ─────────────────────────────
    cur.execute(f"""
        SELECT
            COUNT(*) AS orders,
            COALESCE(SUM(b.price), 0) AS revenue,
            COUNT(DISTINCT r.client_id) AS clients
        FROM {SCHEMA}.bids b
        JOIN {SCHEMA}.requests r ON r.id = b.request_id
        WHERE b.master_id = %s
          AND b.status = 'accepted'
          AND b.created_at >= %s
          AND b.created_at < %s
    """, (int(master_id), start, now))
    cur_row = cur.fetchone()
    orders, revenue, clients = int(cur_row[0]), int(cur_row[1]), int(cur_row[2])
    avg_check = round(revenue / orders) if orders else 0

    # ── Предыдущий период ─────────────────────────────────────────────────────
    cur.execute(f"""
        SELECT
            COUNT(*) AS orders,
            COALESCE(SUM(b.price), 0) AS revenue,
            COUNT(DISTINCT r.client_id) AS clients
        FROM {SCHEMA}.bids b
        JOIN {SCHEMA}.requests r ON r.id = b.request_id
        WHERE b.master_id = %s
          AND b.status = 'accepted'
          AND b.created_at >= %s
          AND b.created_at < %s
    """, (int(master_id), prev_start, mid))
    prev_row = cur.fetchone()
    prev_orders, prev_revenue, prev_clients = int(prev_row[0]), int(prev_row[1]), int(prev_row[2])

    def delta_pct(cur_val, prev_val):
        if prev_val == 0:
            return f"+{cur_val}" if cur_val else "0"
        d = cur_val - prev_val
        pct = round(d / prev_val * 100, 1)
        return f"+{pct}%" if pct >= 0 else f"{pct}%"

    def delta_abs(cur_val, prev_val):
        d = cur_val - prev_val
        return f"+{d}" if d >= 0 else str(d)

    # ── Рейтинг мастера ───────────────────────────────────────────────────────
    cur.execute(f"""
        SELECT COALESCE(AVG(rating), 0), COUNT(*)
        FROM {SCHEMA}.reviews WHERE master_id = %s
    """, (int(master_id),))
    rating_row = cur.fetchone()
    rating = round(float(rating_row[0]), 1)
    reviews_count = int(rating_row[1])

    # ── Топ услуг по выручке ──────────────────────────────────────────────────
    cur.execute(f"""
        SELECT r.service, COALESCE(SUM(b.price), 0) AS rev
        FROM {SCHEMA}.bids b
        JOIN {SCHEMA}.requests r ON r.id = b.request_id
        WHERE b.master_id = %s
          AND b.status = 'accepted'
          AND b.created_at >= %s
        GROUP BY r.service
        ORDER BY rev DESC
        LIMIT 5
    """, (int(master_id), start))
    top_services_raw = cur.fetchall()
    top_services = [{"name": row[0], "revenue": int(row[1])} for row in top_services_raw]

    # ── График: распределение выручки по подпериодам ─────────────────────────
    if period == "week":
        # 7 дней
        cur.execute(f"""
            SELECT DATE_TRUNC('day', b.created_at) AS d, COALESCE(SUM(b.price), 0)
            FROM {SCHEMA}.bids b
            WHERE b.master_id = %s AND b.status = 'accepted'
              AND b.created_at >= %s
            GROUP BY d ORDER BY d
        """, (int(master_id), start))
        rows = cur.fetchall()
        # заполняем все 7 дней
        bars = []
        labels = []
        day_names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        for i in range(7):
            day = (start + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            val = next((int(r[1]) for r in rows if r[0].date() == day.date()), 0)
            bars.append(val)
            labels.append(day_names[day.weekday()])

    elif period == "month":
        today = now.date()
        # первый день текущего месяца
        first_day = today.replace(day=1)
        # последний день текущего месяца
        if first_day.month == 12:
            last_day = first_day.replace(year=first_day.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            last_day = first_day.replace(month=first_day.month + 1, day=1) - timedelta(days=1)
        cur.execute(f"""
            SELECT DATE(b.created_at) AS d, COALESCE(SUM(b.price), 0)
            FROM {SCHEMA}.bids b
            WHERE b.master_id = %s AND b.status = 'accepted'
              AND b.created_at >= %s AND b.created_at < %s
            GROUP BY d ORDER BY d
        """, (int(master_id), first_day, last_day + timedelta(days=1)))
        rows = cur.fetchall()
        day_map = {r[0]: int(r[1]) for r in rows}
        bars = []
        labels = []
        # первый понедельник, покрывающий месяц
        week_start = first_day - timedelta(days=first_day.weekday())
        week_num = 1
        while week_start <= last_day:
            week_rev = sum(day_map.get(week_start + timedelta(days=d), 0) for d in range(7))
            bars.append(week_rev)
            labels.append(f"Нед {week_num}")
            week_start += timedelta(days=7)
            week_num += 1

    elif period == "quarter":
        cur.execute(f"""
            SELECT DATE_TRUNC('month', b.created_at) AS md, COALESCE(SUM(b.price), 0)
            FROM {SCHEMA}.bids b
            WHERE b.master_id = %s AND b.status = 'accepted'
              AND b.created_at >= %s
            GROUP BY md ORDER BY md
        """, (int(master_id), start))
        rows = cur.fetchall()
        row_map = {r[0].date(): int(r[1]) for r in rows}
        ru_months = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
        q_month = ((now.month - 1) // 3) * 3 + 1
        bars = []
        labels = []
        for i in range(3):
            m = q_month + i
            y = now.year
            from datetime import date as date_cls
            key = date_cls(y, m, 1)
            bars.append(row_map.get(key, 0))
            labels.append(ru_months[m])

    else:  # year
        cur.execute(f"""
            SELECT DATE_TRUNC('month', b.created_at) AS md, COALESCE(SUM(b.price), 0)
            FROM {SCHEMA}.bids b
            WHERE b.master_id = %s AND b.status = 'accepted'
              AND b.created_at >= %s
            GROUP BY md ORDER BY md
        """, (int(master_id), start))
        rows = cur.fetchall()
        row_map = {r[0].date(): int(r[1]) for r in rows}
        ru_months = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
        from datetime import date as date_cls
        bars = []
        labels = []
        for m in range(1, now.month + 1):
            key = date_cls(now.year, m, 1)
            bars.append(row_map.get(key, 0))
            labels.append(ru_months[m])

    cur.close()
    conn.close()

    return ok({
        "period": period,
        "revenue": revenue,
        "revenue_delta": delta_pct(revenue, prev_revenue),
        "orders": orders,
        "orders_delta": delta_abs(orders, prev_orders),
        "avg_check": avg_check,
        "avg_check_delta": delta_pct(avg_check, round(prev_revenue / prev_orders) if prev_orders else 0),
        "clients": clients,
        "clients_delta": delta_abs(clients, prev_clients),
        "rating": rating,
        "reviews_count": reviews_count,
        "top_services": top_services,
        "bars": bars,
        "bar_labels": labels,
    })