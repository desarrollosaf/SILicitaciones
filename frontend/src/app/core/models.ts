export type PeriodStatus = 'Abierto' | 'Cerrado' | 'Planeado';
export type PartidaResult = 'Adjudicada' | 'Desierta' | 'Pendiente';
export type PartidaUnit = 'Pieza' | 'Kit' | 'Par' | 'Combo' | 'Servicio';
export type MemoStatus = 'Borrador' | 'Enviado' | 'Atendido' | 'Entregado' | 'Cancelado';

export interface Period {
  id: string;
  year: number;
  status: PeriodStatus;
  startDate: string;
  endDate: string;
  openedDate: string | null;
  closedDate: string | null;
}

export interface Warehouse {
  id: string;
  name: string;
  description: string;
}

export interface Dictamen {
  id: string;
  periodId: string;
  folio: string;
  date: string;
  requester: string;
  area: string;
  object: string;
  estimatedAmount: number;
  procedureType: string;
  status: string;
  fileName: string;
}

export interface Licitacion {
  id: string;
  periodId: string;
  dictamenId: string | null;
  type: string;
  number: string;
  object: string;
  area: string;
  fallDate: string | null;
  deliveryDays: number;
  dayType: 'business' | 'calendar';
  penaltyPct: number;
  deliveryPlace: string;
  partidasCount?: number;
  awardedCount?: number;
  awardedAmount?: number;
}

export interface DeliveryState {
  label: string;
  tone: 'gray' | 'green' | 'amber' | 'red' | 'blue';
  rank: number;
}

export interface Partida {
  id: string;
  licitacionId: string;
  number: string;
  grupo: string;
  description: string;
  result: PartidaResult;
  quantity: number;
  unit: PartidaUnit;
  warehouseId: string | null;
  provider: string;
  brand: string;
  unitPrice: number;
  fallDate: string | null;
  contractNumber: string;
  contractDate: string | null;
  deliveryDate: string | null;
  performanceGuarantee: 'Pendiente' | 'Entregada' | 'No aplica';
  complianceStatus: 'Pendiente' | 'Cumplimiento' | 'Incumplimiento' | 'No aplica';
  warranty: string;
  notes: string;
  attachments: string[];
  procedureNumber: string;
  warehouseName: string;
  dueDate: string;
  delivery: DeliveryState;
  committed: number;
  available: number;
  subtotal: number;
  total: number;
  /** Vacío cuando la partida sí puede incluirse en un memorándum. */
  blockedReason: string;
}

export interface Person {
  id: string;
  name: string;
  dependencyCode: string;
  area: string;
  assignedCount?: number;
}

export interface MemoAllocation {
  id?: string;
  partidaId: string;
  personId: string;
  quantity: number;
  partida?: Partida;
  person?: Person;
}

export interface Memo {
  id: string;
  periodId: string;
  licitacionId: string | null;
  folio: string;
  date: string;
  recipient: string;
  subject: string;
  status: MemoStatus;
  allocations: MemoAllocation[];
  licitacion?: Licitacion;
  partidasCount: number;
  quantity: number;
}

export interface Alert {
  priority: 2 | 3;
  ref: string;
  partidaId: string;
  issue: string;
  action: string;
}

export interface DashboardSummary {
  awardedCount: number;
  desertCount: number;
  units: number;
  assigned: number;
  pending: number;
  delivered: number;
  overdue: number;
  amount: number;
  progress: { partidaId: string; description: string; number: string; procedure: string; assigned: number; total: number; pct: number }[];
  priority: Partida[];
  providers: { name: string; count: number }[];
}

export interface WarehouseBalance {
  summary: (Warehouse & { partidas: number; received: number; available: number })[];
  rows: {
    partidaId: string; number: string; description: string; brand: string; procedure: string;
    procedureType: string; warehouse: string; quantity: number; committed: number; available: number;
  }[];
}

export interface ImportResult {
  created: number;
  updated: number;
  rejected: number;
  notes: string[];
}
