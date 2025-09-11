import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email: createUserDto.email }, { username: createUserDto.username }],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    const cacheKey = 'users:all';

    // Verificar cache primeiro
    try {
      const cachedUsers = await this.cacheManager.get(cacheKey);
      if (cachedUsers && Array.isArray(cachedUsers)) {
        return cachedUsers as User[];
      }
    } catch (error) {
      // Se houver erro no cache, continuar sem ele
      console.warn('Cache error in findAll:', error);
    }

    const users = await this.userRepository.find({
      select: ['id', 'email', 'username', 'isActive', 'createdAt', 'updatedAt'],
      order: {
        createdAt: 'DESC',
      },
    });

    // Cachear por 5 minutos
    try {
      await this.cacheManager.set(cacheKey, users, 5 * 60 * 1000);
    } catch (error) {
      // Se houver erro ao cachear, continuar sem ele
      console.warn('Cache error in findAll set:', error);
    }

    return users;
  }

  async findOne(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Verificar cache primeiro
    try {
      const cachedUser = await this.cacheManager.get(cacheKey);
      if (cachedUser && typeof cachedUser === 'object') {
        return cachedUser as User;
      }
    } catch (error) {
      // Se houver erro no cache, continuar sem ele
      console.warn('Cache error in findOne:', error);
    }

    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'username', 'isActive', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Cachear por 10 minutos
    try {
      await this.cacheManager.set(cacheKey, user, 10 * 60 * 1000);
    } catch (error) {
      // Se houver erro ao cachear, continuar sem ele
      console.warn('Cache error in findOne set:', error);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      const saltRounds = 12;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    await this.userRepository.update(id, updateUserDto);

    // Invalidar cache do usuário e lista de usuários
    try {
      await this.cacheManager.del(`user:${id}`);
      await this.cacheManager.del('users:all');
    } catch (error) {
      console.warn('Cache error in update:', error);
    }

    return this.findOne(id);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.userRepository.find({
      where: { id: In(ids) },
      select: ['id', 'email', 'username', 'isActive', 'createdAt', 'updatedAt'],
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);

    // Invalidar cache do usuário e lista de usuários
    try {
      await this.cacheManager.del(`user:${id}`);
      await this.cacheManager.del('users:all');
    } catch (error) {
      console.warn('Cache error in remove:', error);
    }
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async setCurrentRefreshToken(hashedToken: string, userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      // Note: currentHashedRefreshToken field needs to be added to User entity if needed
    });
  }
}
