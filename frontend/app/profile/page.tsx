"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Reservation } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  Euro,
  Loader2,
  Mail,
  Shield,
  Sparkles,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    refreshUser,
  } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/profile");
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
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeToAdmin = async () => {
    try {
      setUpgrading(true);
      setUpgradeError(null);
      await api.upgradeToAdmin();
      await refreshUser();
    } catch (err) {
      setUpgradeError(
        err instanceof Error ? err.message : "Erreur lors de la mise à niveau",
      );
    } finally {
      setUpgrading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const confirmedReservations = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "pending",
  );
  const totalSpent = reservations
    .filter((r) => r.status !== "canceled" && r.status !== "refunded")
    .reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-4xl font-bold text-blue-600">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {user?.username}
              </h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mb-2">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Badge variant={user?.role === "admin" ? "info" : "default"}>
                <Shield className="h-3 w-3 mr-1" />
                {user?.role === "admin" ? "Administrateur" : "Participant"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Ticket className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {reservations.length}
            </p>
            <p className="text-sm text-gray-500">Réservations totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {confirmedReservations.length}
            </p>
            <p className="text-sm text-gray-500">À venir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Euro className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(totalSpent)}
            </p>
            <p className="text-sm text-gray-500">Dépensé</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Mes réservations récentes
          </CardTitle>
          <Link
            href="/my-reservations"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            Voir tout <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                Vous n&apos;avez pas encore de réservation
              </p>
              <Link href="/events">
                <Button>Découvrir les événements</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.slice(0, 5).map((reservation) => (
                <div
                  key={reservation._id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {reservation.event?.title || "Événement"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {reservation.event?.startDate
                        ? formatDateTime(reservation.event.startDate)
                        : "Date inconnue"}{" "}
                      • {reservation.numberOfTickets} ticket(s)
                    </p>
                  </div>
                  <Badge
                    variant={
                      reservation.status === "confirmed"
                        ? "success"
                        : reservation.status === "pending"
                          ? "warning"
                          : reservation.status === "checked_in"
                            ? "info"
                            : "danger"
                    }
                  >
                    {reservation.status === "confirmed"
                      ? "Confirmée"
                      : reservation.status === "pending"
                        ? "En attente"
                        : reservation.status === "checked_in"
                          ? "Utilisée"
                          : "Annulée"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Link */}
      {user?.role === "admin" && (
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Espace Administration
                  </p>
                  <p className="text-sm text-gray-600">
                    Gérez les événements et les réservations
                  </p>
                </div>
              </div>
              <Link href="/admin">
                <Button>
                  Accéder <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade to Admin */}
      {user?.role === "participant" && (
        <Card className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Devenir Organisateur
                  </p>
                  <p className="text-sm text-gray-600">
                    Créez et gérez vos propres événements sur Planora
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={handleUpgradeToAdmin}
                  disabled={upgrading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {upgrading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Devenir organisateur
                </Button>
                {upgradeError && (
                  <p className="text-sm text-red-600">{upgradeError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
