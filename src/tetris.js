// Tetris vive únicamente durante la tarea distractora.
// stop() elimina el teclado y la animación y devuelve los resultados.
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
};
const COLORS = { I:'#55b9d2', J:'#5476cf', L:'#e6a24f', O:'#e4c44f', S:'#56ad82', T:'#a97ac8', Z:'#d97171' };
const ROWS = 20;
const COLS = 10;
const CELL = 26;

export const tetrisHtml = `
  <section class="tetris-layout">
    <div class="tetris-board">
      <canvas id="tetris-canvas" width="260" height="520" aria-label="Tablero de Tetris"></canvas>
      <div id="tetris-overlay" class="tetris-overlay" hidden>
        <p>Fin de la partida</p>
        <button type="button" id="play-again" class="primary-button">Volver a jugar<span>Play Again</span></button>
        <small>El contador de líneas comienza de nuevo en cada partida.</small>
      </div>
    </div>
    <aside class="tetris-panel">
      <h1>Tetris</h1>
      <div class="score-box"><span>Líneas completas</span><strong id="tetris-lines">0</strong></div>
      <div class="tetris-controls"><p><kbd>←</kbd> <kbd>→</kbd> Mover</p><p><kbd>↑</kbd> Girar</p><p><kbd>↓</kbd> Bajar</p><p><kbd>Espacio</kbd> Caída rápida</p></div>
      <p class="field-hint">Si pierdes, pulsa «Volver a jugar». El juego finalizará automáticamente.</p>
    </aside>
  </section>`;

export function startTetris(root, duration) {
  const canvas = root.querySelector('#tetris-canvas');
  const context = canvas.getContext('2d');
  const overlay = root.querySelector('#tetris-overlay');
  const restartButton = root.querySelector('#play-again');
  const startTime = performance.now();
  const endTime = startTime + duration;
  let board, piece, bag = [], gameOver = false, stopped = false;
  let animation, previousFrame = startTime, fallTime = 0, activeSince = startTime;
  const stats = { lines: 0, game_lines: 0, best_game_lines: 0, games_started: 0, game_overs: 0, key_actions: 0, active_ms: 0 };

  function updateLines(cleared = 0) {
    stats.lines += cleared; // Acumulado solo para el registro de resultados.
    stats.game_lines += cleared;
    stats.best_game_lines = Math.max(stats.best_game_lines, stats.game_lines);
    root.querySelector('#tetris-lines').textContent = stats.game_lines;
  }

  function nextPiece() {
    if (!bag.length) {
      bag = Object.keys(SHAPES);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    const name = bag.pop();
    piece = { name, matrix: SHAPES[name], row: -1, col: 3 };
    if (!valid(piece.matrix, piece.row, piece.col)) endGame();
  }

  function valid(matrix, row, col) {
    return matrix.every((cells, y) => cells.every((filled, x) => !filled ||
      (col + x >= 0 && col + x < COLS && row + y < ROWS &&
        (row + y < 0 || !board[row + y][col + x]))));
  }

  function endGame() {
    gameOver = true;
    stats.game_overs++;
    stats.active_ms += performance.now() - activeSince;
    overlay.hidden = false;
    restartButton.focus();
  }

  function placePiece() {
    // Una pieza que no cabe por arriba termina la partida.
    if (piece.matrix.some((cells, y) => cells.some(filled => filled && piece.row + y < 0))) {
      endGame();
      return;
    }
    piece.matrix.forEach((cells, y) => cells.forEach((filled, x) => {
      if (filled) board[piece.row + y][piece.col + x] = piece.name;
    }));
    const remaining = board.filter(row => row.some(cell => !cell));
    const cleared = ROWS - remaining.length;
    while (remaining.length < ROWS) remaining.unshift(Array(COLS).fill(null));
    board = remaining;
    updateLines(cleared);
    nextPiece();
  }

  function stepDown() {
    if (valid(piece.matrix, piece.row + 1, piece.col)) {
      piece.row++;
    } else {
      placePiece();
    }
    fallTime = 0;
  }

  function startGame() {
    if (stopped || performance.now() >= endTime) return;
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    bag = [];
    stats.game_lines = 0;
    updateLines();
    gameOver = false;
    fallTime = 0;
    activeSince = performance.now();
    stats.games_started++;
    overlay.hidden = true;
    restartButton.blur();
    nextPiece();
  }

  function onKey(event) {
    if (stopped || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
    event.preventDefault();
    if (gameOver || performance.now() >= endTime) return;
    stats.key_actions++;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const col = piece.col + (event.key === 'ArrowLeft' ? -1 : 1);
      if (valid(piece.matrix, piece.row, col)) piece.col = col;
    } else if (event.key === 'ArrowUp') {
      const rotated = piece.matrix[0].map((_, x) => piece.matrix.map(row => row[x]).reverse());
      // Pequeño ajuste junto a una pared para que girar sea más cómodo.
      for (const offset of [0, -1, 1, -2, 2]) {
        if (valid(rotated, piece.row, piece.col + offset)) {
          piece.matrix = rotated;
          piece.col += offset;
          break;
        }
      }
    } else if (event.key === 'ArrowDown') {
      stepDown();
    } else if (!event.repeat) {
      while (valid(piece.matrix, piece.row + 1, piece.col)) piece.row++;
      placePiece();
      fallTime = 0;
    }
  }

  function drawCell(x, y, name) {
    if (y < 0) return;
    context.fillStyle = COLORS[name];
    context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }

  function frame(now) {
    if (stopped) return;
    if (!gameOver && now < endTime) {
      fallTime += Math.min(now - previousFrame, 100);
      if (fallTime >= 580) stepDown();
    }
    previousFrame = now;
    context.fillStyle = '#142a26';
    context.fillRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => row.forEach((name, x) => { if (name) drawCell(x, y, name); }));
    if (!gameOver) piece.matrix.forEach((row, y) => row.forEach((filled, x) => {
      if (filled) drawCell(piece.col + x, piece.row + y, piece.name);
    }));
    animation = requestAnimationFrame(frame);
  }

  startGame();
  document.addEventListener('keydown', onKey);
  restartButton.addEventListener('click', startGame);
  animation = requestAnimationFrame(frame);

  return {
    stop() {
      if (!stopped && !gameOver) stats.active_ms += performance.now() - activeSince;
      stopped = true;
      cancelAnimationFrame(animation);
      document.removeEventListener('keydown', onKey);
      restartButton.removeEventListener('click', startGame);
      return { ...stats, active_ms: Math.round(stats.active_ms), duration_ms: Math.round(performance.now() - startTime) };
    },
  };
}
