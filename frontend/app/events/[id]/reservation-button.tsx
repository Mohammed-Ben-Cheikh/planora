"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReservationButtonProps {
  eventId: string;
  eventTitle: string;
  isFull: boolean;
  price: number;
}

export function ReservationButton({
  eventId,
  isFull,
  price,
}: ReservationButtonProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [numberOfTickets, setNumberOfTickets] = useState(1);

  const handleReservation = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.createReservation(eventId, numberOfTickets);
      setSuccess(true);
      setTimeout(() => {
        router.push("/my-reservations");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-700 font-medium">Réservation confirmée !</p>
        <p className="text-green-600 text-sm mt-1">
          Redirection vers vos réservations...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Number of tickets */}
      {!isFull && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de tickets
          </label>
          <select
            value={numberOfTickets}
            onChange={(e) => setNumberOfTickets(parseInt(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none"
            disabled={isLoading}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} ticket{n > 1 ? "s" : ""} -{" "}
                {price > 0 ? formatPrice(price * n) : "Gratuit"}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={isFull || isLoading || authLoading}
        onClick={handleReservation}
        isLoading={isLoading}
      >
        {isFull
          ? "Complet"
          : isAuthenticated
            ? `Réserver pour ${price > 0 ? formatPrice(price * numberOfTickets) : "Gratuit"}`
            : "Se connecter pour réserver"}
      </Button>

      {!isAuthenticated && !authLoading && (
        <p className="text-center text-sm text-gray-500 mt-3">
          Vous devez être connecté pour réserver
        </p>
      )}
    </div>
  );
}
