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

// ─── Specialties ──────────────────────────────────────────────────────────────

export const SPECIALTIES = ["ТО", "Двигатели", "Электрика", "Ходовая", "Кузов", "Шиномонтаж", "Русификация"];

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