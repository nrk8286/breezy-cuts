export type Role = "customer" | "barber" | "admin";
export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  category: string;
};

export type Barber = {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
  avatar: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type BookingView = {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  barberName: string;
  barberId: string;
};
