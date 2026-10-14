import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { users } from '../db/schema.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async getProfile(id: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phoneNormalized,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new NotFoundException();
    return user; // passwordHash kabhi select hi nahi hota
  }

  async updateProfile(id: string, dto: UpdateMeDto) {
    if (dto.name !== undefined) {
      await this.db.update(users).set({ name: dto.name }).where(eq(users.id, id));
    }
    return this.getProfile(id);
  }
}