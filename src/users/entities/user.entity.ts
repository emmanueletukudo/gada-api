import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { KycStatus } from '../dto/create-user.dto';
import { UserRole } from './user-role.enum';
import { AccountType } from './account-type.enum';
import { AuthProvider } from './auth-provider-enum';



@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  hostName!: string;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.INDIVIDUAL })
  accountType!: AccountType;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider!: AuthProvider;
  
  @Column()
  kycStatus: KycStatus = KycStatus.PENDING;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ATTENDEE })
  role!: UserRole;

  @Column({nullable: true})
  passwordHash?: string;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet!: Wallet;
}

