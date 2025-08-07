import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 用户服务方法将在下一步实现
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User> {
    return this.userRepository.findOne({ where: { username } });
  }
}