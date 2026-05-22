const SHIPS = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

const BOARD_SIZE = 10;

const DIRECTION = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
};

function getShipCells(row, col, size, direction) {
  const cells = [];
  for (let i = 0; i < size; i++) {
    if (direction === DIRECTION.HORIZONTAL) {
      cells.push({ row, col: col + i });
    } else {
      cells.push({ row: row + i, col });
    }
  }
  return cells;
}

function cellsInBounds(cells) {
  return cells.every(
    (c) => c.row >= 0 && c.row < BOARD_SIZE && c.col >= 0 && c.col < BOARD_SIZE
  );
}

function getShipOrientation(ship) {
  if (ship.cells.length < 2) return DIRECTION.HORIZONTAL;
  return ship.cells[0].row === ship.cells[1].row
    ? DIRECTION.HORIZONTAL
    : DIRECTION.VERTICAL;
}
