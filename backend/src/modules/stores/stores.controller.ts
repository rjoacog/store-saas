import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StoresService } from './stores.service.js';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.storesService.findAllForUser(req.user.id);
  }
}
