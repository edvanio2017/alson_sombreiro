import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { PasswordHasherPort } from '../application/ports/password-hasher.port';

@Injectable()
export class BcryptHasherService implements PasswordHasherPort {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.get<number>('bcryptRounds') ?? 10;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Palavra-passe temporária sem caracteres ambíguos (0/O, 1/l/I), para que
   * possa ser ditada ao telefone sem enganos.
   */
  generateTemporary(length = 12): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%';
    let password = '';
    for (let index = 0; index < length; index += 1) {
      password += alphabet[randomInt(0, alphabet.length)];
    }
    return password;
  }
}
