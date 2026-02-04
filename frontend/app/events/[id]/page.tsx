import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Event } from "@/lib/types";
import {
  formatDateTime,
  formatPrice,
  getAvailableSpots,
  isEventFull,
} from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Euro,
  MapPin,
  User,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReservationButton } from "./reservation-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

async function getEvent(id: string): Promise<Event | null> {
  try {
    const response = await fetch(`${API_URL}/events/public/${id}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return { title: "Événement non trouvé" };
  }

  return {
    title: event.title,
    description: event.description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 160),
      type: "website",
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  const availableSpots = getAvailableSpots(
    event.capacity,
    event.registeredCount,
  );
  const isFull = isEventFull(event.capacity, event.registeredCount);

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const durationHours = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        href="/events"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux événements
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Image */}
          <div className="relative h-64 md:h-96 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl overflow-hidden mb-6">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="h-24 w-24 text-white/50" />
              </div>
            )}
            {event.category && (
              <Badge className="absolute top-4 left-4" variant="info">
                {event.category}
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {event.title}
          </h1>

          <div className="prose prose-gray max-w-none mb-8">
            <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>

          {/* Organizer */}
          {event.organizerName && (
            <Card className="mb-6">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Organisé par</p>
                  <p className="font-medium text-gray-900">
                    {event.organizerName}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              {/* Price */}
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900">
                  {event.price > 0 ? (
                    <span className="flex items-center justify-center gap-1">
                      <Euro className="h-6 w-6" />
                      {formatPrice(event.price).replace("€", "")}
                    </span>
                  ) : (
                    <span className="text-green-600">Gratuit</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">par personne</p>
              </div>

              {/* Status */}
              {isFull ? (
                <div className="bg-red-50 text-red-700 rounded-lg p-4 text-center mb-6">
                  <p className="font-medium">Événement complet</p>
                  <p className="text-sm mt-1">Plus de places disponibles</p>
                </div>
              ) : (
                <div className="bg-green-50 text-green-700 rounded-lg p-4 text-center mb-6">
                  <p className="font-medium">
                    {availableSpots} place{availableSpots > 1 ? "s" : ""}{" "}
                    disponible{availableSpots > 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Event Details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(event.startDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Durée: {durationHours}h
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {event.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {event.registeredCount} / {event.capacity} inscrits
                    </p>
                  </div>
                </div>
              </div>

              {/* Reservation Button */}
              <ReservationButton
                eventId={event._id}
                eventTitle={event.title}
                isFull={isFull}
                price={event.price}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
