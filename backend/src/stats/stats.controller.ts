import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { EventStatus } from '../common/enums/event-status.enum';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { EventsService } from '../events/events.service';
import { ReservationsService } from '../reservations/reservations.service';
import { UsersService } from '../users/users.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly reservationsService: ReservationsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  async getStats(@CurrentUser('userId') userId: string) {
    const [eventsStats, reservationsStats] = await Promise.all([
      this.eventsService.getStatisticsByOrganizer(userId),
      this.reservationsService.getStatisticsByOrganizer(userId),
    ]);

    const recent = await this.reservationsService.findByOrganizer(userId, {
      page: 1,
      limit: 5,
    });
    const upcoming = await this.eventsService.findUpcomingByOrganizer(userId, {
      page: 1,
      limit: 5,
    });

    return {
      totalEvents: eventsStats.total,
      publishedEvents: eventsStats.byStatus[EventStatus.PUBLISHED] || 0,
      draftEvents: eventsStats.byStatus[EventStatus.DRAFT] || 0,
      canceledEvents: eventsStats.byStatus[EventStatus.CANCELED] || 0,
      totalReservations: reservationsStats.total,
      confirmedReservations:
        reservationsStats.byStatus[ReservationStatus.CONFIRMED] || 0,
      pendingReservations:
        reservationsStats.byStatus[ReservationStatus.PENDING] || 0,
      totalRevenue: reservationsStats.totalRevenue || 0,
      totalParticipants: reservationsStats.total || 0,
      recentReservations: recent.reservations || [],
      upcomingEvents: upcoming.events || [],
    };
  }
}
