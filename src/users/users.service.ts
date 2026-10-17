import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    return await this.dataSource.transaction(async (manager) => {
      const passwordHash = await bcrypt.hash(dto.password as string, 10);

      const user = manager.create(User, {
        ...dto,
        passwordHash,
      });
      const savedUser = await manager.save(user);

      const wallet = manager.create(Wallet, {
        user: savedUser,
        balance: '0',
      });
      await manager.save(wallet);

      return savedUser;
    });
  }


  async updateUserProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    await this.usersRepo.update(userId, {
      ...(dto.firstName && { firstName: dto.firstName.trim() }),
      ...(dto.lastName && { lastName: dto.lastName.trim() }),
      ...(dto.hostName && { hostName: dto.hostName.trim() }),
      ...(dto.phone && { phone: dto.phone.trim() }),
    });


    const updatedUser = await this.usersRepo.findOne({ where: { id: userId } });

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    const { passwordHash, ...safeUser } = updatedUser;

    return safeUser;
  }

  findAll() {
    return this.usersRepo.find();
  }

  findOne(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.usersRepo.update({ id }, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.usersRepo.delete({ id });
  }
}
