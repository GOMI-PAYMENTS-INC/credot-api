import { GoogleClientService } from '@app/utils/google/google-client.service';

import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

export type GmailMessage = {
  id: string;
  snippet: string;
  date: Date;
};
@Injectable()
export class GoogleGmailService {
  constructor(private readonly googleClientService: GoogleClientService) {}

  async getRecentMessage({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<GmailMessage> {
    const client = this.googleClientService.getClient({ refreshToken });
    if (!client) {
      throw new Error('구글 클라이언트를 불러올 수 없습니다.');
    }

    const gmail = google.gmail({ version: 'v1', auth: client });
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
    });

    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messagesResponse.data?.messages?.[0]?.id,
    });

    const data = messageResponse?.data;
    return {
      id: data.id,
      snippet: data.snippet,
      date: new Date(Number(data.internalDate)),
    };
  }
}
