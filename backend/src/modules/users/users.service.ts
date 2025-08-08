import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(query?: any): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    if (query?.search) {
      queryBuilder.where('user.username LIKE :search OR user.email LIKE :search', {
        search: `%${query.search}%`
      });
    }
    
    if (query?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }
    
    return queryBuilder.orderBy('user.createdAt', 'DESC').getMany();
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    return this.userRepository.findOne({ where: { username } });
  }

  async getStats() {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { isActive: true } });
    const inactive = total - active;
    
    return {
      total,
      active,
      inactive
    };
  }

  async create(createUserDto: any, currentUserId: number): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    return Array.isArray(savedUser) ? savedUser[0] : savedUser;
  }

  async update(id: number, updateUserDto: any, currentUserId: number): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updateStatus(id: number, isActive: boolean, currentUserId: number): Promise<User> {
    const user = await this.findById(id);
    user.isActive = isActive;
    return this.userRepository.save(user);
  }

  async remove(id: number, currentUserId: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}