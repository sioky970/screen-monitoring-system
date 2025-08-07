import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesService } from './files.service';

@ApiTags('📁 文件管理')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadFile(file);
  }

  @Get(':key/url')
  @ApiOperation({ summary: '获取文件访问URL' })
  getFileUrl(@Param('key') key: string) {
    return this.filesService.getFileUrl(key);
  }

  @Delete(':key')
  @ApiOperation({ summary: '删除文件' })
  deleteFile(@Param('key') key: string) {
    return this.filesService.deleteFile(key);
  }
}