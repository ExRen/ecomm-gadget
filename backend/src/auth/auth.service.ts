import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        emailVerifyToken,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return {
      user,
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // SEK-004: Store HASHED refresh token in DB (never plaintext)
    const hashedRefreshToken = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /**
   * SEK-004: Refresh Token Rotation with one-time use and reuse detection.
   *
   * Security flow:
   * 1. Hash incoming token and look it up in DB
   * 2. If not found (hashed), try plaintext lookup for legacy migration
   * 3. If still not found → possible token reuse attack → revoke ALL user tokens
   * 4. If found → delete the used token (one-time use)
   * 5. Generate new token pair (rotation)
   * 6. Store new hashed refresh token
   */
  async refreshToken(token: string) {
    const hashedToken = this.hashToken(token);

    // Try hashed lookup first (new tokens)
    let refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    // Migration: if not found by hash, try plaintext lookup (old tokens)
    if (!refreshToken) {
      refreshToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (refreshToken) {
        this.logger.log(
          `Migrating legacy plaintext refresh token for user ${refreshToken.userId}`,
        );
      }
    }

    if (!refreshToken) {
      // SEK-004: Token not found by either method — possible reuse attack
      try {
        const decoded = this.jwtService.decode(token) as { sub?: string };
        if (decoded?.sub) {
          this.logger.warn(
            `SEK-004: Possible token reuse attack detected for user ${decoded.sub}. ` +
            `Revoking ALL sessions.`,
          );
          await this.revokeAllUserTokens(decoded.sub);
        }
      } catch {
        // Token is completely invalid — just reject
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // SEK-004: Delete used token immediately (one-time use / rotation)
    await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });

    const user = refreshToken.user;
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store new hashed refresh token
    const newHashedToken = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: newHashedToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // SEK-004: Try to delete by hash first, then by plaintext (migration)
      const hashedToken = this.hashToken(refreshToken);
      const deleted = await this.prisma.refreshToken.deleteMany({
        where: { token: hashedToken },
      });
      // If hashed didn't find anything, try plaintext (old tokens)
      if (deleted.count === 0) {
        await this.prisma.refreshToken.deleteMany({
          where: { token: refreshToken },
        });
      }
    } else {
      // Logout all sessions
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * SEK-004: Revoke ALL refresh tokens for a user.
   * Called when token reuse attack is detected.
   */
  async revokeAllUserTokens(userId: string) {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    this.logger.warn(
      `SEK-004: Revoked ${result.count} refresh tokens for user ${userId}`,
    );
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: expiry,
      },
    });

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Invalidate all refresh tokens after password reset
    await this.revokeAllUserTokens(user.id);

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh', role },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * SEK-004: Hash refresh token with SHA-256 before storing.
   * Never store plaintext refresh tokens in the database.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
