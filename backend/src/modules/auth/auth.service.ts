import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Client, ClientStatus } from '../../entities/client.entity';
import { ClientAuthDto } from './dto/client-auth.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { v4 as uuidv4 } from 'uuid';
// import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private jwtService: JwtService,
  ) {}

  /**
   * 客户端认证 - 首次运行自动注册
   * @param clientAuthDto 客户端认证信息
   * @returns 客户端UID和认证结果
   */
  async clientAuth(clientAuthDto: ClientAuthDto) {
    let client: Client;
    let isNewClient = false;

    // 如果提供了UID，尝试查找现有客户端
    if (clientAuthDto.uid) {
      client = await this.clientRepository.findOne({
        where: { id: clientAuthDto.uid },
        relations: ['group'],
      });

      if (client) {
        // 更新客户端信息和心跳时间
        await this.updateClientInfo(client, clientAuthDto);
        return {
          uid: client.id,
          isNewClient: false,
          client: {
            id: client.id,
            clientNumber: client.clientNumber,
            clientName: client.clientName,
            groupId: client.groupId,
            status: client.status,
            lastHeartbeat: client.lastHeartbeat,
          },
          message: '客户端认证成功',
        };
      }
    }

    // 如果没有找到现有客户端，尝试通过clientNumber查找
    const clientNumber = clientAuthDto.clientNumber || `CLIENT-${Date.now()}`;
    const clientName = clientAuthDto.clientName || `客户端-${clientNumber}`;

    // 检查客户端编号是否已存在
    const existingClient = await this.clientRepository.findOne({
      where: { clientNumber },
      relations: ['group'],
    });

    if (existingClient) {
      // 如果找到现有客户端，更新其信息
      await this.updateClientInfo(existingClient, clientAuthDto);
      return {
        uid: existingClient.id,
        isNewClient: false,
        client: {
          id: existingClient.id,
          clientNumber: existingClient.clientNumber,
          clientName: existingClient.clientName,
          groupId: existingClient.groupId,
          status: existingClient.status,
          lastHeartbeat: existingClient.lastHeartbeat,
        },
        message: '客户端信息更新成功',
      };
    }

    // 如果没有找到现有客户端，创建新客户端
    const newUid = uuidv4();
    const now = new Date();

    // 创建新客户端记录
    client = this.clientRepository.create({
      id: newUid,
      clientNumber,
      clientName,
      groupId: 1, // 默认分组ID，可以根据需要调整
      computerName: clientAuthDto.computerName,
      username: clientAuthDto.username,
      ipAddress: clientAuthDto.ipAddress,
      macAddress: clientAuthDto.macAddress,
      osVersion: clientAuthDto.osVersion,
      clientVersion: clientAuthDto.clientVersion,
      screenResolution: clientAuthDto.screenResolution,
      status: ClientStatus.ONLINE,
      lastHeartbeat: now,
      firstConnect: now,
      totalOnlineTime: 0,
      isActive: true,
    });

    await this.clientRepository.save(client);
    isNewClient = true;

    return {
      uid: newUid,
      isNewClient,
      client: {
        id: client.id,
        clientNumber: client.clientNumber,
        clientName: client.clientName,
        groupId: client.groupId,
        status: client.status,
        lastHeartbeat: client.lastHeartbeat,
      },
      message: isNewClient ? '客户端注册成功' : '客户端认证成功',
    };
  }

  /**
   * 更新客户端信息
   * @param client 客户端实体
   * @param clientAuthDto 客户端认证信息
   */
  private async updateClientInfo(client: Client, clientAuthDto: ClientAuthDto) {
    const now = new Date();

    // 更新客户端信息（如果提供了新信息）
    if (clientAuthDto.computerName) client.computerName = clientAuthDto.computerName;
    if (clientAuthDto.username) client.username = clientAuthDto.username;
    if (clientAuthDto.ipAddress) client.ipAddress = clientAuthDto.ipAddress;
    if (clientAuthDto.macAddress) client.macAddress = clientAuthDto.macAddress;
    if (clientAuthDto.osVersion) client.osVersion = clientAuthDto.osVersion;
    if (clientAuthDto.clientVersion) client.clientVersion = clientAuthDto.clientVersion;
    if (clientAuthDto.screenResolution) client.screenResolution = clientAuthDto.screenResolution;

    // 更新状态和心跳时间
    client.status = ClientStatus.ONLINE;
    client.lastHeartbeat = now;

    await this.clientRepository.save(client);
  }

  /**
   * 管理员登录
   * @param adminLoginDto 登录信息
   * @returns JWT令牌和用户信息
   */
  async adminLogin(adminLoginDto: AdminLoginDto) {
    const { email, password } = adminLoginDto;

    // 硬编码的管理员账号（实际项目中应该从数据库获取）
    const adminUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123', // 实际项目中应该是加密后的密码
      role: 'admin',
      realName: '系统管理员',
    };

    // 验证邮箱
    if (email !== adminUser.email) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码（这里简化处理，实际应该使用bcrypt比较）
    if (password !== adminUser.password) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成JWT令牌
    const payload = {
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      access_token,
      refresh_token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        realName: adminUser.realName,
      },
    };
  }

  /**
   * 获取管理员信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getAdminProfile(userId: number) {
    // 硬编码的管理员信息
    const adminUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      realName: '系统管理员',
    };

    if (userId !== adminUser.id) {
      throw new UnauthorizedException('用户不存在');
    }

    return adminUser;
  }

  /**
   * 修改密码
   * @param userId 用户ID
   * @param currentPassword 当前密码
   * @param newPassword 新密码
   */
  async changePassword(userId: number, currentPassword: string, _newPassword: string) {
    // 硬编码验证（实际项目中应该从数据库获取并使用bcrypt）
    if (userId !== 1 || currentPassword !== 'admin123') {
      throw new UnauthorizedException('当前密码错误');
    }

    // 这里应该更新数据库中的密码
    // 由于是硬编码，这里只是模拟成功
    return { message: '密码修改成功' };
  }
}
