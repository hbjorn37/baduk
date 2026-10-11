import { Game } from './game';
import { parseSgf, serializeSgf, type SgfGame } from './sgf';

/** SGF 기록을 재생해 Game을 만든다. 불법 수가 있으면 몇 번째 수인지 알려 주며 실패한다. */
export function gameFromSgf(text: string): { game: Game; info: Record<string, string> } {
  const sgf: SgfGame = parseSgf(text);
  const game = new Game({ size: sgf.size, komi: sgf.komi, setup: sgf.setup });
  sgf.moves.forEach((m, i) => {
    if (m.point === null) {
      game.pass(m.color);
      return;
    }
    const r = game.play(m.point, m.color);
    if (!r.ok) throw new Error(`${i + 1}번째 수가 규칙에 맞지 않습니다 (${r.reason}).`);
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
