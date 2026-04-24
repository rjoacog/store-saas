import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const storeName = dto.storeName.trim();
    if (storeName.length === 0) {
      throw new ConflictException('Store name is required');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    let user: { id: number; email: string };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: { email, passwordHash },
        });
        const store = await tx.store.create({
          data: {
            name: storeName,
            ownerId: createdUser.id,
          },
        });
        await tx.membership.create({
          data: {
            userId: createdUser.id,
            storeId: store.id,
            role: 'ADMIN',
          },
        });
        return createdUser;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
      }),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (user == null) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
      }),
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { store: { select: { id: true, name: true } } },
        },
      },
    });
    if (user == null) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      stores: user.memberships.map((m) => ({
        id: m.store.id,
        name: m.store.name,
        role: m.role,
      })),
    };
  }
}
