import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { adminAuditLogs, sellerProfiles, users } from '../db/schema.js';
import type { ListApplicationsDto } from './dto/list-applications.dto.js';
import type { ReviewApplicationDto } from './dto/review-application.dto.js';

@Injectable()
export class SellerApplicationsService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async list(q: ListApplicationsDto) {
    const where = eq(sellerProfiles.approvalStatus, q.status);
    const items = await this.db
      .select({
        id: sellerProfiles.id,
        shopName: sellerProfiles.shopName,
        description: sellerProfiles.description,
        approvalStatus: sellerProfiles.approvalStatus,
        createdAt: sellerProfiles.createdAt,
        user: { id: users.id, name: users.name, phone: users.phoneNormalized },
      })
      .from(sellerProfiles)
      .innerJoin(users, eq(users.id, sellerProfiles.userId))
      .where(where)
      .orderBy(desc(sellerProfiles.createdAt))
      .limit(q.limit)
      .offset((q.page - 1) * q.limit);

    const [{ total }] = await this.db.select({ total: count() }).from(sellerProfiles).where(where);
    return { items, page: q.page, limit: q.limit, total };
  }

  async review(adminId: string, id: string, dto: ReviewApplicationDto) {
    return this.db.transaction(async (tx) => {
      // Sirf pending application update ho sakti hai; do admins ek saath karein to ek hi jeetay hai.
      const [updated] = await tx
        .update(sellerProfiles)
        .set({
          approvalStatus: dto.decision,
          rejectionReason: dto.decision === 'rejected' ? dto.reason : null,
          reviewedAt: new Date(),
        })
        .where(and(eq(sellerProfiles.id, id), eq(sellerProfiles.approvalStatus, 'pending')))
        .returning({ id: sellerProfiles.id, userId: sellerProfiles.userId });

      if (!updated) {
        const [exists] = await tx.select({ id: sellerProfiles.id }).from(sellerProfiles).where(eq(sellerProfiles.id, id)).limit(1);
        if (!exists) throw new NotFoundException('Application not found');
        throw new ConflictException('Application already reviewed');
      }

      if (dto.decision === 'approved') {
        await tx.update(users).set({ role: 'seller' }).where(and(eq(users.id, updated.userId), eq(users.role, 'customer')));
      }

      await tx.insert(adminAuditLogs).values({
        adminId,
        action: `seller_application.${dto.decision}`,
        targetType: 'seller_profile',
        targetId: updated.id,
        metadata: { userId: updated.userId, reason: dto.reason ?? null },
      });
      return { id: updated.id, approvalStatus: dto.decision };
    });
  }
}