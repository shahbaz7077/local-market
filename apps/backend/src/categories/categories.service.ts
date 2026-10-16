import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { categories } from '../db/schema.js';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
const isDup = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
};

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  listActive() {
    return this.db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name));
  }

  async create(dto: CreateCategoryDto) {
    try {
      const [row] = await this.db.insert(categories).values({ name: dto.name, slug: slugify(dto.name) }).returning();
      return row;
    } catch (e) {
      if (isDup(e)) throw new ConflictException('Category already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const set: Partial<typeof categories.$inferInsert> = {};
    if (dto.name !== undefined) { set.name = dto.name; set.slug = slugify(dto.name); }
    if (dto.isActive !== undefined) set.isActive = dto.isActive;
    if (Object.keys(set).length === 0) {
      const [row] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
      if (!row) throw new NotFoundException('Category not found');
      return row;
    }
    try {
      const [row] = await this.db.update(categories).set(set).where(eq(categories.id, id)).returning();
      if (!row) throw new NotFoundException('Category not found');
      return row;
    } catch (e) {
      if (isDup(e)) throw new ConflictException('Category already exists');
      throw e;
    }
  }
}