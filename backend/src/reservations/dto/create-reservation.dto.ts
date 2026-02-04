import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsNotEmpty({ message: "L'ID de l'événement est requis" })
  @IsString()
  eventId: string;

  @IsOptional()
  @IsNumber({}, { message: 'Le nombre de tickets doit être un nombre' })
  @IsPositive({ message: 'Le nombre de tickets doit être positif' })
  @Min(1, { message: 'Minimum 1 ticket' })
  @Max(10, { message: 'Maximum 10 tickets par réservation' })
  numberOfTickets?: number = 1;
}
