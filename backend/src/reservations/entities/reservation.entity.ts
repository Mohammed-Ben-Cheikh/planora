import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectId,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

@Entity('reservations')
export class Reservation {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  reservationNumber: string;

  @Column()
  eventId: string;

  @Column()
  eventTitle: string;

  @Column()
  eventDate: Date;

  @Column()
  eventLocation: string;

  @Column()
  userId: string;

  @Column()
  userEmail: string;

  @Column()
  userName: string;

  @Column({ type: 'number', default: 1 })
  numberOfTickets: number;

  @Column({ type: 'number', default: 0 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ nullable: true })
  cancelReason?: string;

  @Column({ nullable: true })
  canceledAt?: Date;

  @Column({ nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  checkedInAt?: Date;

  @Column({ nullable: true })
  ticketPdfUrl?: string;

  @Column({ nullable: true })
  qrCode?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<Reservation>) {
    Object.assign(this, partial);
  }
}
