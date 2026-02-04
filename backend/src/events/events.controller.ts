import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateEventDto, QueryEventDto, UpdateEventDto } from './dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==================== Routes publiques ====================

  /**
   * Catalogue public - Événements publiés uniquement
   */
  @Public()
  @Get('public')
  findPublished(@Query() query: QueryEventDto) {
    return this.eventsService.findPublished(query);
  }

  /**
   * Événements à venir (publiés et futurs)
   */
  @Public()
  @Get('upcoming')
  findUpcoming(@Query() query: QueryEventDto) {
    return this.eventsService.findUpcoming(query);
  }

  /**
   * Détail d'un événement publié
   */
  @Public()
  @Get('public/:id')
  findPublishedById(@Param('id') id: string) {
    return this.eventsService.findPublishedById(id);
  }

  // ==================== Routes admin ====================

  /**
   * Créer un nouvel événement (Admin uniquement)
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.eventsService.create(createEventDto, userId, email);
  }

  /**
   * Récupérer tous les événements avec filtres (Admin - ses propres événements)
   */
  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @Query() query: QueryEventDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.eventsService.findByOrganizer(userId, query);
  }

  /**
   * Statistiques des événements (Admin - ses propres événements)
   */
  @Get('statistics')
  @Roles(Role.ADMIN)
  getStatistics(@CurrentUser('userId') userId: string) {
    return this.eventsService.getStatisticsByOrganizer(userId);
  }

  /**
   * Récupérer un événement par ID (Admin uniquement)
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  /**
   * Mettre à jour un événement (Admin uniquement)
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.eventsService.update(
      id,
      updateEventDto,
      userId,
      role === Role.ADMIN,
    );
  }

  /**
   * Publier un événement (Admin uniquement)
   */
  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  publish(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.eventsService.publish(id, userId, role === Role.ADMIN);
  }

  /**
   * Annuler un événement (Admin uniquement)
   */
  @Patch(':id/cancel')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.eventsService.cancel(id, userId, role === Role.ADMIN);
  }

  /**
   * Supprimer un événement (Admin uniquement)
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.eventsService.remove(id, userId, role === Role.ADMIN);
  }

  // ==================== Routes pour les participants (organisateurs) ====================

  /**
   * Créer un événement (tout utilisateur authentifié)
   */
  @Post('my')
  @HttpCode(HttpStatus.CREATED)
  createMyEvent(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.eventsService.create(createEventDto, userId, email);
  }

  /**
   * Mes événements organisés (pour l'utilisateur connecté)
   */
  @Get('my/organized')
  findMyEvents(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryEventDto,
  ) {
    return this.eventsService.findByOrganizer(userId, query);
  }

  /**
   * Détail d'un de mes événements
   */
  @Get('my/:id')
  findMyEvent(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.eventsService.findByIdForOrganizer(id, userId);
  }

  /**
   * Mettre à jour un de mes événements
   */
  @Patch('my/:id')
  updateMyEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.eventsService.update(id, updateEventDto, userId, false);
  }

  /**
   * Publier un de mes événements
   */
  @Patch('my/:id/publish')
  @HttpCode(HttpStatus.OK)
  publishMyEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.eventsService.publish(id, userId, false);
  }

  /**
   * Annuler un de mes événements
   */
  @Patch('my/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelMyEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.eventsService.cancel(id, userId, false);
  }

  /**
   * Supprimer un de mes événements (brouillon uniquement)
   */
  @Delete('my/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMyEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.eventsService.remove(id, userId, false);
  }
}
