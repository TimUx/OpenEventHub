import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@openeventhub/database';
import bcrypt from 'bcryptjs';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    if (!email || !password) {
      throw new UnauthorizedException('Email and password required');
    }

    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
