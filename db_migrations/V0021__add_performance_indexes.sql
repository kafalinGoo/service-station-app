-- Индексы для bids
CREATE INDEX IF NOT EXISTS idx_bids_master_id ON t_p3896276_service_station_app.bids (master_id);
CREATE INDEX IF NOT EXISTS idx_bids_request_id ON t_p3896276_service_station_app.bids (request_id);
CREATE INDEX IF NOT EXISTS idx_bids_master_status ON t_p3896276_service_station_app.bids (master_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_request_master ON t_p3896276_service_station_app.bids (request_id, master_id);

-- Индексы для requests
CREATE INDEX IF NOT EXISTS idx_requests_client_id ON t_p3896276_service_station_app.requests (client_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON t_p3896276_service_station_app.requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON t_p3896276_service_station_app.requests (created_at);
CREATE INDEX IF NOT EXISTS idx_requests_target_master ON t_p3896276_service_station_app.requests (target_master_id) WHERE target_master_id IS NOT NULL;

-- Индексы для notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON t_p3896276_service_station_app.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_master_id ON t_p3896276_service_station_app.notifications (master_id) WHERE master_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON t_p3896276_service_station_app.notifications (user_id, is_read);

-- Индексы для masters
CREATE INDEX IF NOT EXISTS idx_masters_rating ON t_p3896276_service_station_app.masters (rating DESC);
CREATE INDEX IF NOT EXISTS idx_masters_city_lower ON t_p3896276_service_station_app.masters (LOWER(city));

-- Индексы для reviews
CREATE INDEX IF NOT EXISTS idx_reviews_master_id ON t_p3896276_service_station_app.reviews (master_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON t_p3896276_service_station_app.reviews (client_id);

-- Индексы для user_cars
CREATE INDEX IF NOT EXISTS idx_user_cars_user_id ON t_p3896276_service_station_app.user_cars (user_id);

-- Индексы для push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON t_p3896276_service_station_app.push_subscriptions (user_id) WHERE user_id IS NOT NULL;
