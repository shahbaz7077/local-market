import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { SellerApplicationsController } from './seller-applications.controller.js';
import { SellerApplicationsService } from './seller-applications.service.js';

@Module({
  controllers: [AdminController, SellerApplicationsController],
  providers: [AdminService, SellerApplicationsService],
})
export class AdminModule {}