import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreatePartidaDto {
  @IsUUID()
  licitacionId: string;

  @IsString() @MinLength(1)
  number: string;

  @IsOptional() @IsString()
  grupo?: string;

  @IsString() @MinLength(1)
  description: string;

  @IsOptional() @IsIn(['Adjudicada', 'Desierta', 'Pendiente'])
  result?: 'Adjudicada' | 'Desierta' | 'Pendiente';

  @IsInt() @Min(1)
  quantity: number;

  @IsOptional() @IsIn(['Pieza', 'Kit', 'Par', 'Combo', 'Servicio'])
  unit?: 'Pieza' | 'Kit' | 'Par' | 'Combo' | 'Servicio';

  @IsOptional() @IsString()
  warehouseId?: string;

  @IsOptional() @IsString()
  provider?: string;

  @IsOptional() @IsString()
  brand?: string;

  @IsOptional() @IsNumber() @Min(0)
  unitPrice?: number;

  @IsOptional() @IsDateString()
  fallDate?: string;

  @IsOptional() @IsString()
  contractNumber?: string;

  @IsOptional() @IsDateString()
  contractDate?: string;

  @IsOptional() @IsDateString()
  deliveryDate?: string;

  @IsOptional() @IsIn(['Pendiente', 'Entregada', 'No aplica'])
  performanceGuarantee?: 'Pendiente' | 'Entregada' | 'No aplica';

  @IsOptional() @IsIn(['Pendiente', 'Cumplimiento', 'Incumplimiento', 'No aplica'])
  complianceStatus?: 'Pendiente' | 'Cumplimiento' | 'Incumplimiento' | 'No aplica';

  @IsOptional() @IsString()
  warranty?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsArray()
  attachments?: string[];
}

/** Todos los campos son opcionales al editar. */
export class UpdatePartidaDto extends PartialType(CreatePartidaDto) {}
