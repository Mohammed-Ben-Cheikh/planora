import { EventList } from "@/components/events/event-list";
import type { Event, PaginatedResponse } from "@/lib/types";
import { Search } from "lucide-react";
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const metadata: Metadata = {
  title: "Tous les événements",
  description:
    "Découvrez tous les événements disponibles sur Planora. Concerts, conférences, ateliers et plus encore.",
};

interface EventsPageProps {
  searchParams: Promise<{ search?: string; category?: string; page?: string }>;
}

async function getPublicEvents(params: {
  search?: string;
  category?: string;
  page?: number;
}): Promise<PaginatedResponse<Event>> {
  try {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.category) searchParams.set("category", params.category);
    searchParams.set("limit", "12");

    const query = searchParams.toString();
    const response = await fetch(`${API_URL}/events/public?${query}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { events: [], total: 0, page: 1, limit: 12, totalPages: 0 };
    }

    return response.json();
  } catch {
    return { events: [], total: 0, page: 1, limit: 12, totalPages: 0 };
  }
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const { events, total, totalPages } = await getPublicEvents({
    search: params.search,
    category: params.category,
    page,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tous les événements
        </h1>
        <p className="text-gray-600">
          {total} événement{total > 1 ? "s" : ""} disponible
          {total > 1 ? "s" : ""}
        </p>
      </div>

      {/* Search Form */}
      <form className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Rechercher un événement..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Rechercher
          </button>
        </div>
      </form>

      {/* Events Grid */}
      <EventList events={events || []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/events?page=${p}${params.search ? `&search=${params.search}` : ""}${params.category ? `&category=${params.category}` : ""}`}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
