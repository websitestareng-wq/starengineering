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
import { randomUUID } from "crypto";
import { MailService } from "../../mail/mail.service";

@Injectable()
export class AuthService {
 constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
  private readonly captchaService: CaptchaService,
  private readonly mailService: MailService,
) {}
private generateTemporaryPassword(length = 8) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#%";
  const allChars = uppercase + lowercase + numbers + symbols;

  const pick = (chars: string) =>
    chars.charAt(Math.floor(Math.random() * chars.length));

  const passwordChars = [
    pick(uppercase),
    pick(lowercase),
    pick(numbers),
    pick(symbols),
  ];

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(pick(allChars));
  }

  return passwordChars.join("").slice(0, length);
}
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
      user.role === "ADMIN" ||
      user.role === "ADMIN_VIEWER";

    return {
      success: true,
      name: user.name,
      role: user.role,
      requiresSecretKey,
    };
  }

  async loginUser(
    payload: LoginDto,
    meta?: { headers?: Record<string, any>; ip?: string },
  ) {
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

    const now = new Date();
    const sessionToken = randomUUID();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
      },
    });

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken,
        userAgent: meta?.headers?.["user-agent"] || null,
        ipAddress: meta?.ip || null,
        isActive: true,
        expiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        sessionToken,
      },
      {
        expiresIn: "1d",
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

  async loginAdmin(
    payload: LoginDto,
    meta?: { headers?: Record<string, any>; ip?: string },
  ) {
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

    const now = new Date();
    const sessionToken = randomUUID();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
      },
    });

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken,
        userAgent: meta?.headers?.["user-agent"] || null,
        ipAddress: meta?.ip || null,
        isActive: true,
        expiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        sessionToken,
      },
      {
        expiresIn: "1d",
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

  async logoutUser(sessionToken: string) {
    if (!sessionToken) return;

    await this.prisma.userSession.updateMany({
      where: {
        sessionToken,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }
  async recoverCredential(payload: { emailOrPhone: string }) {
  const value = payload.emailOrPhone?.trim();

  if (!value) {
    throw new BadRequestException("Email or phone is required.");
  }

  const user = await this.prisma.user.findFirst({
    where: {
      OR: [{ email: value }, { phone: value }],
    },
  });

  if (!user || !user.isActive) {
    throw new BadRequestException("No user found with provided details.");
  }

  if (!user.email) {
    throw new BadRequestException("User email not available for recovery.");
  }

  // 🔥 24 HOURS LIMIT
  if (user.lastCredentialRecoveredAt) {
    const last = new Date(user.lastCredentialRecoveredAt);
    const nextAllowed = new Date(last);
    nextAllowed.setHours(nextAllowed.getHours() + 24);

    if (new Date() < nextAllowed) {
      throw new BadRequestException(
        "You can request credential recovery only once every 24 hours."
      );
    }
  }

  const tempPassword = this.generateTemporaryPassword(8);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      lastPasswordChangedAt: null,
      lastCredentialRecoveredAt: new Date(),
    },
  });

  await this.prisma.userSession.updateMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  await this.mailService.sendRecoverCredentialEmail({
    to: user.email,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    password: tempPassword,
  });

  return {
    message: "Temporary password sent to your registered email.",
  };
}
}