"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Reservation } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  Download,
  Loader2,
  MapPin,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

// Génère les données JSON pour le QR code
function generateQrCodeData(reservation: Reservation): string {
  const qrData = {
    id: reservation.reservationNumber,
    e: reservation.eventId,
    u: reservation.userId,
    t: reservation.numberOfTickets,
    s: reservation.status,
  };
  return JSON.stringify(qrData);
}

export default function MyReservationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/my-reservations");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadReservations();
    }
  }, [isAuthenticated]);

  const loadReservations = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMyReservations();
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
      return;
    }

    setCancellingId(reservationId);
    try {
      await api.cancelReservation(reservationId);
      await loadReservations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'annulation",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadTicket = async (reservationId: string) => {
    setDownloadingId(reservationId);
    try {
      const blob = await api.downloadTicket(reservationId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${reservationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du téléchargement",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ): "success" | "warning" | "danger" | "default" | "info" => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "canceled":
      case "no_show":
        return "danger";
      case "checked_in":
        return "info";
      case "refunded":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmée",
      canceled: "Annulée",
      checked_in: "Utilisée",
      no_show: "Non présenté",
      refunded: "Remboursée",
    };
    return labels[status] || status;
  };

  const canCancel = (reservation: Reservation): boolean => {
    if (
      reservation.status === "canceled" ||
      reservation.status === "checked_in"
    ) {
      return false;
    }
    const eventDate = new Date(reservation.event.startDate);
    const now = new Date();
    const hoursUntilEvent =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEvent >= 24;
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Mes réservations
      </h1>
      <p className="text-gray-600 mb-8">
        Gérez vos réservations et téléchargez vos tickets
      </p>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-sm underline mt-1"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune réservation
            </h3>
            <p className="text-gray-500 mb-6">
              Vous n'avez pas encore réservé d'événement.
            </p>
            <Link href="/events">
              <Button>Découvrir les événements</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservations
            .filter((reservation) => reservation.event)
            .map((reservation) => (
              <Card key={reservation._id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Event Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={getStatusBadgeVariant(reservation.status)}
                        >
                          {getStatusLabel(reservation.status)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          #{reservation.reservationNumber}
                        </span>
                      </div>

                      <Link
                        href={`/events/${reservation.event._id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {reservation.event.title}
                      </Link>

                      <div className="mt-3 space-y-2 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDateTime(reservation.event.startDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{reservation.event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          <span>
                            {reservation.numberOfTickets} ticket
                            {reservation.numberOfTickets > 1 ? "s" : ""} •{" "}
                            {formatPrice(reservation.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code réel */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center border-2 border-gray-200 p-2">
                        <QRCodeSVG
                          value={generateQrCodeData(reservation)}
                          size={112}
                          level="H"
                          includeMargin={false}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        Scannez pour vérifier
                      </span>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {(reservation.status === "confirmed" ||
                          reservation.status === "pending") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownloadTicket(reservation._id)
                            }
                            disabled={downloadingId === reservation._id}
                            isLoading={downloadingId === reservation._id}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Ticket
                          </Button>
                        )}

                        {canCancel(reservation) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(reservation._id)}
                            disabled={cancellingId === reservation._id}
                            isLoading={cancellingId === reservation._id}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Annuler
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
