import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthUser } from '../common/auth-user.js';
import { ApplySellerDto } from './dto/apply-seller.dto.js';
import { SellersService } from './sellers.service.js';

@Controller('sellers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post('apply')
  @Roles('customer')
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplySellerDto) {
    return this.sellers.apply(user.id, dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.sellers.getMine(user.id);
  }
}