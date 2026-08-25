/** Porta de armazenamento de ficheiros. A camada de aplicação depende apenas disto. */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StoredFile {
  storedName: string;
  path: string;
  size: number;
  checksum: string;
}

export interface FileToStore {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface StoragePort {
  /** Guarda um ficheiro sob uma pasta lógica (ex.: a referência do pedido). */
  save(file: FileToStore, folder: string): Promise<StoredFile>;
  /** Lê o conteúdo de um ficheiro previamente guardado. */
  read(path: string): Promise<Buffer>;
  /** Remove um ficheiro. Não falha se já não existir. */
  remove(path: string): Promise<void>;
  /** Verifica a existência de um ficheiro. */
  exists(path: string): Promise<boolean>;
}
