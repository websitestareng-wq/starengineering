import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { RemindersService } from "./reminders.service";
import { CreateReminderDto } from "./dto/create-reminder.dto";
import { UpdateReminderDto } from "./dto/update-reminder.dto";
import { QueryRemindersDto } from "./dto/query-reminders.dto";

@Controller("reminders")
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@Body() body: CreateReminderDto) {
    return this.remindersService.create(body, body.createdById);
  }

  @Get()
  findAll(@Query() query: QueryRemindersDto) {
    return this.remindersService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.remindersService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateReminderDto) {
    return this.remindersService.update(id, body);
  }

  @Patch(":id/complete")
  markCompleted(@Param("id") id: string) {
    return this.remindersService.markCompleted(id);
  }

  @Patch(":id/active")
  markActive(@Param("id") id: string) {
    return this.remindersService.markActive(id);
  }

  @Patch(":id/stop")
  stopSeries(@Param("id") id: string) {
    return this.remindersService.stopSeries(id);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.remindersService.delete(id);
  }
}