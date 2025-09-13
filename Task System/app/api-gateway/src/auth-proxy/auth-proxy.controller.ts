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
import { AuthProxyService } from './auth-proxy.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthProxyController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @All('*')
  async proxyToAuth(@Req() req: Request, @Res() res: Response) {
    try {
      const response = await this.authProxyService.forwardRequest(req);

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key !== 'transfer-encoding') {
          res.set(key, value as string);
        }
      });

      res.status(response.status).send(response.data);
    } catch (error) {
      console.error('Auth proxy error:', error);

      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        throw new HttpException(
          'Auth service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
  }
}
