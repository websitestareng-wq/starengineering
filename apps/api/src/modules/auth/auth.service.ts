import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { CaptchaService } from "../../common/services/captcha.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
  ) {}

  private async findActiveUser(emailOrPhone: string) {
    const value = emailOrPhone?.trim();

    if (!value) {
      throw new BadRequestException("Email or phone is required.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: value }, { phone: value }],
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid login credentials.");
    }

    return user;
  }

  async identify(payload: {
    emailOrPhone: string;
    password: string;
  }) {
    const emailOrPhone = payload.emailOrPhone?.trim();

    if (!emailOrPhone) {
      throw new BadRequestException("Email or phone is required.");
    }

    if (!payload.password?.trim()) {
      throw new BadRequestException("Password is required.");
    }

    const user = await this.findActiveUser(emailOrPhone);

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid login credentials.");
    }

    const requiresSecretKey =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN_VIEWER" ||
      user.role === "ADMIN";

    return {
      success: true,
      name: user.name,
      role: user.role,
      requiresSecretKey,
    };
  }

  async loginUser(payload: LoginDto) {
    const emailOrPhone = payload.emailOrPhone?.trim();

    if (!emailOrPhone) {
      throw new BadRequestException("Email or phone is required.");
    }

    if (!payload.password?.trim()) {
      throw new BadRequestException("Password is required.");
    }

    if (!payload.captchaToken?.trim()) {
      throw new BadRequestException("Captcha token is required.");
    }

    await this.captchaService.verifyTurnstileToken(payload.captchaToken);

    const user = await this.findActiveUser(emailOrPhone);

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid login credentials.");
    }

    const adminRoles = ["SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER"];

    if (adminRoles.includes(user.role)) {
      throw new UnauthorizedException(
        "Admin accounts must complete protected verification.",
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        sessionVersion: user.sessionVersion,
      },
      {
        expiresIn: "30m",
      },
    );

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async loginAdmin(payload: LoginDto) {
    const emailOrPhone = payload.emailOrPhone?.trim();

    if (!emailOrPhone) {
      throw new BadRequestException("Email or phone is required.");
    }

    if (!payload.password?.trim()) {
      throw new BadRequestException("Password is required.");
    }

    if (!payload.captchaToken?.trim()) {
      throw new BadRequestException("Captcha token is required.");
    }

    await this.captchaService.verifyTurnstileToken(payload.captchaToken);

    const user = await this.findActiveUser(emailOrPhone);

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid login credentials.");
    }

    const adminRoles = ["SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER"];

    if (!adminRoles.includes(user.role)) {
      throw new UnauthorizedException("This account is not an admin account.");
    }

    if (!payload.secretKey?.trim()) {
      throw new UnauthorizedException("Secret key required.");
    }

    if (!user.secretKeyHash) {
      throw new UnauthorizedException(
        "Secret key is not configured for this admin account.",
      );
    }

    const isSecretKeyValid = await bcrypt.compare(
      payload.secretKey,
      user.secretKeyHash,
    );

    if (!isSecretKeyValid) {
      throw new UnauthorizedException("Invalid secret key.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        sessionVersion: user.sessionVersion,
      },
      {
        expiresIn: "30m",
      },
    );

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async logoutUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        sessionVersion: {
          increment: 1,
        },
      },
    });
  }
}