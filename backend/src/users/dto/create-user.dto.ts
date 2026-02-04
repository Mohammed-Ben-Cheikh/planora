import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsNotEmpty({ message: "Le nom d'utilisateur est requis" })
  @IsString()
  username: string;

  @IsNotEmpty({ message: "L'email est requis" })
  @IsEmail({}, { message: "L'email doit être valide" })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
