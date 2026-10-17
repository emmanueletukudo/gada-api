import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { User } from '../../users/entities/user.entity';

export enum CheckInMode {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity({ name: 'event_check_ins' })
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Attendee, { nullable: false, onDelete: 'CASCADE' })
  attendee!: Attendee;

  @ManyToOne(() => User, { nullable: false })
  checkedInBy!: User;

  @Column({
    type: 'enum',
    enum: CheckInMode,
    default: CheckInMode.IN,
  })
  mode!: CheckInMode;
  
  @CreateDateColumn()
  checkedInAt!: Date;
}
