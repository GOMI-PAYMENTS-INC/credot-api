import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import axios from 'axios';
import { customAlphabet } from 'nanoid';

import { SmsResponse } from './types';

@Injectable()
export class NhnCloudService {
  private readonly logger = new Logger(NhnCloudService.name);

  // SMS
  private readonly SMS_HOST = 'https://api-sms.cloud.toast.com';
  private SMS_SEND_NO: string;
  private SMS_APP_KEY: string;
  private SMS_SECRET_KEY: string;

  constructor(private readonly configService: ConfigService) {
    this.SMS_SEND_NO = this.configService.get('NHN_CLOUD_SMS_SEND_NO');
    this.SMS_APP_KEY = this.configService.get('NHN_CLOUD_SMS_APP_KEY');
    this.SMS_SECRET_KEY = this.configService.get('NHN_CLOUD_SMS_SECRET_KEY');
  }

  generateNumericToken(length: number): string {
    return customAlphabet('1234567890', length)();
  }

  generateStringToken(length: number): string {
    return customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', length)();
  }

  async sendSms(
    phoneNumber: string,
    body: string,
    title = '',
  ): Promise<SmsResponse> {
    const isMMs = body?.length > 60;
    const path = `/sms/v3.0/appKeys/${this.SMS_APP_KEY}/sender/${
      isMMs ? 'mms' : 'sms'
    }`;
    const url = this.SMS_HOST + path;

    const data = {
      ...(isMMs && { title }),
      body,
      sendNo: this.SMS_SEND_NO,
      recipientList: [
        {
          recipientNo: phoneNumber,
        },
      ],
    };

    try {
      const response = await axios.post<SmsResponse>(url, data, {
        headers: {
          'X-Secret-Key': this.SMS_SECRET_KEY,
        },
      });

      return response.data;
    } catch (err) {
      console.error(err);
      throw new RuntimeException('SMS 발송 실패');
    }
  }
}
