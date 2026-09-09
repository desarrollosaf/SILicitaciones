import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Memo } from './memo.entity';
import { Partida } from './partida.entity';
import { Person } from './person.entity';

/** Renglón del memorándum: qué partida, para quién y cuántas piezas. */
@Entity('memo_allocations')
export class MemoAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  memoId: string;

  @ManyToOne(() => Memo, (memo) => memo.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memoId' })
  memo: Memo;

  @Column({ type: 'uuid' })
  partidaId: string;

  @ManyToOne(() => Partida, (partida) => partida.allocations, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'partidaId' })
  partida: Partida;

  @Column({ type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
