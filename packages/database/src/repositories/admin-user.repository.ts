import type { AdminUser, PrismaClient } from '@prisma/client';
import { AdminRole } from '@prisma/client';

export type PublicAdminUser = {
  readonly id: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

function toPublic(user: AdminUser): PublicAdminUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<PublicAdminUser[]> {
    const users = await this.prisma.adminUser.findMany({ orderBy: { email: 'asc' } });
    return users.map(toPublic);
  }

  async findById(id: string): Promise<PublicAdminUser | null> {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    return user ? toPublic(user) : null;
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async create(input: {
    email: string;
    passwordHash: string;
    role?: AdminRole;
  }): Promise<PublicAdminUser> {
    const user = await this.prisma.adminUser.create({
      data: {
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role ?? AdminRole.moderator,
      },
    });
    return toPublic(user);
  }

  async updateRole(id: string, role: AdminRole): Promise<PublicAdminUser> {
    const user = await this.prisma.adminUser.update({
      where: { id },
      data: { role },
    });
    return toPublic(user);
  }

  async updateEmail(id: string, email: string): Promise<PublicAdminUser> {
    const user = await this.prisma.adminUser.update({
      where: { id },
      data: { email: email.trim().toLowerCase() },
    });
    return toPublic(user);
  }

  async updatePassword(id: string, passwordHash: string): Promise<PublicAdminUser> {
    const user = await this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    });
    return toPublic(user);
  }

  async findAuthById(id: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<PublicAdminUser> {
    const user = await this.prisma.adminUser.delete({ where: { id } });
    return toPublic(user);
  }

  count(): Promise<number> {
    return this.prisma.adminUser.count();
  }
}
