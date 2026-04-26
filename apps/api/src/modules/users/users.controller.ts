import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    role?: string;
  };
};
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =========================
  // Self profile endpoints
  // =========================

  @Get("me")
  @Roles("SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER", "PROPRIETOR", "USER")
  getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @Patch("me/address")
  @Roles("SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER", "PROPRIETOR", "USER")
  updateMyAddress(
    @Req() req: AuthenticatedRequest,
    @Body() dto: { address?: string | null },
  ) {
    return this.usersService.updateMyAddress(req.user.id, dto);
  }
  @Post("me/verify-password")
  @Roles("SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER", "PROPRIETOR", "USER")
  verifyMyPassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: { currentPassword: string },
  ) {
    return this.usersService.verifyMyPassword(req.user.id, dto);
  }
  @Patch("me/password")
  @Roles("SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER", "PROPRIETOR", "USER")
  changeMyPassword(
    @Req() req: AuthenticatedRequest,
    @Body()
    dto: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    return this.usersService.changeMyPassword(req.user.id, dto);
  }

  // =========================
  // Admin-only endpoints
  // =========================

  @Get()
  @Roles("SUPER_ADMIN")
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.usersService.findAll(search, status);
  }

  @Post()
  @Roles("SUPER_ADMIN")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(":id/status")
  @Roles("SUPER_ADMIN")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Post(":id/send-credentials")
  @Roles("SUPER_ADMIN")
  sendCredentials(@Param("id") id: string) {
    return this.usersService.sendCredentials(id);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}