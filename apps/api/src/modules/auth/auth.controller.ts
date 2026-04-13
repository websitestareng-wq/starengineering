import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
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
  constructor(private readonly authService: AuthService) {}

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

  @Post("user/login")
  async loginUser(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginUser(body);

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
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginAdmin(body);

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

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id: string };

    await this.authService.logoutUser(user.id);

    res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
    res.clearCookie(ROLE_COOKIE_NAME, roleCookieOptions);

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("verify")
  verify() {
    return { valid: true };
  }
}