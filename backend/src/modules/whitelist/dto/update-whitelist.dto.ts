import { PartialType } from '@nestjs/swagger';
import { CreateWhitelistDto } from './create-whitelist.dto';

export class UpdateWhitelistDto extends PartialType(CreateWhitelistDto) {}
