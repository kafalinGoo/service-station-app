
-- Пользователи (клиенты)
CREATE TABLE t_p3896276_service_station_app.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Мастера / станции
CREATE TABLE t_p3896276_service_station_app.masters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  station TEXT NOT NULL,
  specialty TEXT NOT NULL,  -- категория: "Двигатели", "Электрика", "Ходовая" и т.д.
  rating NUMERIC(3,1) DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  completed_orders INT DEFAULT 0,
  price_from INT DEFAULT 0,
  online BOOLEAN DEFAULT TRUE,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Запросы клиентов
CREATE TABLE t_p3896276_service_station_app.requests (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES t_p3896276_service_station_app.users(id),
  service TEXT NOT NULL,       -- тип услуги
  category TEXT NOT NULL,      -- категория для рассылки мастерам
  car TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',  -- open | accepted | closed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Отклики мастеров на запросы
CREATE TABLE t_p3896276_service_station_app.bids (
  id SERIAL PRIMARY KEY,
  request_id INT REFERENCES t_p3896276_service_station_app.requests(id),
  master_id INT REFERENCES t_p3896276_service_station_app.masters(id),
  price INT NOT NULL,          -- предложенная цена в рублях
  comment TEXT,
  status TEXT DEFAULT 'pending', -- pending | accepted | rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Сидируем мастеров
INSERT INTO t_p3896276_service_station_app.masters (name, station, specialty, rating, reviews_count, completed_orders, price_from, online, avatar) VALUES
('Алексей Коваль',    'AutoPro Сервис', 'Двигатели', 4.9, 312, 847, 2500, true,  'AK'),
('Дмитрий Синицын',  'TechDrive',       'Электрика', 4.8, 215, 634, 1800, true,  'ДС'),
('Игорь Петров',     'МастерТО',        'Ходовая',   4.7, 189, 512, 1200, false, 'ИП'),
('Виктор Лазарев',   'AutoPro Сервис', 'Кузов',      4.8, 278, 703, 3000, true,  'ВЛ'),
('Сергей Морозов',   'ТехноСервис',    'Двигатели',  4.6, 145, 398, 2000, true,  'СМ'),
('Антон Власов',     'TechDrive',      'Электрика',  4.7, 201, 560, 1600, false, 'АВ'),
('Павел Громов',     'МастерТО',       'Ходовая',    4.5, 130, 310, 1000, true,  'ПГ'),
('Николай Орлов',    'AutoPro Сервис', 'Кузов',      4.9, 350, 920, 3500, true,  'НО'),
('Иван Степанов',    'ТехноСервис',    'ТО',         4.6, 178, 445, 1500, true,  'ИС'),
('Максим Фёдоров',   'TechDrive',      'ТО',         4.8, 220, 580, 1400, true,  'МФ');

-- Тестовый пользователь
INSERT INTO t_p3896276_service_station_app.users (name, phone) VALUES
('Михаил Семёнов', '+7 (916) 245-78-32');
