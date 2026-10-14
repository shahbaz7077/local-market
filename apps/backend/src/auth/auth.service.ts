import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { refreshTokens, reservedPhoneIdentities, users } from '../db/schema.js';
import type { Role } from '../db/schema.js';
import { normalizePkPhone } from '../common/phone.js';
import { ACCESS_TTL_SECONDS, PHONE_UNAVAILABLE, REFRESH_TTL_DAYS } from './auth.constants.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

@Injectable()
export class AuthService {
  // Login mein user na mile tab bhi hash verify hota hai, taake timing se pata na chale.
  private readonly dummyHash = argon2.hash('dummy-password', { type: argon2.argon2id });

  constructor(
    private readonly jwt: JwtService,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
  ) {}

  async register(dto: RegisterDto) {
    const phone = normalizePkPhone(dto.phone);
    if (!phone) throw new BadRequestException('Enter a valid Pakistani mobile number');

    const [reserved] = await this.db
      .select({ id: reservedPhoneIdentities.id })
      .from(reservedPhoneIdentities)
      .where(eq(reservedPhoneIdentities.phoneNormalized, phone))
      .limit(1);
    if (reserved) throw new ConflictException(PHONE_UNAVAILABLE);

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    try {
      const [user] = await this.db
        .insert(users)
        .values({ name: dto.name, phoneNormalized: phone, passwordHash })
        .returning({
          id: users.id,
          name: users.name,
          phone: users.phoneNormalized,
          role: users.role,
          status: users.status,
        });
      return { user, ...(await this.issueTokens(user)) };
    } catch (e) {
      // DB ka unique constraint hi asli guard hai (concurrent requests ke liye bhi).
      if (isUniqueViolation(e)) throw new ConflictException(PHONE_UNAVAILABLE);
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const phone = normalizePkPhone(dto.phone);
    const [user] = phone
      ? await this.db.select().from(users).where(eq(users.phoneNormalized, phone)).limit(1)
      : [];

    const hash = user?.passwordHash ?? (await this.dummyHash);
    const passwordOk = await argon2.verify(hash, dto.password).catch(() => false);

    if (!user || !passwordOk || user.deletedAt) {
      throw new UnauthorizedException('Invalid phone number or password');
    }
    // Password sahi hone ke baad clear message dena theek hai (SRS section 12).
    if (user.status !== 'active') {
      throw new ForbiddenException(`Your account is ${user.status}`);
    }

    return {
      user: { id: user.id, name: user.name, phone: user.phoneNormalized, role: user.role, status: user.status },
      ...(await this.issueTokens(user)),
    };
  }

  async refresh(refreshToken: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, sha256(refreshToken)))
      .limit(1);

    if (!row || row.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (row.revokedAt) {
      // Purana token dobara use hua: chori ka shak, is user ke sab tokens revoke.
      await this.revokeAllForUser(row.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (!user || user.deletedAt || user.status !== 'active') {
      await this.revokeAllForUser(row.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Sirf ek request is token ko revoke kar sakti hai (isNull guard).
    const revoked = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    if (revoked.length === 0) throw new UnauthorizedException('Invalid refresh token');

    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, sha256(refreshToken)),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  // M2 mein admin ban karte waqt isi ko call karega.
  async revokeAllForUser(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  private async issueTokens(user: { id: string; role: Role }) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: ACCESS_TTL_SECONDS },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
    return { accessToken, refreshToken };
  }
}