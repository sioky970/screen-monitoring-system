import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { RedisService } from '../../common/services/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
    private redisService: RedisService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'username', 'password', 'role', 'isActive'],
    });

    if (user && await this.cryptoService.comparePassword(password, user.password)) {
      if (!user.isActive) {
        throw new UnauthorizedException('账户已被禁用');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // 将 refresh token 存储到 Redis
    await this.redisService.set(
      `refresh_token:${user.id}`,
      refreshToken,
      7 * 24 * 60 * 60, // 7天
    );

    // 更新最后登录时间
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUsername = await this.userRepository.findOne({
      where: { username: registerDto.username },
    });

    if (existingUsername) {
      throw new BadRequestException('用户名已被占用');
    }

    // 创建新用户
    const hashedPassword = await this.cryptoService.hashPassword(registerDto.password);
    const user = this.userRepository.create({
      email: registerDto.email,
      username: registerDto.username,
      password: hashedPassword,
      role: UserRole.OPERATOR, // 默认角色为操作员
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // 返回用户信息（不包含密码）
    const { password, ...result } = savedUser;
    return result;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      // 验证 Redis 中的 refresh token
      const storedToken = await this.redisService.get(`refresh_token:${payload.sub}`);
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 生成新的 access token
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '24h' });

      return {
        access_token: accessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  async logout(userId: number) {
    // 删除 Redis 中的 refresh token
    await this.redisService.del(`refresh_token:${userId}`);
    return { message: '退出登录成功' };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await this.cryptoService.comparePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('当前密码错误');
    }

    // 更新密码
    const hashedNewPassword = await this.cryptoService.hashPassword(
      changePasswordDto.newPassword,
    );

    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });

    // 删除所有 refresh token，强制重新登录
    await this.redisService.del(`refresh_token:${userId}`);

    return { message: '密码修改成功，请重新登录' };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'role', 'isActive', 'createdAt', 'lastLoginAt'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }
}