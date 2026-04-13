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
  sessionId?: string; // 🔥 ADD THIS
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

  // 🔥 DB VALIDATION (MOST IMPORTANT)
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
   select: {
  id: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  sessionId: true, // 🔥 ADD THIS
},
  });

  if (!user) {
    throw new UnauthorizedException("User not found.");
  }

  // ❌ inactive user block
  if (!user.isActive) {
    throw new UnauthorizedException("User is inactive.");
  }

  // ❌ role mismatch block (anti tampering)
  if (user.role !== payload.role) {
    throw new UnauthorizedException("Role mismatch.");
  }
// 🔴 ADD THIS EXACTLY HERE
if (!payload.sessionId || user.sessionId !== payload.sessionId) {
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