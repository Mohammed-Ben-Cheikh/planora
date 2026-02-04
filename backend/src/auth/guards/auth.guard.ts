import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { config } from '../../config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Token d'authentification manquant");
    }

    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret: config.JWT_SECRET,
      });

      // Optionnel: recharger l'utilisateur depuis la base pour garantir que
      // le rôle et l'état sont à jour (utile après un upgrade de rôle).
      const dbUser = await this.usersService.findById(payload.sub);

      request['user'] = {
        userId: payload.sub,
        email: payload.email,
        role: dbUser?.role ?? payload.role,
      };
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Garder l'ancien nom pour la compatibilité
export { JwtAuthGuard as AuthGuard };
