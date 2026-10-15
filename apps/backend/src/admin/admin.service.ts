import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, isNotNull, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { adminAuditLogs, refreshTokens, reservedPhoneIdentities, users } from '../db/schema.js';
import type { ListUsersDto } from './dto/list-users.dto.js';
import type { UpdateStatusDto } from './dto/update-status.dto.js';

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async listUsers(q: ListUsersDto) {
    const conds: SQL[] = [isNull(users.deletedAt)];
    if (q.status) conds.push(eq(users.status, q.status));
    if (q.role) conds.push(eq(users.role, q.role));
    if (q.q) {
      const term = `%${q.q.replace(/[%_\\]/g, '\\$&')}%`;
      conds.push(or(ilike(users.name, term), ilike(users.phoneNormalized, term))!);
    }
    const where = and(...conds);

    const items = await this.db
      .select({
        id: users.id, name: users.name, phone: users.phoneNormalized,
        role: users.role, status: users.status, createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(q.limit)
      .offset((q.page - 1) * q.limit);

    const [{ total }] = await this.db.select({ total: count() }).from(users).where(where);
    return { items, page: q.page, limit: q.limit, total };
  }

  async updateStatus(adminId: string, targetId: string, dto: UpdateStatusDto) {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, targetId), isNull(users.deletedAt)))
        .limit(1);
      if (!target) throw new NotFoundException('User not found');
      if (target.id === adminId) throw new BadRequestException('You cannot change your own status');
      if (target.role === 'admin') throw new ForbiddenException('Admin accounts cannot be changed here');
      if (target.status === 'banned') throw new ConflictException('Banned users cannot be changed');
      if (target.status === dto.status) return { id: target.id, status: target.status };

      await tx.update(users).set({ status: dto.status }).where(eq(users.id, target.id));

      if (dto.status !== 'active') {
        // Suspend/ban: sab login sessions foran khatam.
        await tx
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(refreshTokens.userId, target.id), isNull(refreshTokens.revokedAt)));
      }
      if (dto.status === 'banned') {
        await tx
          .insert(reservedPhoneIdentities)
          .values({ phoneNormalized: target.phoneNormalized, reason: dto.reason ?? 'banned' })
          .onConflictDoNothing();
      }

      await tx.insert(adminAuditLogs).values({
        adminId,
        action: `user.${dto.status}`,
        targetType: 'user',
        targetId: target.id,
        metadata: { from: target.status, to: dto.status, reason: dto.reason ?? null },
      });
      return { id: target.id, status: dto.status };
    });
  }
}