import { CrawlingService } from '@app/domain/crawling';
import { CrawlingInfoDto } from '@app/domain/crawling/dtos/crawling-info.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserService,
} from '@app/domain/user';
import { CustomApiOperation, Roles } from '@app/utils/decorators';
import { RolesGuard } from '@app/utils/guards';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly crawlingService: CrawlingService,
  ) {}

  @CustomApiOperation({
    summary: '유저 목록 추출',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: UserDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/list')
  async getUsers(@Query('userId') userId: string | null): Promise<UserDto[]> {
    return await this.userService.getActiveUsers(userId);
  }

  @CustomApiOperation({
    summary: '유저 추출',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: UserDto,
    isArray: false,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/:memberId')
  async getUser(
    @Param('memberId', ParseIntPipe) memberId: number,
  ): Promise<UserDto> {
    return await this.userService.getUser(memberId);
  }

  @CustomApiOperation({
    summary: '유저 크롤링 정보 추출',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: CrawlingInfoDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/crawlingInfo/:memberId')
  async getCrawlingInfo(
    @Param('memberId', ParseIntPipe) memberId: number,
  ): Promise<CrawlingInfoDto[]> {
    return await this.crawlingService.findCrawlingInfosByUserId(memberId);
  }

  @CustomApiOperation({
    summary: '유저 크롤링 정보 가맹점 삭제',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: CrawlingInfoDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/crawlingInfo/:id')
  async deleteCrawlingFranchiseInfo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<boolean> {
    return await this.crawlingService.deleteCrawlingFranchise(id);
  }

  @CustomApiOperation({
    summary: '유저 생성',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/')
  async createUser(@Body() data: CreateUserDto): Promise<boolean> {
    await this.userService.create(data);
    return true;
  }

  @CustomApiOperation({
    summary: '유저 생성',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put('/')
  async updateUser(@Body() data: UpdateUserDto): Promise<boolean> {
    await this.userService.update(data);
    return true;
  }

  @CustomApiOperation({
    summary: '유저 삭제',
    tags: ['user'],
  })
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/:memberId')
  async deleteUser(
    @Param('memberId', ParseIntPipe) memberId: number,
  ): Promise<boolean> {
    await this.userService.deleteById(memberId);
    return true;
  }
}
