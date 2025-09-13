import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Request } from 'express';

@Injectable()
export class NotificationsProxyService {
  private readonly notificationsServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.notificationsServiceUrl =
      this.configService.get<string>('NOTIFICATIONS_SERVICE_URL') ||
      'http://localhost:3004';
  }

  async forwardRequest(req: Request) {
    const path = req.url.replace('/api/notifications', '');
    const url = `${this.notificationsServiceUrl}/notifications${path}`;

    const config = {
      method: req.method,
      url,
      headers: { ...req.headers, host: undefined },
      data: req.body as unknown,
      params: req.query as Record<string, string>,
    };

    return await axios(config);
  }
}
