import { Game } from './game';
import { parseSgf, serializeSgf, type SgfGame } from './sgf';

/** Replays an SGF record into a Game. Fails with the move number if a move is illegal. */
export function gameFromSgf(text: string): { game: Game; info: Record<string, string> } {
  const sgf: SgfGame = parseSgf(text);
  const game = new Game({ size: sgf.size, komi: sgf.komi, setup: sgf.setup });
  sgf.moves.forEach((m, i) => {
    if (m.point === null) {
      game.pass(m.color);
      return;
    }
    const r = game.play(m.point, m.color);
    if (!r.ok) throw new Error(`Move ${i + 1} is illegal (${r.reason}).`);
  });
  game.first();
  return { game, info: sgf.info };
}

export function sgfFromGame(game: Game, info: Record<string, string> = {}): string {
  return serializeSgf({
    size: game.size,
    komi: game.komi,
    info,
    setup: game.setup,
    moves: game.allMoves,
  });
}
