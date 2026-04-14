import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";

type JwtPayload = {
  sub: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  sessionVersion?: number;
};

function extractJwtFromCookie(req: Request): string | null {
  if (!req?.cookies) {
    return null;
  }

  return req.cookies["access_token"] || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>("JWT_SECRET");

    if (!secret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException("Invalid token payload.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("User is inactive.");
    }

    if (user.role !== payload.role) {
      throw new UnauthorizedException("Role mismatch.");
    }

    if (
      typeof payload.sessionVersion !== "number" ||
      user.sessionVersion !== payload.sessionVersion
    ) {
      throw new UnauthorizedException("Session expired.");
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }
}