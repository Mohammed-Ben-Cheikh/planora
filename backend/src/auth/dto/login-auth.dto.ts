import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginAuthDto {
  @IsNotEmpty({ message: "L'email est requis" })
  @IsEmail({}, { message: "L'email doit être valide" })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  password: string;
}
