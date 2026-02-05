"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { AdminStats } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Euro,
  Loader2,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      // Fallback with mock data for demo
      setStats({
        totalEvents: 0,
        publishedEvents: 0,
        draftEvents: 0,
        canceledEvents: 0,
        totalReservations: 0,
        confirmedReservations: 0,
        pendingReservations: 0,
        totalRevenue: 0,
        totalParticipants: 0,
        recentReservations: [],
        upcomingEvents: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total événements",
      value: stats?.totalEvents || 0,
      icon: Calendar,
      color: "bg-blue-500",
      details: `${stats?.publishedEvents || 0} publiés, ${stats?.draftEvents || 0} brouillons`,
    },
    {
      title: "Réservations",
      value: stats?.totalReservations || 0,
      icon: Ticket,
      color: "bg-green-500",
      details: `${stats?.confirmedReservations || 0} confirmées`,
    },
    {
      title: "Revenus totaux",
      value: formatPrice(stats?.totalRevenue || 0),
      icon: Euro,
      color: "bg-purple-500",
      details: "Tous les paiements confirmés",
    },
    {
      title: "Participants",
      value: stats?.totalParticipants || 0,
      icon: Users,
      color: "bg-orange-500",
      details: "Utilisateurs inscrits",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Vue d&apos;ensemble de votre plateforme</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-700 text-sm">
            Impossible de charger les statistiques. Affichage des données par
            défaut.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stat.details}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Dernières réservations</CardTitle>
            <Link
              href="/admin/reservations"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentReservations &&
            stats.recentReservations.length > 0 ? (
              <div className="space-y-4">
                {stats.recentReservations.slice(0, 5).map((reservation) => (
                  <div
                    key={reservation._id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {reservation.event?.title || "Événement"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {reservation.userName} • {reservation.numberOfTickets}{" "}
                        ticket(s)
                      </p>
                    </div>
                    <Badge
                      variant={
                        reservation.status === "confirmed"
                          ? "success"
                          : reservation.status === "pending"
                            ? "warning"
                            : "default"
                      }
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune réservation récente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Événements à venir</CardTitle>
            <Link
              href="/admin/events"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event._id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(event.startDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {event.registeredCount}/{event.capacity}
                      </p>
                      <p className="text-xs text-gray-500">inscrits</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun événement à venir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/events/new"
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Nouvel événement</p>
                <p className="text-sm text-gray-500">Créer un événement</p>
              </div>
            </Link>
            <Link
              href="/admin/reservations"
              className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Ticket className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Réservations</p>
                <p className="text-sm text-gray-500">Gérer les réservations</p>
              </div>
            </Link>
            <Link
              href="/admin/events"
              className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Événements</p>
                <p className="text-sm text-gray-500">
                  Voir tous les événements
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
