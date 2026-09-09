import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class MemoAllocationDto {
  @IsUUID()
  partidaId: string;

  @IsUUID()
  personId: string;

  @IsInt() @Min(1)
  quantity: number;
}

export class CreateMemoDto {
  @IsString()
  periodId: string;

  @IsUUID()
  licitacionId: string;

  @IsOptional() @IsString()
  folio?: string;

  @IsDateString()
  date: string;

  @IsOptional() @IsString()
  recipient?: string;

  @IsOptional() @IsIn(['Borrador', 'Enviado', 'Atendido', 'Entregado', 'Cancelado'])
  status?: 'Borrador' | 'Enviado' | 'Atendido' | 'Entregado' | 'Cancelado';

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => MemoAllocationDto)
  allocations: MemoAllocationDto[];
}

/** Todos los campos son opcionales al editar. */
export class UpdateMemoDto extends PartialType(CreateMemoDto) {}
