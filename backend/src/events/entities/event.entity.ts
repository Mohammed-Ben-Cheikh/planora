import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectId,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventStatus } from '../../common/enums/event-status.enum';

@Entity('events')
export class Event {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  location: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ type: 'number' })
  capacity: number;

  @Column({ type: 'number', default: 0 })
  registeredCount: number;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'number', default: 0 })
  price: number;

  @Column()
  organizerId: string;

  @Column({ nullable: true })
  organizerName?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<Event>) {
    Object.assign(this, partial);
  }
}
