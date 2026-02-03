import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersSer: UsersService) {}
  login(loginAuthDto: LoginAuthDto) {
    return 'holala';
  }

  register(registerAuthDto: RegisterAuthDto) {
    return this.usersSer.create(registerAuthDto);
  }
}
