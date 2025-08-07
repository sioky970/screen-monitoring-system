import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('通知管理')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知详情' })
  findOne(@Param('id') id: number) {
    return this.notificationsService.findById(id);
  }
}