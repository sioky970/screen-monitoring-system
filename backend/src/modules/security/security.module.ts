import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityScreenshot } from '../../entities/security-screenshot.entity';
import { Client } from '../../entities/client.entity';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityScreenshot,
      Client,
    ]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}

