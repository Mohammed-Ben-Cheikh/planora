import { PartialType } from '@nestjs/mapped-types';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';

export class CreateUserDto extends PartialType(RegisterAuthDto) {}
