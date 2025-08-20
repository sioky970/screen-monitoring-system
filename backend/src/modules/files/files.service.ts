import { Injectable } from '@nestjs/common';
import { MinioService } from '../../common/services/minio.service';

@Injectable()
export class FilesService {
  constructor(private readonly minioService: MinioService) {}

  async uploadFile(file: Express.Multer.File, folder?: string) {
    return await this.minioService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
    );
  }

  async getFileUrl(key: string, expiry?: number) {
    return await this.minioService.getFileUrl(key, expiry);
  }

  async getFile(key: string) {
    return await this.minioService.getFile(key);
  }

  async getFileInfo(key: string) {
    return await this.minioService.getFileInfo(key);
  }

  async deleteFile(key: string) {
    return await this.minioService.deleteFile(key);
  }
}
