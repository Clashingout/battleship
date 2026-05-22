const ABILITIES = {
  carrier: {
    id: "carrier",
    name: "Strafe Run",
    desc: "Clear an entire row or column on radar.",
    unlockOn: "carrier",
  },
  battleship: {
    id: "battleship",
    name: "Broadside",
    desc: "Fire 5 consecutive cells along a row or column.",
    unlockOn: "battleship",
  },
  cruiser: {
    id: "cruiser",
    name: "Triple Shot",
    desc: "Fire 3 times this turn after activating.",
    unlockOn: "cruiser",
  },
  submarine: {
    id: "submarine",
    name: "Powered Torpedo",
    desc: "Hit center + 4 adjacent cells (cross).",
    unlockOn: "submarine",
  },
  destroyer: {
    id: "destroyer",
    name: "Scout",
    desc: "Scan 4×4 area — reveals if ships present, not where.",
    unlockOn: "destroyer",
  },
};

const ABILITY_MODE = {
  NONE: "none",
  LINE_PICK: "line_pick",
  TORPEDO: "torpedo",
  SCOUT: "scout",
};

function getBroadsideCells(row, col, axis) {
  if (axis === "row") {
    const startCol = Math.max(0, Math.min(col - 2, BOARD_SIZE - 5));
    return [0, 1, 2, 3, 4].map((i) => ({ row, col: startCol + i }));
  }
  const startRow = Math.max(0, Math.min(row - 2, BOARD_SIZE - 5));
  return [0, 1, 2, 3, 4].map((i) => ({ row: startRow + i, col }));
}

function getCellsInLane(row, col, axis) {
  const cells = [];
  if (axis === "row") {
    for (let c = 0; c < BOARD_SIZE; c++) cells.push({ row, col: c });
  } else {
    for (let r = 0; r < BOARD_SIZE; r++) cells.push({ row: r, col });
  }
  return cells;
}

function getCrossCells(row, col) {
  return [
    { row, col },
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

/** Always a full 4×4 block on the board, anchored near the clicked cell */
function getScoutCells(anchorRow, anchorCol) {
  const startRow = Math.max(0, Math.min(anchorRow - 1, BOARD_SIZE - 4));
  const startCol = Math.max(0, Math.min(anchorCol - 1, BOARD_SIZE - 4));
  const cells = [];
  for (let r = startRow; r < startRow + 4; r++) {
    for (let c = startCol; c < startCol + 4; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function scoutHasShip(board, cells) {
  return cells.some((c) => {
    const ship = board.getShipAt(c.row, c.col);
    return ship && !board.sunkShipIds.has(ship.id);
  });
}
