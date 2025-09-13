import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Request } from 'express';

@Injectable()
export class TasksProxyService {
  private readonly tasksServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.tasksServiceUrl =
      this.configService.get<string>('TASKS_SERVICE_URL') ||
      'http://localhost:3003';
  }

  async forwardRequest(req: Request) {
    // Remove /api/tasks e extrai apenas o path sem query params
    const fullPath = req.url.replace('/api/tasks', '');
    const [path] = fullPath.split('?');
    const url = `${this.tasksServiceUrl}/tasks${path}`;

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
