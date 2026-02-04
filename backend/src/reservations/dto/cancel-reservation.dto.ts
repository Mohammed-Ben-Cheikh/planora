import { IsOptional, IsString } from 'class-validator';

export class CancelReservationDto {
  @IsOptional()
  @IsString({ message: 'La raison doit être une chaîne de caractères' })
  reason?: string;
}
