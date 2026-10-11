import { EMPTY, type Cell, type Point } from './types';

/**
 * 불변 보드. 모든 변경은 새 인스턴스를 반환한다.
 * 칸은 cells[y * size + x]에 저장한다.
 */
export class Board {
  private constructor(
    readonly size: number,
    private readonly cells: Uint8Array,
  ) {}

  static empty(size: number): Board {
    if (!Number.isInteger(size) || size < 2 || size > 25) {
      throw new RangeError(`지원하지 않는 보드 크기: ${size}`);
    }
    return new Board(size, new Uint8Array(size * size));
  }

  inBounds({ x, y }: Point): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  get(p: Point): Cell {
    return this.cells[p.y * this.size + p.x] as Cell;
  }

  /** 지정한 칸들을 바꾼 새 보드를 반환한다. */
  with(changes: Iterable<[Point, Cell]>): Board {
    const next = this.cells.slice();
    for (const [p, cell] of changes) next[p.y * this.size + p.x] = cell;
    return new Board(this.size, next);
  }

  neighbors({ x, y }: Point): Point[] {
    const result: Point[] = [];
    if (x > 0) result.push({ x: x - 1, y });
    if (x < this.size - 1) result.push({ x: x + 1, y });
    if (y > 0) result.push({ x, y: y - 1 });
    if (y < this.size - 1) result.push({ x, y: y + 1 });
    return result;
  }

  equals(other: Board): boolean {
    if (other.size !== this.size) return false;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== other.cells[i]) return false;
    }
    return true;
  }

  *points(): Generator<Point> {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) yield { x, y };
    }
  }

  /** 같은 색(또는 빈 칸끼리) 연결된 덩어리와 그 이웃 빈 칸(활로)을 구한다. */
  group(start: Point): { points: Point[]; liberties: Point[] } {
    const color = this.get(start);
    const seen = new Set<number>([start.y * this.size + start.x]);
    const liberties = new Map<number, Point>();
    const points: Point[] = [];
    const stack: Point[] = [start];
    while (stack.length > 0) {
      const p = stack.pop() as Point;
      points.push(p);
      for (const n of this.neighbors(p)) {
        const key = n.y * this.size + n.x;
        const cell = this.get(n);
        if (cell === color) {
          if (!seen.has(key)) {
            seen.add(key);
            stack.push(n);
          }
        } else if (cell === EMPTY) {
          liberties.set(key, n);
        }
      }
    }
    return { points, liberties: [...liberties.values()] };
  }
}
