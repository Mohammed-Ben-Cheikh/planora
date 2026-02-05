"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Reservation } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Filter,
  Loader2,
  Search,
  Ticket,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadReservations = async () => {
    try {
      setIsLoading(true);
      const response = await api.getAdminReservations({
        status: statusFilter || undefined,
        limit: 50,
      });
      setReservations(response.reservations || []);
    } catch (err) {
      console.error("Error loading reservations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    setActionLoading(id);
    try {
      await api.checkInReservation(id);
      await loadReservations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async (id: string) => {
    if (!confirm("Marquer cette réservation comme non présenté ?")) return;
    setActionLoading(id);
    try {
      await api.markNoShow(id);
      await loadReservations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt("Raison de l'annulation (optionnel):");
    if (reason === null) return;
    setActionLoading(id);
    try {
      await api.adminCancelReservation(id, reason);
      await loadReservations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "success" | "warning" | "danger" | "info" | "default"
    > = {
      confirmed: "success",
      pending: "warning",
      canceled: "danger",
      checked_in: "info",
      no_show: "danger",
      refunded: "default",
    };
    const labels: Record<string, string> = {
      confirmed: "Confirmée",
      pending: "En attente",
      canceled: "Annulée",
      checked_in: "Enregistrée",
      no_show: "Non présenté",
      refunded: "Remboursée",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filteredReservations = reservations.filter(
    (r) =>
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      r.reservationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.event?.title?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
        <p className="text-gray-600">Gérez toutes les réservations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, numéro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmées</option>
                <option value="checked_in">Enregistrées</option>
                <option value="canceled">Annulées</option>
                <option value="no_show">Non présentés</option>
                <option value="refunded">Remboursées</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {reservations.filter((r) => r.status === "confirmed").length}
            </p>
            <p className="text-sm text-gray-500">Confirmées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {reservations.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-sm text-gray-500">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {reservations.filter((r) => r.status === "checked_in").length}
            </p>
            <p className="text-sm text-gray-500">Enregistrées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {reservations.filter((r) => r.status === "no_show").length}
            </p>
            <p className="text-sm text-gray-500">Non présentés</p>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune réservation
            </h3>
            <p className="text-gray-500">
              Aucune réservation ne correspond à vos critères.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation._id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Reservation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(reservation.status)}
                      <span className="text-sm text-gray-500 font-mono">
                        #{reservation.reservationNumber}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {reservation.event?.title || "Événement supprimé"}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {reservation.userName} ({reservation.userEmail})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {reservation.event?.startDate
                          ? formatDateTime(reservation.event.startDate)
                          : "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Ticket className="h-4 w-4" />
                        {reservation.numberOfTickets} ticket(s) •{" "}
                        {formatPrice(reservation.totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {(reservation.status === "confirmed" ||
                      reservation.status === "pending") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckIn(reservation._id)}
                          disabled={actionLoading === reservation._id}
                          isLoading={actionLoading === reservation._id}
                          className="text-green-600 hover:text-green-700 hover:border-green-300"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Check-in
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNoShow(reservation._id)}
                          disabled={actionLoading === reservation._id}
                          className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          No-show
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(reservation._id)}
                          disabled={actionLoading === reservation._id}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Annuler
                        </Button>
                      </>
                    )}
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
