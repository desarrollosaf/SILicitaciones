import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateLicitacionDto {
  @IsString() @MinLength(1)
  periodId: string;

  @IsOptional() @IsUUID()
  dictamenId?: string | null;

  @IsOptional() @IsString()
  type?: string;

  @IsString() @MinLength(1)
  number: string;

  @IsString() @MinLength(1)
  object: string;

  @IsOptional() @IsString()
  area?: string;

  @IsOptional() @IsDateString()
  fallDate?: string;

  @IsOptional() @IsInt() @Min(1)
  deliveryDays?: number;

  @IsOptional() @IsIn(['business', 'calendar'])
  dayType?: 'business' | 'calendar';

  @IsOptional() @IsNumber() @Min(0)
  penaltyPct?: number;

  @IsOptional() @IsString()
  deliveryPlace?: string;
}

/** Todos los campos son opcionales al editar. */
export class UpdateLicitacionDto extends PartialType(CreateLicitacionDto) {}
