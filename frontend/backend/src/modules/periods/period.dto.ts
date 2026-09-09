import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreatePeriodDto {
  @IsInt() @Min(2020) @Max(2100)
  year: number;

  @IsIn(['Abierto', 'Planeado'])
  status: 'Abierto' | 'Planeado';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdatePeriodDto {
  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsIn(['Abierto', 'Cerrado', 'Planeado'])
  status?: 'Abierto' | 'Cerrado' | 'Planeado';
}
