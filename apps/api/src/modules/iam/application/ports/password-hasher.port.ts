export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
  /** Gera uma palavra-passe temporária legível para convites. */
  generateTemporary(length?: number): string;
}
