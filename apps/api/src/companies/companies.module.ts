import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { PublicCompaniesController } from './public-companies.controller';

@Module({
  providers: [CompaniesService],
  controllers: [CompaniesController, PublicCompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
