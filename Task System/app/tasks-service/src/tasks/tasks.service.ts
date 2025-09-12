import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  async create(dto: CreateTaskDto): Promise<Task> {
    const task = this.repo.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    return this.repo.save(task);
  }

  async findAll(): Promise<Task[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Task | null> {
    return this.repo.findOneBy({ id });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task | null> {
    const task = await this.repo.findOneBy({ id });
    if (!task) return null;
    const updated = Object.assign(task, dto);
    if (dto.dueDate) (updated.dueDate as any) = new Date(dto.dueDate as any);
    return this.repo.save(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
