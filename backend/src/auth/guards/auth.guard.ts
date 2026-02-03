import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }
  
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const token = request.headers.authorization?.split(' ').at(-1);

    if (!token) throw new UnauthorizedException();
    console.log(process.env.JWT_SECRET);
    const payload = await this.jwtService.verifyAsync(token);

    console.log(payload);
    return true;
  }
}
