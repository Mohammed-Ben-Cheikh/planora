"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Event } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  Calendar,
  Edit,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [statusFilter]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const response = await api.getAdminEvents({
        status: statusFilter || undefined,
        limit: 50,
      });
      setEvents(response.events || []);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm("Voulez-vous publier cet événement ?")) return;
    setActionLoading(id);
    try {
      await api.publishEvent(id);
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Voulez-vous annuler cet événement ?")) return;
    setActionLoading(id);
    try {
      await api.cancelEvent(id);
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
    setActionLoading(id);
    try {
      await api.deleteEvent(id);
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge variant="success">Publié</Badge>;
      case "draft":
        return <Badge variant="warning">Brouillon</Badge>;
      case "canceled":
        return <Badge variant="danger">Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Événements</h1>
          <p className="text-gray-600">Gérez vos événements</p>
        </div>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel événement
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un événement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillons</option>
              <option value="published">Publiés</option>
              <option value="canceled">Annulés</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun événement
            </h3>
            <p className="text-gray-500 mb-6">
              Commencez par créer votre premier événement.
            </p>
            <Link href="/admin/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer un événement
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card key={event._id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(event.status)}
                      {event.category && (
                        <Badge variant="info">{event.category}</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {event.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDateTime(event.startDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.registeredCount}/{event.capacity}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(event.price)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/events/${event._id}`} target="_blank">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </Link>
                    <Link href={`/admin/events/${event._id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    </Link>
                    {event.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublish(event._id)}
                        disabled={actionLoading === event._id}
                        isLoading={actionLoading === event._id}
                        className="text-green-600 hover:text-green-700 hover:border-green-300"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Publier
                      </Button>
                    )}
                    {event.status === "published" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(event._id)}
                        disabled={actionLoading === event._id}
                        isLoading={actionLoading === event._id}
                        className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Annuler
                      </Button>
                    )}
                    {event.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(event._id)}
                        disabled={actionLoading === event._id}
                        isLoading={actionLoading === event._id}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
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
