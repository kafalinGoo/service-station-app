"""
Многофункциональный эндпоинт:
- GET  /?vin=...    — декодирование VIN
- POST /register    — регистрация (name, phone, password, role, [specialty, station])
- POST /login       — вход (phone, password)
- GET  /me          — данные текущего пользователя по X-Auth-Token
"""
import json
import os
import hashlib
import secrets
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = "t_p3896276_service_station_app"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}
NHTSA_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
FIELD_MAP = {
    "Make": "make", "Model": "model", "ModelYear": "year",
    "BodyClass": "body", "DisplacementL": "displacement",
    "EngineCylinders": "cylinders", "FuelTypePrimary": "fuel",
    "DriveType": "drive", "TransmissionStyle": "transmission",
}


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def make_token() -> str:
    return secrets.token_hex(32)

def ok(body: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False)}

def err(msg: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # action передаётся через ?action=register|login|me или body.action
    action = params.get("action") or body.get("action") or ""

    # ── VIN decode (GET /?vin=...) ────────────────────────────────────────────
    if method == "GET" and params.get("vin") and not action:
        vin = params["vin"].strip().upper()
        if len(vin) != 17:
            return err("VIN должен содержать ровно 17 символов", 400)
        url = NHTSA_URL.format(vin=vin)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode())
        results = raw.get("Results", [{}])[0]
        error_code = results.get("ErrorCode", "")
        make = results.get("Make", "").strip()
        model = results.get("Model", "").strip()
        year = results.get("ModelYear", "").strip()
        if error_code.startswith("11") or (not make and not model and not year):
            return err("VIN не распознан. Проверьте правильность ввода.", 422)
        decoded = {v: (results.get(k) or "").strip() for k, v in FIELD_MAP.items() if (results.get(k) or "").strip()}
        car_string = " ".join(p for p in [decoded.get("make", "").capitalize(), decoded.get("model", ""), decoded.get("year", "")] if p)
        details_parts = []
        if decoded.get("displacement"):
            try: details_parts.append(f"{round(float(decoded['displacement']), 1)}л")
            except ValueError: pass
        if decoded.get("cylinders"): details_parts.append(f"{decoded['cylinders']} цил.")
        if decoded.get("fuel"): details_parts.append(decoded["fuel"])
        if decoded.get("drive"): details_parts.append(decoded["drive"])
        return ok({"vin": vin, "car": car_string, "details": ", ".join(details_parts), "raw": decoded})

    # ── Auth endpoints ────────────────────────────────────────────────────────
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    # GET ?action=me
    if action == "me":
        token = (event.get("headers") or {}).get("X-Auth-Token", "")
        if not token:
            cur.close(); conn.close()
            return err("Токен не передан", 401)
        cur.execute(
            f"SELECT id, name, phone, role, master_id FROM {SCHEMA}.users WHERE password_hash LIKE %s",
            (f"%TOKEN:{token}%",),
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return err("Токен недействителен", 401)
        return ok({"id": row[0], "name": row[1], "phone": row[2], "role": row[3], "master_id": row[4]})

    # POST action=register
    if action == "register":
        phone = (body.get("phone") or "").strip()
        password = body.get("password", "")
        name = (body.get("name") or "").strip()
        role = body.get("role", "client")
        if not phone or not password or not name:
            cur.close(); conn.close()
            return err("Имя, телефон и пароль обязательны")
        if role not in ("client", "master"):
            cur.close(); conn.close()
            return err("Роль должна быть client или master")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close(); conn.close()
            return err("Этот номер уже зарегистрирован", 409)
        salt = secrets.token_hex(8)
        pw_hash = hash_password(password, salt)
        token = make_token()
        stored = f"{salt}:{pw_hash}:TOKEN:{token}"
        master_id = None
        if role == "master":
            specialty = (body.get("specialty") or "ТО").strip()
            station = (body.get("station") or "Моя станция").strip()
            address = (body.get("address") or "").strip() or None
            city = None
            if address:
                try:
                    geo_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(address)}&format=json&addressdetails=1&limit=1&accept-language=ru"
                    geo_req = urllib.request.Request(geo_url, headers={"User-Agent": "AutoTechApp/1.0"})
                    with urllib.request.urlopen(geo_req, timeout=5) as geo_resp:
                        geo_data = json.loads(geo_resp.read().decode())
                    if geo_data:
                        addr_parts = geo_data[0].get("address", {})
                        city = (
                            addr_parts.get("city") or
                            addr_parts.get("town") or
                            addr_parts.get("city_district") or
                            addr_parts.get("village") or
                            addr_parts.get("municipality") or
                            addr_parts.get("state") or
                            addr_parts.get("county")
                        )
                except Exception:
                    pass
            cur.execute(
                f"""INSERT INTO {SCHEMA}.masters (name, station, specialty, rating, reviews_count, completed_orders, online, avatar, address, city, phone)
                    VALUES (%s, %s, %s, 5.0, 0, 0, false, %s, %s, %s, %s) RETURNING id""",
                (name, station, specialty, name[:2].upper(), address, city, phone),
            )
            master_id = cur.fetchone()[0]
        privacy_version = (body.get("privacy_version") or "").strip() or None
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (name, phone, password_hash, role, master_id, privacy_accepted_at, privacy_version) VALUES (%s,%s,%s,%s,%s, CASE WHEN %s IS NOT NULL THEN now() ELSE NULL END, %s) RETURNING id",
            (name, phone, stored, role, master_id, privacy_version, privacy_version),
        )
        user_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return ok({"token": token, "id": user_id, "name": name, "phone": phone, "role": role, "master_id": master_id}, 201)

    # POST action=login
    if action == "login":
        phone = (body.get("phone") or "").strip()
        password = body.get("password", "")
        if not phone or not password:
            cur.close(); conn.close()
            return err("Телефон и пароль обязательны")
        cur.execute(
            f"SELECT id, name, phone, password_hash, role, master_id FROM {SCHEMA}.users WHERE phone = %s",
            (phone,),
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Неверный номер или пароль", 401)
        user_id, name, phone_db, stored, role, master_id = row
        parts = stored.split(":")
        if len(parts) < 4 or hash_password(password, parts[0]) != parts[1]:
            cur.close(); conn.close()
            return err("Неверный номер или пароль", 401)
        new_token = make_token()
        new_stored = f"{parts[0]}:{parts[1]}:TOKEN:{new_token}"
        cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_stored, user_id))
        conn.commit(); cur.close(); conn.close()
        return ok({"token": new_token, "id": user_id, "name": name, "phone": phone_db, "role": role, "master_id": master_id})

    # POST action=update_master
    if action == "update_master":
        master_id = body.get("master_id")
        if not master_id:
            cur.close(); conn.close()
            return err("master_id обязателен")
        fields = {}
        if "station" in body: fields["station"] = (body["station"] or "").strip()
        if "specialty" in body: fields["specialty"] = (body["specialty"] or "").strip()
        if "address" in body:
            address_val = (body["address"] or "").strip() or None
            fields["address"] = address_val
            # Геокодинг через Nominatim — определяем город по адресу
            if address_val:
                try:
                    geo_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(address_val)}&format=json&addressdetails=1&limit=1&accept-language=ru"
                    geo_req = urllib.request.Request(geo_url, headers={"User-Agent": "AutoTechApp/1.0"})
                    with urllib.request.urlopen(geo_req, timeout=5) as geo_resp:
                        geo_data = json.loads(geo_resp.read().decode())
                    if geo_data:
                        addr_parts = geo_data[0].get("address", {})
                        city_val = (
                            addr_parts.get("city") or
                            addr_parts.get("town") or
                            addr_parts.get("city_district") or
                            addr_parts.get("village") or
                            addr_parts.get("municipality") or
                            addr_parts.get("state") or
                            addr_parts.get("county")
                        )
                        if city_val:
                            fields["city"] = city_val
                except Exception:
                    pass
        if "price_from" in body:
            try: fields["price_from"] = int(body["price_from"])
            except (ValueError, TypeError): pass
        if "notifications_enabled" in body:
            fields["notifications_enabled"] = bool(body["notifications_enabled"])
        if not fields:
            cur.close(); conn.close()
            return err("Нет полей для обновления")
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        cur.execute(
            f"UPDATE {SCHEMA}.masters SET {set_clause} WHERE id = %s RETURNING id, name, station, specialty, address, price_from, city, notifications_enabled",
            (*fields.values(), int(master_id)),
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Мастер не найден", 404)
        conn.commit(); cur.close(); conn.close()
        return ok({"id": row[0], "name": row[1], "station": row[2], "specialty": row[3], "address": row[4], "price_from": row[5], "city": row[6], "notifications_enabled": row[7]})

    # ── POST action=change_password ───────────────────────────────────────────
    if action == "change_password":
        user_id = body.get("user_id")
        current_password = body.get("current_password", "")
        new_password = body.get("new_password", "")
        if not all([user_id, current_password, new_password]):
            cur.close(); conn.close()
            return err("user_id, current_password и new_password обязательны")
        if len(new_password) < 6:
            cur.close(); conn.close()
            return err("Новый пароль должен быть не менее 6 символов")
        cur.execute(f"SELECT password_hash FROM {SCHEMA}.users WHERE id = %s", (int(user_id),))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Пользователь не найден", 404)
        stored = row[0]
        salt, pw_hash = stored.split(":")[:2]
        if hash_password(current_password, salt) != pw_hash:
            cur.close(); conn.close()
            return err("Неверный текущий пароль", 401)
        new_salt = secrets.token_hex(8)
        new_hash = hash_password(new_password, new_salt)
        new_token = make_token()
        new_stored = f"{new_salt}:{new_hash}:TOKEN:{new_token}"
        cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_stored, int(user_id)))
        conn.commit(); cur.close(); conn.close()
        return ok({"ok": True})

    cur.close(); conn.close()
    return err("Не найдено", 404)