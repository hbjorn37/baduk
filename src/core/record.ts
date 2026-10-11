import { SgfError } from './errors';
import { Game } from './game';
import { parseSgf, serializeSgf, type SgfGame } from './sgf';
import type { MoveNode } from './types';

/**
 * Replays an SGF record, including its variations, into a Game. An illegal move on the main
 * line fails with its move number; a variation is cut off at its first illegal move.
 */
export function gameFromSgf(text: string): { game: Game; info: Record<string, string> } {
  const sgf: SgfGame = parseSgf(text);
  const game = new Game({ size: sgf.size, komi: sgf.komi, setup: sgf.setup });
  game.comment = sgf.root.comment;

  // Depth-first walk that mirrors the tree with the game cursor.
  interface Frame {
    node: MoveNode;
    next: number;
    main: boolean;
  }
  const stack: Frame[] = [{ node: sgf.root, next: 0, main: true }];
  for (let frame = stack[stack.length - 1]; frame; frame = stack[stack.length - 1]) {
    const child = frame.node.children[frame.next];
    if (!child) {
      stack.pop();
      if (stack.length > 0) game.back();
      continue;
    }
    const main = frame.main && frame.next === 0;
    frame.next += 1;
    const move = child.move as NonNullable<MoveNode['move']>;
    if (move.point === null) {
      game.pass(move.color);
    } else {
      const r = game.play(move.point, move.color);
      if (!r.ok) {
        if (!main) continue; // cut the variation here
        throw new SgfError('illegal-move', `Move ${stack.length} is illegal (${r.reason}).`, {
          n: stack.length,
          reason: r.reason,
        });
      }
    }
    game.comment = child.comment;
    stack.push({ node: child, next: 0, main });
  }
  game.resetToMainLine();
  return { game, info: sgf.info };
}

export function sgfFromGame(game: Game, info: Record<string, string> = {}): string {
  return serializeSgf({
    size: game.size,
    komi: game.komi,
    info,
    setup: game.setup,
    root: game.toTree(),
  });
}
