import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { Event } from './events/entities/event.entity';
import { EventsModule } from './events/events.module';
import { Reservation } from './reservations/entities/reservation.entity';
import { ReservationsModule } from './reservations/reservations.module';
import { StatsController } from './stats/stats.controller';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: config.MONGODB_URI,
      entities: [User, Event, Reservation],
      synchronize: config.NODE_ENV === 'development', // Désactiver en production
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    ReservationsModule,
  ],
  controllers: [AppController, StatsController],
  providers: [
    AppService,
    // Guards globaux (optionnel - peut être activé pour protéger toute l'API par défaut)
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
  ],
})
export class AppModule {}
