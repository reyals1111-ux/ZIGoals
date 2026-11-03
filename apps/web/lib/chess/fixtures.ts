/**
 * Session AK (lane C): fixtures shaped like Lichess's documented answers, for the unit tests and the Playwright spec.
 * The daily puzzle is a real answer of https://lichess.org/api/puzzle/daily (2026-10-31; Lichess puzzles are CC0) with
 * the players' names replaced by fictional ones. Not imported by the app.
 */
export const DAILY_PUZZLE_FIXTURE = {
  game: {id: 'ZfIxHMa7', perf: {key: 'rapid', name: 'Rapid'}, rated: true, players: [{name: 'Fictional-White', id: 'fictional-white', color: 'white', rating: 1764}, {name: 'Fictional-Black', id: 'fictional-black', color: 'black', rating: 1977}],
    pgn: 'e4 c6 Nf3 d5 exd5 cxd5 d4 Nf6 Bd3 Nc6 c3 g6 h3 Bg7 Be3 O-O O-O Re8 Qd2 e5 dxe5 Nxe5 Nxe5 Rxe5 Bh6 Bh8 f4 Qb6+ Qf2 Qxf2+ Rxf2 Re1+ Rf1 Rxf1+ Kxf1 Ne4 Bg5 Nxg5 fxg5 d4 Ke2 Be6 Kd2 Rd8 cxd4 Bxd4 Nc3 a6 a3 Kg7 Rc1 h6 gxh6+ Kxh6 b4 Kg5 Rf1 b5 Ne4+ Kh6 Nc5', clock: '10+0'},
  puzzle: {id: '7i6QO', rating: 2150, plays: 82736, solution: ['d4c5', 'b4c5', 'd8d3', 'd2d3', 'e6c4', 'd3e3', 'c4f1'], themes: ['veryLong', 'endgame', 'crushing', 'sacrifice', 'discoveredAttack', 'skewer', 'attraction'],
    fen: '3r4/5p2/p3b1pk/1pN5/1P1b4/P2B3P/3K2P1/5R2 b - - 1 1', lastMove: 'e4c5', initialPly: 60},
} as const;
export const GAME_FULL_FIXTURE = (moves: string, over: Record<string, unknown> = {}) => ({
  type: 'gameFull', id: 'GaMe0001', rated: false, speed: 'rapid', variant: {key: 'standard', name: 'Standard'}, clock: {initial: 600000, increment: 0},
  white: {id: 'fictional-me', name: 'Fictional-Me', rating: 1500}, black: {id: 'fictional-rival', name: 'Fictional-Rival', rating: 1510}, initialFen: 'startpos',
  state: {type: 'gameState', moves, wtime: 600000, btime: 600000, winc: 0, binc: 0, status: 'started'}, ...over,
});
