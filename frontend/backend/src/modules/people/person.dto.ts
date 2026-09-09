import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePersonDto {
  @IsString() @MinLength(3)
  name: string;

  @IsString() @MinLength(1)
  dependencyCode: string;

  @IsOptional() @IsString()
  area?: string;
}

/** Todos los campos son opcionales al editar. */
export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
