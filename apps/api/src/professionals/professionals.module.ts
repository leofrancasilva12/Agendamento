import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { PublicProfessionalsController } from './public-professionals.controller';

@Module({
  providers: [ProfessionalsService],
  controllers: [ProfessionalsController, PublicProfessionalsController],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
