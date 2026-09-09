import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { DictamenStatus } from '../../entities/dictamen.entity';

const STATUSES: DictamenStatus[] = ['En elaboración', 'Emitido', 'Enviado a DRM', 'Procedimiento iniciado', 'Concluido'];

export class CreateDictamenDto {
  @IsString() @MinLength(1)
  periodId: string;

  @IsOptional() @IsString()
  folio?: string;

  @IsDateString()
  date: string;

  @IsString() @MinLength(1)
  requester: string;

  @IsString() @MinLength(1)
  area: string;

  @IsString() @MinLength(1)
  object: string;

  @IsOptional() @IsNumber() @Min(0)
  estimatedAmount?: number;

  @IsOptional() @IsString()
  procedureType?: string;

  @IsOptional() @IsIn(STATUSES)
  status?: DictamenStatus;

  @IsOptional() @IsString()
  fileName?: string;
}

/** Todos los campos son opcionales al editar. */
export class UpdateDictamenDto extends PartialType(CreateDictamenDto) {}
