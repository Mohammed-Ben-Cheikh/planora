import Cookies from "js-cookie";
import type {
  AdminStats,
  AuthResponse,
  CreateEventDto,
  Event,
  LoginCredentials,
  PaginatedResponse,
  RegisterCredentials,
  Reservation,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

class ApiClient {
  private getToken(): string | undefined {
    if (typeof window !== "undefined") {
      return Cookies.get("accessToken");
    }
    return undefined;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useAuth = false,
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (useAuth) {
      const token = this.getToken();
      if (token) {
        (headers as Record<string, string>)["Authorization"] =
          `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Une erreur est survenue" }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==================== Auth ====================

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    // Stocker le token
    Cookies.set("accessToken", response.accessToken, { expires: 1 });

    return response;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    // Stocker le token
    Cookies.set("accessToken", response.accessToken, { expires: 1 });

    return response;
  }

  async getProfile(): Promise<{
    id: string;
    email: string;
    username: string;
    role: string;
  }> {
    return this.request("/auth/profile", {}, true);
  }

  async upgradeToAdmin(): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      "/auth/upgrade-to-admin",
      {
        method: "PATCH",
      },
      true,
    );
  }

  logout(): void {
    Cookies.remove("accessToken");
  }

  // ==================== Events (Public) ====================

  async getPublicEvents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<PaginatedResponse<Event>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Event>>(
      `/events/public${query ? `?${query}` : ""}`,
    );
  }

  async getUpcomingEvents(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Event>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Event>>(
      `/events/upcoming${query ? `?${query}` : ""}`,
    );
  }

  async getPublicEventById(id: string): Promise<Event> {
    return this.request<Event>(`/events/public/${id}`);
  }

  // ==================== Reservations ====================

  async createReservation(
    eventId: string,
    numberOfTickets = 1,
  ): Promise<Reservation> {
    return this.request<Reservation>(
      "/reservations",
      {
        method: "POST",
        body: JSON.stringify({ eventId, numberOfTickets }),
      },
      true,
    );
  }

  async getMyReservations(): Promise<Reservation[]> {
    const response = await this.request<{ reservations: Reservation[] }>(
      "/reservations/my",
      {},
      true,
    );
    return response.reservations || [];
  }

  async cancelReservation(id: string, reason?: string): Promise<Reservation> {
    return this.request<Reservation>(
      `/reservations/my/${id}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      },
      true,
    );
  }

  async downloadTicket(id: string): Promise<Blob> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/reservations/my/${id}/ticket`, {
      headers,
    });

    if (!response.ok) {
      throw new Error("Erreur lors du téléchargement du ticket");
    }

    return response.blob();
  }

  getTicketDownloadUrl(id: string): string {
    return `${API_URL}/reservations/my/${id}/ticket`;
  }

  // ==================== Admin Events ====================

  async getAdminEvents(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Event>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Event>>(
      `/events${query ? `?${query}` : ""}`,
      {},
      true,
    );
  }

  async getAdminEventById(id: string): Promise<Event> {
    return this.request<Event>(`/events/${id}`, {}, true);
  }

  async createEvent(data: CreateEventDto): Promise<Event> {
    return this.request<Event>(
      "/events",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true,
    );
  }

  async updateEvent(id: string, data: Partial<CreateEventDto>): Promise<Event> {
    return this.request<Event>(
      `/events/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      true,
    );
  }

  async deleteEvent(id: string): Promise<void> {
    return this.request<void>(
      `/events/${id}`,
      {
        method: "DELETE",
      },
      true,
    );
  }

  async publishEvent(id: string): Promise<Event> {
    return this.request<Event>(
      `/events/${id}/publish`,
      {
        method: "PATCH",
      },
      true,
    );
  }

  async cancelEvent(id: string): Promise<Event> {
    return this.request<Event>(
      `/events/${id}/cancel`,
      {
        method: "PATCH",
      },
      true,
    );
  }

  // ==================== Admin Reservations ====================

  async getAdminReservations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    eventId?: string;
  }): Promise<PaginatedResponse<Reservation>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.eventId) searchParams.set("eventId", params.eventId);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Reservation>>(
      `/reservations${query ? `?${query}` : ""}`,
      {},
      true,
    );
  }

  async checkInReservation(id: string): Promise<Reservation> {
    return this.request<Reservation>(
      `/reservations/${id}/check-in`,
      {
        method: "PATCH",
      },
      true,
    );
  }

  async markNoShow(id: string): Promise<Reservation> {
    return this.request<Reservation>(
      `/reservations/${id}/no-show`,
      {
        method: "PATCH",
      },
      true,
    );
  }

  async verifyQrCode(qrCode: string): Promise<{
    valid: boolean;
    reservation?: Reservation;
    message: string;
  }> {
    return this.request<{
      valid: boolean;
      reservation?: Reservation;
      message: string;
    }>(
      "/reservations/verify-qr",
      {
        method: "POST",
        body: JSON.stringify({ qrCode }),
      },
      true,
    );
  }

  async adminCancelReservation(
    id: string,
    reason?: string,
  ): Promise<Reservation> {
    return this.request<Reservation>(
      `/reservations/${id}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      },
      true,
    );
  }

  // ==================== Admin Stats ====================

  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/stats", {}, true);
  }

  // Admin users endpoints were removed from the UI; do not expose them here.
  // If you need to re-enable programmatic user management, re-add the methods above.

  // ==================== My Events (Participant as Organizer) ====================

  async getMyEvents(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Event>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Event>>(
      `/events/my/organized${query ? `?${query}` : ""}`,
      {},
      true,
    );
  }

  async getMyEventById(id: string): Promise<Event> {
    return this.request<Event>(`/events/my/${id}`, {}, true);
  }

  async createMyEvent(data: CreateEventDto): Promise<Event> {
    return this.request<Event>(
      "/events/my",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true,
    );
  }

  async updateMyEvent(
    id: string,
    data: Partial<CreateEventDto>,
  ): Promise<Event> {
    return this.request<Event>(
      `/events/my/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      true,
    );
  }

  async deleteMyEvent(id: string): Promise<void> {
    return this.request<void>(
      `/events/my/${id}`,
      {
        method: "DELETE",
      },
      true,
    );
  }

  async publishMyEvent(id: string): Promise<Event> {
    return this.request<Event>(
      `/events/my/${id}/publish`,
      {
        method: "PATCH",
      },
      true,
    );
  }

  async cancelMyEvent(id: string): Promise<Event> {
    return this.request<Event>(
      `/events/my/${id}/cancel`,
      {
        method: "PATCH",
      },
      true,
    );
  }
}

export const api = new ApiClient();
