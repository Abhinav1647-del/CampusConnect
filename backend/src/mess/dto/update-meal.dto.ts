import { PartialType } from '@nestjs/swagger';
import { CreateMealDto } from './create-meal.dto.js';

export class UpdateMealDto extends PartialType(CreateMealDto) {}
