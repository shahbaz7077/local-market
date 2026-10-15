import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthUser } from '../common/auth-user.js';
import { ListApplicationsDto } from './dto/list-applications.dto.js';
import { ReviewApplicationDto } from './dto/review-application.dto.js';
import { SellerApplicationsService } from './seller-applications.service.js';

@Controller('admin/seller-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SellerApplicationsController {
  constructor(private readonly apps: SellerApplicationsService) {}

  @Get()
  list(@Query() q: ListApplicationsDto) {
    return this.apps.list(q);
  }

  @Patch(':id')
  review(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewApplicationDto) {
    return this.apps.review(user.id, id, dto);
  }
}