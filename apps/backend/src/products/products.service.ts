import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';
import { categories, productImages, products, sellerProfiles } from '../db/schema.js';
import type { CreateProductDto, ListProductsDto, UpdateProductDto } from './dto/product.dto.js';

const publicCols = {
  id: products.id,
  title: products.title,
  description: products.description,
  price: products.price,
  currency: products.currency,
  categoryId: products.categoryId,
  createdAt: products.createdAt,
  shopName: sellerProfiles.shopName,
};

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  private async sellerIdOf(userId: string) {
    const [p] = await this.db
      .select({ id: sellerProfiles.id })
      .from(sellerProfiles)
      .where(and(eq(sellerProfiles.userId, userId), eq(sellerProfiles.approvalStatus, 'approved')))
      .limit(1);
    if (!p) throw new NotFoundException('Seller profile not found');
    return p.id;
  }

  private async assertCategory(id?: string) {
    if (!id) return;
    const [c] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isActive, true)))
      .limit(1);
    if (!c) throw new BadRequestException('Invalid category');
  }

  private async withImages<T extends { id: string }>(rows: T[]) {
    if (rows.length === 0) return [];
    const imgs = await this.db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, rows.map((r) => r.id)))
      .orderBy(asc(productImages.sortOrder));
    return rows.map((r) => ({ ...r, imageUrls: imgs.filter((i) => i.productId === r.id).map((i) => i.url) }));
  }

  async listPublic(q: ListProductsDto) {
    const conds: SQL[] = [
      eq(products.status, 'active'),
      isNull(products.archivedAt),
      eq(sellerProfiles.approvalStatus, 'approved'),
    ];
    if (q.categoryId) conds.push(eq(products.categoryId, q.categoryId));
    if (q.q) conds.push(ilike(products.title, `%${q.q.replace(/[%_\\]/g, '\\$&')}%`));
    const where = and(...conds);

    const rows = await this.db
      .select(publicCols)
      .from(products)
      .innerJoin(sellerProfiles, eq(sellerProfiles.id, products.sellerId))
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(q.limit)
      .offset((q.page - 1) * q.limit);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(products)
      .innerJoin(sellerProfiles, eq(sellerProfiles.id, products.sellerId))
      .where(where);

    return { items: await this.withImages(rows), page: q.page, limit: q.limit, total };
  }

  async getPublic(id: string) {
    const rows = await this.db
      .select(publicCols)
      .from(products)
      .innerJoin(sellerProfiles, eq(sellerProfiles.id, products.sellerId))
      .where(
        and(
          eq(products.id, id),
          eq(products.status, 'active'),
          isNull(products.archivedAt),
          eq(sellerProfiles.approvalStatus, 'approved'),
        ),
      )
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('Product not found');
    return (await this.withImages(rows))[0];
  }

  async listMine(userId: string) {
    const sellerId = await this.sellerIdOf(userId);
    const rows = await this.db
      .select({ ...publicCols, status: products.status })
      .from(products)
      .innerJoin(sellerProfiles, eq(sellerProfiles.id, products.sellerId))
      .where(and(eq(products.sellerId, sellerId), isNull(products.archivedAt)))
      .orderBy(desc(products.createdAt));
    return this.withImages(rows);
  }

  async create(userId: string, dto: CreateProductDto) {
    const sellerId = await this.sellerIdOf(userId);
    await this.assertCategory(dto.categoryId);
    return this.db.transaction(async (tx) => {
      const [p] = await tx
        .insert(products)
        .values({ sellerId, categoryId: dto.categoryId, title: dto.title, description: dto.description, price: dto.price })
        .returning();
      const urls = dto.imageUrls ?? [];
      if (urls.length) {
        await tx.insert(productImages).values(urls.map((url, i) => ({ productId: p.id, url, sortOrder: i })));
      }
      return { ...p, imageUrls: urls };
    });
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const sellerId = await this.sellerIdOf(userId);
    await this.assertCategory(dto.categoryId);
    return this.db.transaction(async (tx) => {
      const { imageUrls, ...fields } = dto;
      const set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      const [p] =
        Object.keys(set).length > 0
          ? await tx
              .update(products)
              .set(set)
              .where(and(eq(products.id, id), eq(products.sellerId, sellerId), isNull(products.archivedAt)))
              .returning()
          : await tx
              .select()
              .from(products)
              .where(and(eq(products.id, id), eq(products.sellerId, sellerId), isNull(products.archivedAt)))
              .limit(1);
      if (!p) throw new NotFoundException('Product not found');

      if (imageUrls) {
        await tx.delete(productImages).where(eq(productImages.productId, id));
        if (imageUrls.length) {
          await tx.insert(productImages).values(imageUrls.map((url, i) => ({ productId: id, url, sortOrder: i })));
        }
      }
      return p;
    });
  }

  // Delete = archive (soft delete), taake history na toote.
  async archive(userId: string, id: string) {
    const sellerId = await this.sellerIdOf(userId);
    const res = await this.db
      .update(products)
      .set({ archivedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId), isNull(products.archivedAt)))
      .returning({ id: products.id });
    if (res.length === 0) throw new NotFoundException('Product not found');
  }
}