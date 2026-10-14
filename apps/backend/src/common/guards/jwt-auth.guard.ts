import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module.js';
import { users } from '../../db/schema.js';
import type { AuthedRequest } from '../auth-user.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();

    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(token));
    } catch {
      throw new UnauthorizedException();
    }

    // Har request par DB se status check: ban/suspend turant effect karta hai.
    const [user] = await this.db
      .select({ id: users.id, role: users.role, status: users.status, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, sub))
      .limit(1);

    if (!user || user.deletedAt || user.status !== 'active') {
      throw new UnauthorizedException();
    }

    req.user = { id: user.id, role: user.role };
    return true;
  }
}