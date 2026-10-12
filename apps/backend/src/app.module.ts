import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { DbModule } from './db/db.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule],
  controllers: [HealthController],
})
export class AppModule {}