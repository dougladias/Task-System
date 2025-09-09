import { Exclude, Transform } from 'class-transformer';

export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  isActive: boolean;

  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  @Transform(({ value }) => value.toISOString())
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
