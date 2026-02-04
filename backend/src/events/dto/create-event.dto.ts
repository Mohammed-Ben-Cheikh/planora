import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { EventStatus } from '../../common/enums/event-status.enum';

export class CreateEventDto {
  @IsNotEmpty({ message: 'Le titre est requis' })
  @IsString()
  @MinLength(3, { message: 'Le titre doit contenir au moins 3 caractères' })
  title: string;

  @IsNotEmpty({ message: 'La description est requise' })
  @IsString()
  @MinLength(10, {
    message: 'La description doit contenir au moins 10 caractères',
  })
  description: string;

  @IsNotEmpty({ message: 'Le lieu est requis' })
  @IsString()
  location: string;

  @IsNotEmpty({ message: 'La date de début est requise' })
  @IsDateString({}, { message: 'La date de début doit être une date valide' })
  startDate: string;

  @IsNotEmpty({ message: 'La date de fin est requise' })
  @IsDateString({}, { message: 'La date de fin doit être une date valide' })
  endDate: string;

  @IsNotEmpty({ message: 'La capacité est requise' })
  @IsNumber({}, { message: 'La capacité doit être un nombre' })
  @IsPositive({ message: 'La capacité doit être positive' })
  @Min(1, { message: 'La capacité minimale est de 1' })
  capacity: number;

  @IsOptional()
  @IsUrl({}, { message: "L'URL de l'image doit être valide" })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  price?: number;

  @IsOptional()
  @IsEnum(EventStatus, {
    message: 'Le statut doit être draft, published ou canceled',
  })
  status?: EventStatus;
}
