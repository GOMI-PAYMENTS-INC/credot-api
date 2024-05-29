import { ApplyService } from '@app/domain/apply';
import { CreateApplyDto } from '@app/domain/apply/dtos/create-apply.dto';
import { CustomApiOperation } from '@app/utils/decorators';

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('apply')
export class ApplyController {
  constructor(private readonly applyService: ApplyService) {}
  @CustomApiOperation({
    summary: '서비스 신청',
    tags: ['apply'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @Post('/')
  async apply(@Body() body: CreateApplyDto): Promise<boolean> {
    await this.applyService.apply(body);
    return true;
  }
}
