import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SystemService } from './system.service';

@ApiTags('系统管理')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('logs')
  @ApiOperation({ summary: '获取系统日志' })
  findLogs() {
    return this.systemService.findLogs();
  }
}