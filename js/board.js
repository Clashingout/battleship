class Board {
  constructor() {
    this.ships = [];
    this.shots = new Map();
    this.sunkShipIds = new Set();
  }

  reset() {
    this.ships = [];
    this.shots = new Map();
    this.sunkShipIds = new Set();
  }

  shotKey(row, col) {
    return `${row},${col}`;
  }

  hasShipAt(row, col) {
    return this.ships.some((ship) =>
      ship.cells.some((c) => c.row === row && c.col === col)
    );
  }

  getShipAt(row, col) {
    return this.ships.find((ship) =>
      ship.cells.some((c) => c.row === row && c.col === col)
    );
  }

  canPlace(cells) {
    if (!cellsInBounds(cells)) return false;
    const occupied = new Set(
      this.ships.flatMap((s) => s.cells.map((c) => this.shotKey(c.row, c.col)))
    );
    return cells.every((c) => !occupied.has(this.shotKey(c.row, c.col)));
  }

  placeShip(shipDef, row, col, direction) {
    const cells = getShipCells(row, col, shipDef.size, direction);
    if (!this.canPlace(cells)) return false;
    this.ships.push({
      id: shipDef.id,
      name: shipDef.name,
      size: shipDef.size,
      cells: cells.map((c) => ({ ...c })),
      hits: 0,
    });
    return true;
  }

  autoPlaceAll(shipDefs) {
    this.reset();
    const shuffled = [...shipDefs].sort(() => Math.random() - 0.5);
    for (const def of shuffled) {
      let placed = false;
      const attempts = 200;
      for (let i = 0; i < attempts && !placed; i++) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        const direction =
          Math.random() < 0.5 ? DIRECTION.HORIZONTAL : DIRECTION.VERTICAL;
        placed = this.placeShip(def, row, col, direction);
      }
      if (!placed) {
        this.reset();
        return this.autoPlaceAll(shipDefs);
      }
    }
    return true;
  }

  receiveShot(row, col) {
    const key = this.shotKey(row, col);
    if (this.shots.has(key)) return null;

    const ship = this.getShipAt(row, col);
    const hit = !!ship;
    let sunk = null;

    if (hit) {
      ship.hits += 1;
      if (ship.hits >= ship.size) {
        sunk = ship;
        this.sunkShipIds.add(ship.id);
      }
    }

    this.shots.set(key, { hit, sunk: sunk?.id ?? null });
    return { hit, sunk };
  }

  allShipsSunk() {
    return (
      this.ships.length > 0 &&
      this.ships.every((s) => this.sunkShipIds.has(s.id))
    );
  }

  allShots() {
    return this.shots;
  }
}
