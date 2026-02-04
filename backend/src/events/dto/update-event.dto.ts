import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { EventStatus } from '../../common/enums/event-status.enum';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsOptional()
  @IsEnum(EventStatus, {
    message: 'Le statut doit être draft, published ou canceled',
  })
  status?: EventStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  registeredCount?: number;
}
