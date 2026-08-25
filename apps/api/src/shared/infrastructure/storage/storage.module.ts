import { Global, Module } from '@nestjs/common';
import { STORAGE_SERVICE } from '../../application/ports/storage.port';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  providers: [{ provide: STORAGE_SERVICE, useClass: LocalStorageService }],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
