import { PrefundService, SearchDetailItemDto2 } from '@app/domain/prefund';
import { UserDto } from '@app/domain/user';
import { CustomApiOperation } from '@app/utils/decorators';

import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

@Controller('v2/prefund')
export class PrefundV2Controller {
  constructor(private readonly prefundService: PrefundService) {}

  @CustomApiOperation({
    summary: '선정산금 기간 상세',
    tags: ['prefund'],
  })
  @ApiOkResponse({
    type: SearchDetailItemDto2,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('/search/details')
  async searchDetailsV2(
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
    @Request() req: { user: UserDto },
  ): Promise<SearchDetailItemDto2[]> {
    return this.prefundService.searchDetails2({
      startAt,
      endAt,
      userId: req.user.id,
    });
  }
}
