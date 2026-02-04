import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { PdfService } from './services/pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation]), EventsModule, AuthModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, PdfService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
