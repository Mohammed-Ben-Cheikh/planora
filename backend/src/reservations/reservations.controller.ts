import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CancelReservationDto,
  CreateReservationDto,
  QueryReservationDto,
} from './dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ==================== Routes Participant ====================

  /**
   * Créer une nouvelle réservation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
  ) {
    // Le nom d'utilisateur serait normalement récupéré depuis le profil
    return this.reservationsService.create(
      createReservationDto,
      userId,
      email,
      email.split('@')[0], // Nom temporaire basé sur l'email
    );
  }

  /**
   * Mes réservations
   */
  @Get('my')
  findMyReservations(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryReservationDto,
  ) {
    return this.reservationsService.findByUser(userId, query);
  }

  /**
   * Détail d'une de mes réservations
   */
  @Get('my/:id')
  async findMyReservation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const reservation = await this.reservationsService.findById(id);
    if (reservation.userId !== userId) {
      throw new Error('Réservation non trouvée');
    }
    return reservation;
  }

  /**
   * Annuler ma réservation
   */
  @Patch('my/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelMyReservation(
    @Param('id') id: string,
    @Body() cancelDto: CancelReservationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.cancel(id, cancelDto, userId, false);
  }

  /**
   * Télécharger mon ticket PDF
   */
  @Get('my/:id/ticket')
  async downloadMyTicket(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reservationsService.generateTicketPdf(
      id,
      userId,
      false,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  // ==================== Routes Admin ====================

  /**
   * Liste de toutes les réservations (Admin - ses propres événements)
   */
  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @Query() query: QueryReservationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.findByOrganizer(userId, query);
  }

  /**
   * Statistiques des réservations (Admin - ses propres événements)
   */
  @Get('statistics')
  @Roles(Role.ADMIN)
  getStatistics(@CurrentUser('userId') userId: string) {
    return this.reservationsService.getStatisticsByOrganizer(userId);
  }

  /**
   * Réservations par événement (Admin)
   */
  @Get('event/:eventId')
  @Roles(Role.ADMIN)
  findByEvent(
    @Param('eventId') eventId: string,
    @Query() query: QueryReservationDto,
  ) {
    return this.reservationsService.findByEvent(eventId, query);
  }

  /**
   * Détail d'une réservation (Admin)
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.reservationsService.findById(id);
  }

  /**
   * Chercher par numéro de réservation (Admin)
   */
  @Get('number/:reservationNumber')
  @Roles(Role.ADMIN)
  findByNumber(@Param('reservationNumber') reservationNumber: string) {
    return this.reservationsService.findByReservationNumber(reservationNumber);
  }

  /**
   * Confirmer une réservation (Admin)
   */
  @Patch(':id/confirm')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string) {
    return this.reservationsService.confirm(id);
  }

  /**
   * Annuler une réservation (Admin)
   */
  @Patch(':id/cancel')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Body() cancelDto: CancelReservationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.cancel(id, cancelDto, userId, true);
  }

  /**
   * Check-in d'une réservation (Admin)
   */
  @Patch(':id/check-in')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  checkIn(@Param('id') id: string) {
    return this.reservationsService.checkIn(id);
  }

  /**
   * Marquer comme no-show (Admin)
   */
  @Patch(':id/no-show')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  markNoShow(@Param('id') id: string) {
    return this.reservationsService.markNoShow(id);
  }

  /**
   * Rembourser une réservation (Admin)
   */
  @Patch(':id/refund')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  refund(@Param('id') id: string) {
    return this.reservationsService.refund(id);
  }

  /**
   * Télécharger le ticket PDF (Admin)
   */
  @Get(':id/ticket')
  @Roles(Role.ADMIN)
  async downloadTicket(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reservationsService.generateTicketPdf(
      id,
      userId,
      true,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  /**
   * Vérifier un ticket par QR code (Admin - pour le check-in)
   */
  @Post('verify-qr')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  verifyQrCode(@Body('qrCode') qrCode: string) {
    return this.reservationsService.verifyByQrCode(qrCode);
  }
}
