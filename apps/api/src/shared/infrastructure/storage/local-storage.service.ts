import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { slugify } from '@alson/shared';
import type { FileToStore, StoragePort, StoredFile } from '../../application/ports/storage.port';

/**
 * Adaptador de armazenamento em disco local.
 *
 * Trocar por S3/Azure Blob implica apenas escrever outro adaptador que
 * implemente `StoragePort` e alterar o provider em `StorageModule`.
 */
@Injectable()
export class LocalStorageService implements StoragePort {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;

  constructor(private readonly config: ConfigService) {
    this.root = resolve(this.config.get<string>('storage.localPath') ?? './storage/uploads');
  }

  async save(file: FileToStore, folder: string): Promise<StoredFile> {
    const safeFolder = slugify(folder) || 'geral';
    const directory = join(this.root, safeFolder);
    await mkdir(directory, { recursive: true });

    // Nome no disco desligado do nome original: evita colisões e path traversal.
    const extension = extname(file.originalName).toLowerCase().slice(0, 12);
    const storedName = `${randomUUID()}${extension}`;
    const relativePath = join(safeFolder, storedName);

    await writeFile(join(this.root, relativePath), file.buffer);

    return {
      storedName,
      path: relativePath,
      size: file.buffer.byteLength,
      checksum: createHash('sha256').update(file.buffer).digest('hex'),
    };
  }

  async read(path: string): Promise<Buffer> {
    return readFile(this.resolveSafe(path));
  }

  async remove(path: string): Promise<void> {
    try {
      await unlink(this.resolveSafe(path));
    } catch (error) {
      this.logger.warn(`Não foi possível remover o ficheiro "${path}": ${String(error)}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      return existsSync(this.resolveSafe(path));
    } catch {
      return false;
    }
  }

  /** Impede que um caminho manipulado escape da pasta de uploads. */
  private resolveSafe(path: string): string {
    const target = resolve(this.root, normalize(path).replace(/^(\.\.(\/|\\|$))+/, ''));
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error('Caminho de ficheiro fora do directório de armazenamento.');
    }
    return target;
  }
}
