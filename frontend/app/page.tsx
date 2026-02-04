import { EventList } from "@/components/events/event-list";
import { Button } from "@/components/ui/button";
import type { Event, PaginatedResponse } from "@/lib/types";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

async function getUpcomingEvents(): Promise<Event[]> {
  try {
    const response = await fetch(`${API_URL}/events/upcoming?limit=6`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const data: PaginatedResponse<Event> = await response.json();
    return data.events || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const events = await getUpcomingEvents();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-slate-950 py-32 lg:py-40">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.1] mb-8">
            Réservez vos places
            <br />
            <span className="text-blue-400">en toute simplicité</span>
          </h1>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            La plateforme de réservation d&apos;événements la plus simple.
            Concerts, conférences, ateliers — réservez en quelques clics.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events">
              <Button
                size="lg"
                className="bg-blue-500 text-white hover:bg-blue-600 px-8"
              >
                Voir les événements
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:border-slate-500"
              >
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl font-semibold text-slate-900">
                Événements à venir
              </h2>
              <p className="text-slate-500 mt-2">
                Les événements les plus populaires
              </p>
            </div>
            <Link href="/events">
              <Button variant="outline" className="border-slate-300">
                Voir tout →
              </Button>
            </Link>
          </div>

          <EventList events={events} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Créez votre compte gratuitement et découvrez les événements près de
            chez vous.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 px-8"
            >
              Créer un compte gratuit
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
