import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { DashboardService } from "./dashboard.service";
import { QueryDashboardDto } from "./dto/query-dashboard.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  getOverview(@Query() query: QueryDashboardDto, @Req() req: Request) {
    const user = req.user as {
      id: string;
      role: string;
      email?: string | null;
      phone?: string | null;
    };

    return this.dashboardService.getOverview({
      from: query.from,
      to: query.to,
      partyId: user.role === "USER" ? user.id : query.partyId,
      role: user.role,
    });
  }
}