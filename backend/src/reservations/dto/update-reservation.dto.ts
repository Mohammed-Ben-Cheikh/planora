import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

export class UpdateReservationDto {
  @IsOptional()
  @IsEnum(ReservationStatus, {
    message: 'Le statut doit être valide',
  })
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
