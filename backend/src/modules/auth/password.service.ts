import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Wraps the password hashing primitive.
 *
 * Isolating it here means the choice of algorithm is one file's concern -
 * moving to argon2id later touches nothing else - and it keeps AuthService
 * unit-testable, since bcrypt is a native module whose exports cannot be
 * spied on directly.
 */
@Injectable()
export class PasswordService {
  /**
   * A hash of a throwaway value, used to equalise the cost of verifying a
   * login against a non-existent account. Computed once at construction
   * rather than per request.
   */
  private readonly timingEqualiserHash = bcrypt.hashSync(
    'timing-equaliser',
    BCRYPT_ROUNDS,
  );

  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  }

  compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Verifies against a real hash when one exists, and against a dummy hash
   * when it does not, so both paths cost one bcrypt verification. Without
   * this, "unknown email" returns measurably faster than "wrong password"
   * and login becomes a user-enumeration oracle.
   */
  compareWithTimingEqualisation(
    plaintext: string,
    hash: string | undefined,
  ): Promise<boolean> {
    return this.compare(plaintext, hash ?? this.timingEqualiserHash);
  }
}
