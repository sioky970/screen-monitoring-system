import { PartialType } from '@nestjs/swagger';
import { CreateClientGroupDto } from './create-client-group.dto';

export class UpdateClientGroupDto extends PartialType(CreateClientGroupDto) {}