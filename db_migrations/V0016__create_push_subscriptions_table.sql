CREATE TABLE t_p3896276_service_station_app.push_subscriptions (
    id          SERIAL PRIMARY KEY,
    master_id   INTEGER NOT NULL,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (master_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_master ON t_p3896276_service_station_app.push_subscriptions (master_id);
