import { Exclude, Transform } from 'class-transformer';

export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  isActive: boolean;

  @Transform(({ value }) => (value as Date).toISOString())
  createdAt: Date;

  @Transform(({ value }) => (value as Date).toISOString())
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
