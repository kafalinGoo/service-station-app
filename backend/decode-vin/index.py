"""
Декодирование VIN через бесплатный NHTSA API (США).
GET /?vin=1HGBH41JXMN109186
Возвращает: марку, модель, год, тип кузова, объём двигателя.
"""
import json
import os
import urllib.request

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

NHTSA_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"

FIELD_MAP = {
    "Make": "make",
    "Model": "model",
    "ModelYear": "year",
    "BodyClass": "body",
    "DisplacementL": "displacement",
    "EngineCylinders": "cylinders",
    "FuelTypePrimary": "fuel",
    "DriveType": "drive",
    "TransmissionStyle": "transmission",
    "VehicleType": "vehicle_type",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    vin = (params.get("vin") or "").strip().upper()

    if not vin:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "VIN обязателен"}),
        }

    if len(vin) != 17:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "VIN должен содержать ровно 17 символов"}),
        }

    url = NHTSA_URL.format(vin=vin)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = json.loads(resp.read().decode())

    results = raw.get("Results", [{}])[0]

    # Проверяем что VIN распознан (ErrorCode 8 = не найден, 11 = некорректный)
    error_code = results.get("ErrorCode", "")
    make = results.get("Make", "").strip()
    model = results.get("Model", "").strip()
    year = results.get("ModelYear", "").strip()
    if error_code.startswith("11") or (not make and not model and not year):
        return {
            "statusCode": 422,
            "headers": CORS,
            "body": json.dumps({"error": "VIN не распознан. Проверьте правильность ввода."}),
        }

    decoded = {}
    for nhtsa_key, our_key in FIELD_MAP.items():
        val = (results.get(nhtsa_key) or "").strip()
        if val:
            decoded[our_key] = val

    # Собираем читаемую строку для поля "Автомобиль"
    parts = []
    if decoded.get("make"):
        parts.append(decoded["make"].capitalize())
    if decoded.get("model"):
        parts.append(decoded["model"])
    if decoded.get("year"):
        parts.append(decoded["year"])

    car_string = " ".join(parts)

    # Доп. детали
    details = []
    if decoded.get("displacement"):
        try:
            vol = round(float(decoded["displacement"]), 1)
            details.append(f"{vol}л")
        except ValueError:
            pass
    if decoded.get("cylinders"):
        details.append(f"{decoded['cylinders']} цил.")
    if decoded.get("fuel"):
        details.append(decoded["fuel"])
    if decoded.get("drive"):
        details.append(decoded["drive"])

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "vin": vin,
            "car": car_string,
            "details": ", ".join(details),
            "raw": decoded,
        }, ensure_ascii=False),
    }