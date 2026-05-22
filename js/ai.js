class BattleshipAI {
  constructor(board) {
    this.board = board;
    this.huntQueue = [];
    this.tried = new Set();
  }

  reset() {
    this.huntQueue = [];
    this.tried = new Set();
  }

  key(row, col) {
    return `${row},${col}`;
  }

  neighbors(row, col) {
    return [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ].filter(
      (c) =>
        c.row >= 0 &&
        c.row < BOARD_SIZE &&
        c.col >= 0 &&
        c.col < BOARD_SIZE
    );
  }

  enqueueHunt(row, col) {
    for (const n of this.neighbors(row, col)) {
      const k = this.key(n.row, n.col);
      if (!this.tried.has(k) && !this.board.shots.has(k)) {
        const exists = this.huntQueue.some(
          (q) => q.row === n.row && q.col === n.col
        );
        if (!exists) this.huntQueue.push(n);
      }
    }
  }

  pickRandom() {
    const available = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const k = this.key(r, c);
        if (!this.tried.has(k) && !this.board.shots.has(k)) {
          available.push({ row: r, col: c });
        }
      }
    }
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  fire() {
    let target = null;

    while (this.huntQueue.length > 0 && !target) {
      const next = this.huntQueue.shift();
      const k = this.key(next.row, next.col);
      if (!this.tried.has(k) && !this.board.shots.has(k)) {
        target = next;
      }
    }

    if (!target) {
      target = this.pickRandom();
    }

    if (!target) return null;

    this.tried.add(this.key(target.row, target.col));
    const result = this.board.receiveShot(target.row, target.col);

    if (result?.hit && !result.sunk) {
      this.enqueueHunt(target.row, target.col);
    }

    if (result?.sunk) {
      this.huntQueue = [];
    }

    return { row: target.row, col: target.col, ...result };
  }
}
