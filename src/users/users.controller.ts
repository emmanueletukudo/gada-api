import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { R2Service } from '../media/r2.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly r2Service: R2Service,
  ) {}

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User authentication context missing');
    }

    return this.usersService.updateUserProfile(userId, dto);
  }

  @Post('profile/logo-presign')
  @UseGuards(JwtAuthGuard)
  async getLogoPresignedUrl(@Body('contentType') contentType: string) {
    return await this.r2Service.getPresignedUploadUrl(contentType);
  }

  @Patch('profile/logo')
  @UseGuards(JwtAuthGuard)
  async updateLogoUrl(@Req() req: any, @Body('logoUrl') logoUrl: string) {
    const userId = req.user.id;
    await this.usersService.updateLogoUrl(userId, logoUrl);
    return { success: true, logoUrl };
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
