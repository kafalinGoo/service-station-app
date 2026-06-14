CREATE TABLE t_p3896276_service_station_app.chat_messages (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER NOT NULL,
    sender_id   INTEGER NOT NULL,
    sender_role VARCHAR(10) NOT NULL CHECK (sender_role IN ('client', 'master')),
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_request ON t_p3896276_service_station_app.chat_messages (request_id, created_at);
