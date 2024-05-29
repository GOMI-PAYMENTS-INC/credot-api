import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auth, google } from 'googleapis';

@Injectable()
export class GoogleClientService {
  constructor(private readonly configService: ConfigService) {}
  getClient({
    refreshToken,
  }: {
    refreshToken: string;
  }): Auth.OAuth2Client | null {
    try {
      return google.auth.fromJSON({
        type: 'authorized_user',
        client_id: this.configService.get('GOOGLE_CLIENT_ID'),
        client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
        refresh_token: refreshToken,
      }) as Auth.OAuth2Client;
    } catch (err) {
      return null;
    }
  }
}
