import { FileDto } from '@app/domain/upload/dtos';
import { PrismaService } from '@app/utils/prisma';
import { S3Service } from '@app/utils/s3';

import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { customAlphabet } from 'nanoid';

@Injectable()
export class UploadService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
  ) {}
  async upload(file: Express.Multer.File): Promise<FileDto> {
    return this.prismaService.$transaction(async (t) => {
      const fileKey = `${customAlphabet(
        '1234567890abcdefghijklmnopqrstuvwxyz',
        20,
      )()}`;

      const fileData = await t.files.create({
        data: {
          name: file.originalname,
          key: fileKey,
          extension: file.mimetype,
          url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.APP_ENV}/files/${fileKey}`,
        },
      });

      await this.s3Service.put({
        key: `files/${fileKey}`,
        buffer: file.buffer,
      });

      return plainToInstance(FileDto, fileData);
    });
  }

  async findOne(fileId: number): Promise<FileDto> {
    try {
      const file = await this.prismaService.files.findUnique({
        where: {
          id: fileId,
        },
      });

      return plainToInstance(FileDto, file);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
