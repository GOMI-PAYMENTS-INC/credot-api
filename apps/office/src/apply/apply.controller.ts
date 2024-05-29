import { ApplyDto, ApplyService, UpdateApplyDto } from '@app/domain/apply';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';
import { ApplyStatusPipe } from '@app/utils/pipes';

import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ApplyStatus } from '@prisma/client';

@Controller('apply')
export class ApplyController {
  constructor(private readonly applyService: ApplyService) {}
  @CustomApiOperation({
    summary: '서비스 신청 목록 추출',
    tags: ['apply'],
  })
  @ApiOkResponse({
    type: ApplyDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/list')
  async getApplies(
    @Query('status', ApplyStatusPipe) status: ApplyStatus,
    @Query('userId') userId: string,
  ): Promise<ApplyDto[]> {
    return await this.applyService.list({
      status,
      userId: userId && Number(userId),
    });
  }

  @CustomApiOperation({
    summary: '서비스 신청 상태 수정',
    tags: ['apply'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put('/')
  async updateApplyStatusByIds(@Body() data: UpdateApplyDto): Promise<boolean> {
    return this.applyService.updateApplyStatusByIds(data.applyIds, data.status);
  }
}
