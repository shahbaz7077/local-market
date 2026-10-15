import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthUser } from '../common/auth-user.js';
import { AdminService } from './admin.service.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  list(@Query() q: ListUsersDto) {
    return this.admin.listUsers(q);
  }

  @Patch('users/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.admin.updateStatus(user.id, id, dto);
  }
}