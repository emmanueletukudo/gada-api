import { Test, TestingModule } from '@nestjs/testing';
import { VirtualAccountController } from './virtual-account.controller';
import { VirtualAccountService } from './virtual-account.service';

describe('VirtualAccountController', () => {
  let controller: VirtualAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualAccountController],
      providers: [VirtualAccountService],
    }).compile();

    controller = module.get<VirtualAccountController>(VirtualAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
