import {
  Controller,
  All,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { NotificationsProxyService } from './notifications-proxy.service';

@ApiTags('notifications')
@Controller('api/notifications')
export class NotificationsProxyController {
  constructor(
    private readonly notificationsProxyService: NotificationsProxyService,
  ) {}

  @All('*path')
  async proxyToNotifications(@Req() req: Request, @Res() res: Response) {
    try {
      const response = await this.notificationsProxyService.forwardRequest(req);

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key !== 'transfer-encoding') {
          res.set(key, value as string);
        }
      });

      res.status(response.status).send(response.data);
    } catch (error) {
      console.error('Notifications proxy error:', error);

      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        throw new HttpException(
          'Notifications service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
  }
}
