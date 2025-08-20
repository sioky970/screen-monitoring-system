import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ClientAuthDto, ClientAuthResponseDto } from './dto/client-auth.dto';
import { AdminLoginDto, AdminLoginResponseDto, ChangePasswordDto } from './dto/admin-login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('🔒 认证管理')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '管理员登录',
    description: '管理员使用邮箱和密码登录系统',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  adminLogin(@Body() adminLoginDto: AdminLoginDto) {
    return this.authService.adminLogin(adminLoginDto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '退出登录',
    description: '管理员退出登录',
  })
  @ApiResponse({ status: 200, description: '退出成功' })
  logout() {
    // JWT是无状态的，客户端删除token即可
    return { message: '退出登录成功' };
  }

  @Public()
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取用户信息',
    description: '获取当前登录用户的详细信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  getProfile(@Request() req) {
    console.log('getProfile - 收到请求, req.user:', req.user);
    console.log('getProfile - Authorization header:', req.headers?.authorization);
    // 这里应该从JWT中获取用户ID，暂时硬编码
    return this.authService.getAdminProfile(1);
  }

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '修改密码',
    description: '管理员修改登录密码',
  })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 401, description: '当前密码错误' })
  changePassword(@Body() changePasswordDto: ChangePasswordDto, @Request() req) {
    // 这里应该从JWT中获取用户ID，暂时硬编码
    return this.authService.changePassword(
      1,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Public()
  @Post('client')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '客户端认证',
    description: '客户端首次运行时无需认证，如果没有UID则自动生成并返回唯一UID作为认证凭证',
  })
  @ApiResponse({
    status: 200,
    description: '认证成功',
    type: ClientAuthResponseDto,
  })
  @ApiResponse({ status: 400, description: '客户端编号已存在' })
  clientAuth(@Body() clientAuthDto: ClientAuthDto) {
    return this.authService.clientAuth(clientAuthDto);
  }
}
