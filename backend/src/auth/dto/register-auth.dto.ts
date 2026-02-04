import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import { LoginAuthDto } from './login-auth.dto';

export class RegisterAuthDto extends LoginAuthDto {
  @IsNotEmpty({ message: "Le nom d'utilisateur est requis" })
  @IsString({
    message: "Le nom d'utilisateur doit être une chaîne de caractères",
  })
  @Length(3, 30, {
    message: "Le nom d'utilisateur doit contenir entre 3 et 30 caractères",
  })
  username: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Le rôle doit être admin ou participant' })
  role?: Role;
}
