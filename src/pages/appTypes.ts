// ─── Helpers ──────────────────────────────────────────────────────────────────

export function pluralOrders(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} заказ`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} заказа`;
  return `${n} заказов`;
}
export function ordersWord(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заказ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "заказа";
  return "заказов";
}

// ─── API URLs ─────────────────────────────────────────────────────────────────

export const API = {
  createRequest:    "https://functions.poehali.dev/628f6c50-4120-4f96-a248-9d96677095e2",
  getBids:          "https://functions.poehali.dev/474bd80e-7fe6-40b8-a4f2-9ef3144a6ae9",
  submitBid:        "https://functions.poehali.dev/18647c14-ab2a-4a4e-ae2e-ca2d139dfe20",
  decodeVin:        "https://functions.poehali.dev/50d346e2-4e25-47c2-bdc1-aa10367a98ff",
  getNotifications: "https://functions.poehali.dev/1fe02ff1-664e-4fd7-888a-e1f1f3d3df07",
  auth:             "https://functions.poehali.dev/50d346e2-4e25-47c2-bdc1-aa10367a98ff",
  analytics:        "https://functions.poehali.dev/57a860cb-cb58-4669-8426-eb6a99545775",
  chat:             "https://functions.poehali.dev/3e3464be-bba4-4476-a834-de7d66d20005",
  uploadPhoto:      "https://functions.poehali.dev/a425d163-4d44-4a96-8d8b-e361857bc3a7",
  pushSubscribe:    "https://functions.poehali.dev/ea9857bb-2ecf-4f2b-b2fb-b8afdbc866ac",
};

export async function fetchUserCars(userId: number): Promise<UserCar[]> {
  const res = await fetch(`${API.getBids}?user_id=${userId}&mode=cars`);
  const raw = await res.json();
  const data = typeof raw === "string" ? JSON.parse(raw) : (raw.body ? (typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body) : raw);
  return data.cars || [];
}

export async function addUserCar(userId: number, car: { brand: string; model: string; year: number; vin?: string }): Promise<UserCar> {
  const res = await fetch(API.getBids, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add_car", user_id: userId, ...car }),
  });
  const raw = await res.json();
  const data = typeof raw === "string" ? JSON.parse(raw) : (raw.body ? (typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body) : raw);
  return data.car;
}

export async function deleteUserCar(userId: number, carId: number): Promise<void> {
  await fetch(API.getBids, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete_car", user_id: userId, car_id: carId }),
  });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: "client" | "master";
  master_id: number | null;
  token: string;
}

const AUTH_KEY = "autotech_user_v1";

export function getStoredUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
}
export function storeUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}
export function clearUser() {
  localStorage.removeItem(AUTH_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Screen =
  | "home"
  | "new-request"
  | "history"
  | "chat"
  | "profile"
  | "notifications"
  | "reviews"
  | "analytics"
  | "master-requests"
  | "privacy"
  | "all-masters";

export interface Master {
  id: number;
  name: string;
  station: string;
  rating: number;
  reviews: number;
  specialty: string;
  online: boolean;
  avatar: string;
  completedOrders: number;
}

export interface ApiMaster {
  id: number;
  name: string;
  station: string;
  specialty: string;
  rating: number;
  reviews_count: number;
  completed_orders: number;
  online: boolean;
  avatar: string;
  address?: string | null;
  phone?: string | null;
}

export interface Bid {
  bid_id: number;
  price: number;
  comment: string;
  status: string;
  created_at: string;
  master: ApiMaster;
}

export interface Order {
  id: string;
  service: string;
  master: string;
  station: string;
  date: string;
  status: "new" | "progress" | "done" | "cancelled";
  price: string;
  car: string;
}

export interface Notification {
  id: number;
  title: string;
  text: string;
  time: string;
  read: boolean;
  type: "status" | "message" | "promo" | "review";
}

export interface Review {
  id: number;
  master: string;
  station: string;
  rating: number;
  text: string;
  date: string;
  service: string;
  avatar: string;
}

export interface UserCar {
  id: number;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  created_at?: string;
}

export interface ApiNotif {
  id: number;
  type: string;
  title: string;
  text: string;
  request_id: number | null;
  is_read: boolean;
  created_at: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const masters: Master[] = [
  { id: 1, name: "Алексей Коваль", station: "AutoPro Сервис", rating: 4.9, reviews: 312, specialty: "Двигатели", online: true, avatar: "AK", completedOrders: 847 },
  { id: 2, name: "Дмитрий Синицын", station: "TechDrive", rating: 4.8, reviews: 215, specialty: "Электрика", online: true, avatar: "ДС", completedOrders: 634 },
  { id: 3, name: "Игорь Петров", station: "МастерТО", rating: 4.7, reviews: 189, specialty: "Ходовая", online: false, avatar: "ИП", completedOrders: 512 },
  { id: 4, name: "Виктор Лазарев", station: "AutoPro Сервис", rating: 4.8, reviews: 278, specialty: "Кузов", online: true, avatar: "ВЛ", completedOrders: 703 },
];

export const orders: Order[] = [
  { id: "ORD-2847", service: "Замена масла и фильтров", master: "Алексей Коваль", station: "AutoPro Сервис", date: "28 мая 2026", status: "done", price: "3 200 ₽", car: "Toyota Camry 2021" },
  { id: "ORD-2901", service: "Диагностика двигателя", master: "Дмитрий Синицын", station: "TechDrive", date: "30 мая 2026", status: "progress", price: "2 800 ₽", car: "BMW X5 2020" },
  { id: "ORD-2935", service: "Замена тормозных колодок", master: "Игорь Петров", station: "МастерТО", date: "31 мая 2026", status: "new", price: "4 500 ₽", car: "Toyota Camry 2021" },
  { id: "ORD-2760", service: "Замена аккумулятора", master: "Виктор Лазарев", station: "AutoPro Сервис", date: "15 мая 2026", status: "done", price: "6 800 ₽", car: "BMW X5 2020" },
  { id: "ORD-2703", service: "Шиномонтаж (4 колеса)", master: "Игорь Петров", station: "МастерТО", date: "10 мая 2026", status: "cancelled", price: "1 600 ₽", car: "Toyota Camry 2021" },
];

export const notifications: Notification[] = [
  { id: 1, title: "Заказ принят в работу", text: "Дмитрий Синицын начал диагностику вашего BMW X5", time: "5 мин назад", read: false, type: "status" },
  { id: 2, title: "Новое сообщение", text: "Алексей Коваль: «Масло заменено, готов отчёт»", time: "2 часа назад", read: false, type: "message" },
  { id: 3, title: "Заказ выполнен", text: "ORD-2847 успешно завершён. Стоимость: 3 200 ₽", time: "Вчера", read: true, type: "status" },
  { id: 4, title: "Оставьте отзыв", text: "Как прошло обслуживание у Алексея Коваля?", time: "Вчера", read: true, type: "review" },
  { id: 5, title: "Акция AutoPro Сервис", text: "Скидка 20% на ТО при записи до 5 июня", time: "2 дня назад", read: true, type: "promo" },
];

export const reviews: Review[] = [
  { id: 1, master: "Алексей Коваль", station: "AutoPro Сервис", rating: 5, text: "Профессионал высшего уровня! Всё чётко, быстро и по делу. Двигатель работает как новый.", date: "28 мая 2026", service: "Замена масла", avatar: "AK" },
  { id: 2, master: "Дмитрий Синицын", station: "TechDrive", rating: 5, text: "Нашёл проблему в электрике за 20 минут, которую другие 3 сервиса не могли найти месяц. Рекомендую!", date: "22 мая 2026", service: "Диагностика", avatar: "ДС" },
  { id: 3, master: "Игорь Петров", station: "МастерТО", rating: 4, text: "Хорошая работа по ходовой. Небольшая задержка, но качество на высоте.", date: "18 мая 2026", service: "Ходовая", avatar: "ИП" },
];

export const chatMessages = [
  { id: 1, mine: false, text: "Добрый день! Ваш автомобиль принят. Начинаем диагностику двигателя.", time: "10:32" },
  { id: 2, mine: true, text: "Отлично, спасибо! Сколько примерно займёт?", time: "10:35" },
  { id: 3, mine: false, text: "Около 2 часов. По завершении пришлю полный отчёт с фото.", time: "10:36" },
  { id: 4, mine: false, text: "Предварительно нашли небольшую утечку масла. Устранить прямо сейчас?", time: "11:15" },
  { id: 5, mine: true, text: "Да, пожалуйста, устраните всё сразу.", time: "11:18" },
  { id: 6, mine: false, text: "Принято! Добавлю к чеку. Итоговая сумма будет около 4 200 ₽.", time: "11:19" },
];

export const services = [
  "Замена масла и фильтров",
  "Диагностика двигателя",
  "Тормозная система",
  "Ходовая часть",
  "Электрика",
  "Кузовные работы",
  "Шиномонтаж",
  "Кондиционер",
  "Трансмиссия",
  "Русификация",
  "Другое",
];

export const CAR_LIST = [
  "Toyota Camry","Toyota Corolla","Toyota RAV4","Toyota Land Cruiser","Toyota Land Cruiser 200",
  "Toyota Highlander","Toyota Prado","Toyota Prius","Toyota Yaris",
  "Kia Rio","Kia Sportage","Kia Sorento","Kia Ceed","Kia K5","Kia Stinger",
  "Hyundai Solaris","Hyundai Tucson","Hyundai Santa Fe","Hyundai Creta","Hyundai Elantra",
  "BMW 3 Series","BMW 5 Series","BMW 7 Series","BMW X3","BMW X5","BMW X6","BMW X7",
  "Mercedes-Benz A-Class","Mercedes-Benz C-Class","Mercedes-Benz E-Class","Mercedes-Benz S-Class",
  "Mercedes-Benz GLA","Mercedes-Benz GLC","Mercedes-Benz GLE","Mercedes-Benz GLS",
  "Audi A3","Audi A4","Audi A6","Audi A8","Audi Q3","Audi Q5","Audi Q7","Audi Q8",
  "Volkswagen Polo","Volkswagen Jetta","Volkswagen Passat","Volkswagen Tiguan","Volkswagen Touareg",
  "Lada Vesta","Lada Granta","Lada XRAY","Lada Niva Legend","Lada Niva Travel",
  "Nissan Almera","Nissan Juke","Nissan Qashqai","Nissan X-Trail","Nissan Murano","Nissan Patrol",
  "Mazda 3","Mazda 6","Mazda CX-30","Mazda CX-5","Mazda CX-9",
  "Honda Civic","Honda Accord","Honda CR-V","Honda HR-V",
  "Mitsubishi ASX","Mitsubishi Eclipse Cross","Mitsubishi Outlander","Mitsubishi Pajero Sport",
  "Subaru Impreza","Subaru XV","Subaru Forester","Subaru Outback","Subaru Legacy",
  "Ford Focus","Ford Kuga","Ford Explorer","Ford Mustang","Ford Ranger",
  "Chevrolet Cruze","Chevrolet Captiva","Chevrolet Equinox","Chevrolet Tahoe",
  "Renault Logan","Renault Duster","Renault Arkana","Renault Kaptur",
  "Skoda Octavia","Skoda Superb","Skoda Karoq","Skoda Kodiaq","Skoda Rapid",
  "Volvo S60","Volvo V60","Volvo XC40","Volvo XC60","Volvo XC90",
  "Porsche Macan","Porsche Cayenne","Porsche Panamera","Porsche 911",
  "Lexus ES","Lexus NX","Lexus RX","Lexus LX","Lexus IS",
  "Infiniti Q50","Infiniti QX50","Infiniti QX60","Infiniti FX35",
  "Jeep Compass","Jeep Wrangler","Jeep Grand Cherokee","Jeep Renegade",
  "Land Rover Defender","Land Rover Discovery","Range Rover","Range Rover Sport","Range Rover Evoque",
  "Chery Tiggo 7 Pro","Chery Tiggo 8 Pro","Chery Arrizo 8",
  "Geely Coolray","Geely Atlas Pro","Geely Monjaro",
  "Haval F7","Haval Jolion","Haval H9",
];

export const CAR_COLORS = ["Белый","Чёрный","Серый","Серебристый","Красный","Синий","Зелёный","Бежевый","Коричневый","Жёлтый","Оранжевый","Другой"];

export const userCarsKey = "user_cars_v1";
export function loadUserCars(): UserCar[] {
  try { return JSON.parse(localStorage.getItem(userCarsKey) || "[]"); } catch { return []; }
}
export function saveUserCars(cars: UserCar[]) {
  localStorage.setItem(userCarsKey, JSON.stringify(cars));
}

export function formatNotifTime(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} дн назад`;
  } catch { return ""; }
}



// ─── Nav & Screen config ──────────────────────────────────────────────────────

export const navItems = [
  { id: "home",        icon: "Home",       label: "Главная" },
  { id: "history",     icon: "Clock",      label: "История" },
  { id: "new-request", icon: "Plus",       label: "" },
  { id: "chat",        icon: "MessageCircle", label: "Чат" },
  { id: "profile",     icon: "User",       label: "Профиль" },
];

export const screenTitles: Record<Screen, string> = {
  home: "AutoTech",
  "new-request": "Новый запрос",
  history: "История заказов",
  chat: "Чат с мастером",
  profile: "Профиль",
  notifications: "Уведомления",
  reviews: "Отзывы",
  analytics: "Аналитика",
  "master-requests": "Заявки",
};

export const masterNavItems = [
  { id: "master-requests", icon: "Inbox",            label: "Заявки" },
  { id: "chat",            icon: "MessageCircle",    label: "Чат" },
  { id: "analytics",       icon: "BarChart2",        label: "Статистика" },
  { id: "notifications",   icon: "Bell",             label: "Уведомления" },
  { id: "profile",         icon: "User",             label: "Профиль" },
];