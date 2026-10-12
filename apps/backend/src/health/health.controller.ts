import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ok', database: 'up', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
  }
}