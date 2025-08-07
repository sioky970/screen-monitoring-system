import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from './dto';
import { UserRole } from '../../entities/user.entity';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取用户统计信息' })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @UseGuards(RolesGuard)
  getStats() {
    return this.usersService.getStats();
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: any) {
    return this.usersService.create(createUserDto, currentUser.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any
  ) {
    return this.usersService.update(id, updateUserDto, currentUser.userId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新用户状态' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { isActive: boolean },
    @CurrentUser() currentUser: any
  ) {
    return this.usersService.updateStatus(id, body.isActive, currentUser.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    return this.usersService.remove(id, currentUser.userId);
  }
}