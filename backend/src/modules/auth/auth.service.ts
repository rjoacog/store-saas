import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
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
  private readonly logger = new Logger(AuthService.name);

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
      // Un solo create anidado: menos round-trips y sin transacción interactiva.
      const created = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          memberships: {
            create: {
              role: 'ADMIN',
              store: {
                create: {
                  name: storeName,
                  owner: {
                    connect: { email },
                  },
                },
              },
            },
          },
        },
        select: { id: true, email: true },
      });
      user = created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
        if (e.code === 'P2028') {
          throw new ServiceUnavailableException(
            'La base de datos no respondió a tiempo. Reintentá en unos segundos.',
          );
        }
        if (e.code === 'P2021' || e.code === 'P2010') {
          throw new ServiceUnavailableException(
            'Faltan tablas en la base de datos. En el servidor ejecutá: npx prisma migrate deploy',
          );
        }
        this.logger.warn(`Prisma error en register: ${e.code} ${e.message}`);
      } else if (e instanceof Prisma.PrismaClientInitializationError) {
        this.logger.error(e.message);
        throw new ServiceUnavailableException(
          'No se pudo conectar a la base de datos. Revisá DATABASE_URL en el despliegue.',
        );
      } else {
        this.logger.error('Error en register', e);
      }
      throw new InternalServerErrorException(
        'Error al registrar. Revisá los logs del servidor o probá de nuevo.',
      );
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
