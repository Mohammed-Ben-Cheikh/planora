// Types pour l'API
export interface User {
  id: string;
  email: string;
  username: string;
  role: "admin" | "participant";
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
  role?: "admin" | "participant";
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  capacity: number;
  registeredCount: number;
  status: "draft" | "published" | "canceled";
  imageUrl?: string;
  category?: string;
  price: number;
  organizerId: string;
  organizerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  events?: T[];
  reservations?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Reservation {
  _id: string;
  reservationNumber: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  event: {
    _id: string;
    title: string;
    startDate: string;
    location: string;
  };
  userId: string;
  userEmail: string;
  userName: string;
  numberOfTickets: number;
  totalPrice: number;
  status:
    | "pending"
    | "confirmed"
    | "canceled"
    | "checked_in"
    | "no_show"
    | "refunded";
  qrCode?: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface CreateEventDto {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  capacity: number;
  price: number;
  category?: string;
  imageUrl?: string;
}

export interface AdminStats {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  canceledEvents: number;
  totalReservations: number;
  confirmedReservations: number;
  pendingReservations: number;
  totalRevenue: number;
  totalParticipants: number;
  recentReservations: Reservation[];
  upcomingEvents: Event[];
}

// Types pour la gestion des utilisateurs (Admin)
export interface UserWithDetails extends User {
  _id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: "admin" | "participant";
  isActive?: boolean;
  password?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: "admin" | "participant";
}
