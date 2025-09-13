import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Request } from 'express';

@Injectable()
export class AuthProxyService {
  private readonly authServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      'http://localhost:3002';
  }

  async forwardRequest(req: Request) {
    const path = req.url.replace('/api/auth', '');
    const url = `${this.authServiceUrl}/auth${path}`;

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
