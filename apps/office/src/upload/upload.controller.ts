import { FileDto, UploadService } from '@app/domain/upload';
import { ApiFile, CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import {
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse } from '@nestjs/swagger';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @CustomApiOperation({
    summary: '파일 업로드 가져오기',
    tags: ['upload'],
  })
  @ApiOkResponse({
    type: FileDto,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/')
  async getUploadFile(
    @Query('fileId', ParseIntPipe) fileId: number,
  ): Promise<FileDto> {
    return this.uploadService.findOne(fileId);
  }

  @CustomApiOperation({
    summary: '파일 업로드',
    tags: ['upload'],
  })
  @ApiOkResponse({
    type: FileDto,
  })
  @ApiBearerAuth()
  @ApiFile()
  @ApiConsumes('multipart/form-data')
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      'file',
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })], // 2MiB
      }),
    )
    file: Express.Multer.File,
  ): Promise<FileDto> {
    return this.uploadService.upload(file);
  }
}
