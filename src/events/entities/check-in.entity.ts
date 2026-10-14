import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'event_check_ins' })
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Attendee, { nullable: false, onDelete: 'CASCADE' })
  attendee!: Attendee;

  @ManyToOne(() => User, { nullable: false })
  checkedInBy!: User;

  @CreateDateColumn()
  checkedInAt!: Date;
}
