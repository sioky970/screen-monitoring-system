import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Delete,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { FilesService } from './files.service';
import { Response } from 'express';

@ApiTags('📁 文件管理')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Public()
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

  @Public()
  @Get(':key/url')
  @ApiOperation({ summary: '获取文件访问URL' })
  getFileUrl(@Param('key') key: string) {
    return this.filesService.getFileUrl(key);
  }

  @Public()
  @Delete(':key')
  @ApiOperation({ summary: '删除文件' })
  deleteFile(@Param('key') key: string) {
    return this.filesService.deleteFile(key);
  }

  @Public()
  @Get('proxy/*')
  @ApiOperation({ summary: '代理访问MinIO文件' })
  async proxyFile(@Param('0') filePath: string, @Res() res: Response) {
    try {
      // 从URL路径中提取文件key
      // 例如: /files/proxy/monitoring-screenshots/screenshots/client-id/current.jpg
      // 提取: monitoring-screenshots/screenshots/client-id/current.jpg
      let fileKey = filePath;

      // 如果key不以斜杠开头，添加斜杠（MinIO内部存储格式）
      if (!fileKey.startsWith('/')) {
        fileKey = '/' + fileKey;
      }

      console.log(`尝试获取文件: ${fileKey}`);

      // 通过FilesService获取文件
      const fileBuffer = await this.filesService.getFile(fileKey);

      // 设置响应头
      res.setHeader('Content-Type', this.getContentType(fileKey));
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // 返回文件内容
      res.send(fileBuffer);
    } catch (error) {
      console.error(`文件访问失败: ${filePath}, 错误: ${error.message}`);
      throw new HttpException(
        `文件不存在或无法访问: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
}
