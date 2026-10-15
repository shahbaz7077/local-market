import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { sellerProfiles } from '../db/schema.js';
import type { ApplySellerDto } from './dto/apply-seller.dto.js';

const cols = {
  id: sellerProfiles.id,
  shopName: sellerProfiles.shopName,
  description: sellerProfiles.description,
  approvalStatus: sellerProfiles.approvalStatus,
  rejectionReason: sellerProfiles.rejectionReason,
  createdAt: sellerProfiles.createdAt,
};

@Injectable()
export class SellersService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async apply(userId: string, dto: ApplySellerDto) {
    const [existing] = await this.db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, userId)).limit(1);

    if (existing) {
      if (existing.approvalStatus === 'pending') throw new ConflictException('Your application is already pending');
      if (existing.approvalStatus === 'approved') throw new ConflictException('You are already a seller');
      // rejected: dobara apply
      const [row] = await this.db
        .update(sellerProfiles)
        .set({
          shopName: dto.shopName,
          description: dto.description ?? null,
          approvalStatus: 'pending',
          rejectionReason: null,
          reviewedAt: null,
        })
        .where(eq(sellerProfiles.id, existing.id))
        .returning(cols);
      return row;
    }

    try {
      const [row] = await this.db
        .insert(sellerProfiles)
        .values({ userId, shopName: dto.shopName, description: dto.description })
        .returning(cols);
      return row;
    } catch (e) {
      const err = e as { code?: string; cause?: { code?: string } };
      if (err?.code === '23505' || err?.cause?.code === '23505') {
        throw new ConflictException('Your application is already pending');
      }
      throw e;
    }
  }

  async getMine(userId: string) {
    const [row] = await this.db.select(cols).from(sellerProfiles).where(eq(sellerProfiles.userId, userId)).limit(1);
    if (!row) throw new NotFoundException('No seller application found');
    return row;
  }
}