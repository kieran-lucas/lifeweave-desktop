// Seeded deterministic PRNG for prototype simulation (xorshift32).
// Never used in production code.

export class Prng {
  private s: number;

  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }

  next(): number {
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    return this.s >>> 0;
  }

  float(): number {
    return this.next() / 0x100000000;
  }

  int(max: number): number {
    if (max <= 0) return 0;
    return this.next() % max;
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)]!;
  }
}
