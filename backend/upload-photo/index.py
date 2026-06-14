"""
Загрузка фото заявки в S3.
POST {filename: str, content_type: str, data: base64} — загружает файл, возвращает CDN URL
"""
import json
import os
import base64
import uuid
import boto3

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    filename = body.get("filename", "photo.jpg")
    content_type = body.get("content_type", "image/jpeg")
    data_b64 = body.get("data", "")

    if content_type not in ALLOWED_TYPES:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Недопустимый тип файла"})}

    if not data_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет данных файла"})}

    image_data = base64.b64decode(data_b64)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    key = f"request-photos/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=image_data, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"url": cdn_url}),
    }
