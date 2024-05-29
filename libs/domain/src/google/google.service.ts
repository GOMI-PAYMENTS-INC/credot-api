import { RequestTokenDto } from '@app/domain/google/dtos';
import { PrismaService } from '@app/utils/prisma';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async requestToken(data: RequestTokenDto): Promise<void> {
    try {
      const { data: responseData } = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code: data.code,
          client_id: this.configService.get('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
          redirect_uri: this.configService.get('GOOGLE_REDIRECT_URL'),
          grant_type: 'authorization_code',
        },
      );

      await this.prisma.auth.create({
        data: {
          token: responseData['access_token'],
          refreshToken: responseData['refresh_token'],
          type: 'GOOGLE',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  async validGoogleAuth(): Promise<boolean> {
    const tokenInfo = await this.prisma.auth.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tokenInfo?.status === 'ACTIVE';
  }
}
