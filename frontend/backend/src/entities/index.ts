import { Period } from './period.entity';
import { Holiday } from './holiday.entity';
import { Warehouse } from './warehouse.entity';
import { Dictamen } from './dictamen.entity';
import { Licitacion } from './licitacion.entity';
import { Partida } from './partida.entity';
import { Person } from './person.entity';
import { Memo } from './memo.entity';
import { MemoAllocation } from './memo-allocation.entity';

export * from './period.entity';
export * from './holiday.entity';
export * from './warehouse.entity';
export * from './dictamen.entity';
export * from './licitacion.entity';
export * from './partida.entity';
export * from './person.entity';
export * from './memo.entity';
export * from './memo-allocation.entity';

export const entities = [Period, Holiday, Warehouse, Dictamen, Licitacion, Partida, Person, Memo, MemoAllocation];
