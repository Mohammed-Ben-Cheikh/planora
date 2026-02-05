import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Event } from "@/lib/types";
import {
  formatDate,
  formatPrice,
  getAvailableSpots,
  isEventFull,
} from "@/lib/utils";
import { Calendar, Euro, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const availableSpots = getAvailableSpots(
    event.capacity,
    event.registeredCount,
  );
  const isFull = isEventFull(event.capacity, event.registeredCount);

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-linear-to-br from-blue-500 to-purple-600">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            fill
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-16 w-16 text-white/50" />
          </div>
        )}
        {event.category && (
          <Badge className="absolute top-3 left-3" variant="info">
            {event.category}
          </Badge>
        )}
        {isFull && (
          <Badge className="absolute top-3 right-3" variant="danger">
            Complet
          </Badge>
        )}
      </div>

      <CardContent className="flex-1 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {availableSpots} place{availableSpots > 1 ? "s" : ""} disponible
              {availableSpots > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
          {event.price > 0 ? (
            <>
              <Euro className="h-4 w-4" />
              {formatPrice(event.price).replace("€", "")}
            </>
          ) : (
            <span className="text-green-600">Gratuit</span>
          )}
        </div>
        <Link href={`/events/${event._id}`}>
          <Button size="sm" disabled={isFull}>
            {isFull ? "Complet" : "Voir détails"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
