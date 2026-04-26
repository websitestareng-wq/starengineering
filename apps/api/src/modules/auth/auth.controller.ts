import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

const AUTH_COOKIE_NAME = "access_token";
const ROLE_COOKIE_NAME = "user_role";

const isProduction = process.env.NODE_ENV === "production";
const sharedCookieDomain = isProduction ? ".stareng.co.in" : undefined;

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
  domain: sharedCookieDomain,
};

const roleCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
  domain: sharedCookieDomain,
};

@Controller("auth")
export class AuthController {
  constructor(
  private readonly authService: AuthService,
  private readonly jwtService: JwtService,
) {}

    @Post("portal/identify")
  async identify(
    @Body()
    body: {
      emailOrPhone: string;
      password: string;
    },
  ) {
    return this.authService.identify(body);
  }

  @Post("recover-credential")
  async recoverCredential(
    @Body()
    body: {
      emailOrPhone: string;
    },
  ) {
    return this.authService.recoverCredential(body);
  }

@Post("user/login")
async loginUser(
  @Body() body: LoginDto,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const result = await this.authService.loginUser(body, {
    headers: req.headers as Record<string, any>,
    ip: req.ip,
  });

    res.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions);
    res.cookie(ROLE_COOKIE_NAME, result.user.role, roleCookieOptions);

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    return {
      user: result.user,
    };
  }
@Post("admin/login")
async loginAdmin(
  @Body() body: LoginDto,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const result = await this.authService.loginAdmin(body, {
    headers: req.headers as Record<string, any>,
    ip: req.ip,
  });

    res.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions);
    res.cookie(ROLE_COOKIE_NAME, result.user.role, roleCookieOptions);

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    return {
      user: result.user,
    };
  }

@Post("logout")
async logout(
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  try {
    const token =
      req.cookies?.access_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const decoded: any = this.jwtService.decode(token);
      if (decoded?.sessionToken) {
        await this.authService.logoutUser(decoded.sessionToken);
      }
    }
  } catch (err) {
    // ignore error (important)
  }

  // 🔥 ALWAYS CLEAR COOKIE
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
  res.clearCookie(ROLE_COOKIE_NAME, roleCookieOptions);

  return { success: true };
}

@UseGuards(JwtAuthGuard)
@Get("verify")
verify(@Req() req: Request) {
  return {
    valid: true,
    user: req.user,
  };
}
}