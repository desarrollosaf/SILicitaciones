import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PeopleService } from './people.service';
import { CreatePersonDto, UpdatePersonDto } from './person.dto';

@Controller('people')
export class PeopleController {
  constructor(private readonly service: PeopleService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search ?? '');
  }

  @Post()
  create(@Body() dto: CreatePersonDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
