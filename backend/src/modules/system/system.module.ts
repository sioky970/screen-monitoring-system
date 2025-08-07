import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLog } from '../../entities/system-log.entity';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLog])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}