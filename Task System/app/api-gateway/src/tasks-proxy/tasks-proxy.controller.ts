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
import { TasksProxyService } from './tasks-proxy.service';

@ApiTags('tasks')
@Controller('api/tasks')
export class TasksProxyController {
  constructor(private readonly tasksProxyService: TasksProxyService) {}

  @All('*')
  async proxyToTasks(@Req() req: Request, @Res() res: Response) {
    try {
      const response = await this.tasksProxyService.forwardRequest(req);

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key !== 'transfer-encoding') {
          res.set(key, value as string);
        }
      });

      res.status(response.status).send(response.data);
    } catch (error) {
      console.error('Tasks proxy error:', error);

      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        throw new HttpException(
          'Tasks service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
  }
}
