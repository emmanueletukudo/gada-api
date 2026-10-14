import { KycStatus } from "src/users/dto/create-user.dto";
import { Wallet } from "src/wallet/entities/wallet.entity";

export class AuthResponseDto {
  accessToken!: string;
  user!: UserDto;
}

export class UserDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  hostName!: string;
  accountType!: string;
  isEmailVerified: boolean = false;
  kycStatus: KycStatus = KycStatus.PENDING;
  role!: string;
  wallet!: Wallet;
}
