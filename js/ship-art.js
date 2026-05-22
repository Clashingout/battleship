/** Top-down 2D silhouettes — viewBox width = size × 36px, height = 36px (one cell row) */

const CELL_ART = 36;

const SHIP_SVG = {
  carrier: `
    <svg viewBox="0 0 180 36" preserveAspectRatio="none" class="ship-svg" xmlns="http://www.w3.org/2000/svg">
      <path fill="#3d4f5c" d="M2 18 L18 9 L162 9 L178 18 L162 27 L18 27 Z"/>
      <path fill="#4a6275" d="M20 11 L160 11 L172 18 L160 25 L20 25 Z"/>
      <path fill="#2e3d48" d="M18 11 L28 25 L20 25 Z"/>
      <rect fill="#5a6d7d" x="106" y="10" width="13" height="16" rx="1"/>
      <rect fill="#6b7f8f" x="108" y="12" width="9" height="12" rx="1"/>
      <line x1="36" y1="18" x2="150" y2="18" stroke="#7a90a0" stroke-width="0.9" opacity="0.5"/>
    </svg>`,

  battleship: `
    <svg viewBox="0 0 144 36" preserveAspectRatio="none" class="ship-svg" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4a5568" d="M2 18 L16 9 L128 9 L142 18 L128 27 L16 27 Z"/>
      <path fill="#5c6b7d" d="M18 11 L126 11 L136 18 L126 25 L18 25 Z"/>
      <ellipse fill="#3d4654" cx="32" cy="18" rx="8" ry="6"/>
      <ellipse fill="#3d4654" cx="72" cy="18" rx="8" ry="6"/>
      <ellipse fill="#3d4654" cx="108" cy="18" rx="8" ry="6"/>
      <rect fill="#6b7a8c" x="58" y="11" width="16" height="14" rx="1"/>
      <path fill="#2e3540" d="M16 11 L22 25 L18 25 Z"/>
    </svg>`,

  cruiser: `
    <svg viewBox="0 0 108 36" preserveAspectRatio="none" class="ship-svg" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4d5e6e" d="M2 18 L14 9 L94 9 L106 18 L94 27 L14 27 Z"/>
      <path fill="#5e7080" d="M16 11 L92 11 L100 18 L92 25 L16 25 Z"/>
      <ellipse fill="#3a4550" cx="28" cy="18" rx="6" ry="5"/>
      <ellipse fill="#3a4550" cx="78" cy="18" rx="6" ry="5"/>
      <rect fill="#6d7d8d" x="46" y="11" width="13" height="14" rx="1"/>
      <path fill="#2e3842" d="M14 11 L20 25 L16 25 Z"/>
    </svg>`,

  submarine: `
    <svg viewBox="0 0 108 36" preserveAspectRatio="none" class="ship-svg" xmlns="http://www.w3.org/2000/svg">
      <ellipse fill="#3a4a55" cx="54" cy="20" rx="50" ry="11"/>
      <ellipse fill="#4d5f6a" cx="52" cy="20" rx="44" ry="8"/>
      <rect fill="#5a6d78" x="44" y="8" width="18" height="14" rx="2"/>
      <rect fill="#6a7d88" x="48" y="10" width="10" height="10" rx="1"/>
      <ellipse fill="#2a3540" cx="12" cy="20" rx="9" ry="7"/>
      <path fill="none" stroke="#6a8090" stroke-width="0.9" d="M18 20 L88 20" opacity="0.4"/>
    </svg>`,

  destroyer: `
    <svg viewBox="0 0 72 36" preserveAspectRatio="none" class="ship-svg" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4a5a68" d="M2 18 L12 8 L60 10 L70 18 L60 26 L12 28 Z"/>
      <path fill="#5a6a78" d="M12 10 L60 12 L66 18 L60 24 L12 26 Z"/>
      <ellipse fill="#3a4550" cx="48" cy="18" rx="5" ry="4"/>
      <rect fill="#6a7a88" x="26" y="10" width="12" height="16" rx="1"/>
      <path fill="#2e3842" d="M12 10 L18 26 L14 26 Z"/>
    </svg>`,
};

const SHIP_THUMB_SIZE = {
  carrier: { width: 100, height: 22 },
  battleship: { width: 80, height: 22 },
  cruiser: { width: 60, height: 22 },
  submarine: { width: 60, height: 22 },
  destroyer: { width: 44, height: 22 },
};

function getCellSize() {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue("--cell-size")
    .trim();
  return parseInt(val, 10) || CELL_ART;
}

function getShipGridSize(shipId) {
  return SHIPS.find((s) => s.id === shipId)?.size ?? 1;
}

function createShipSprite(shipId, direction, options = {}) {
  const svg = SHIP_SVG[shipId];
  if (!svg) return null;

  const el = document.createElement("div");
  el.className = "ship-sprite";
  el.classList.add(`ship-sprite-${shipId}`);
  if (options.preview) el.classList.add("ship-sprite-preview");
  if (options.invalid) el.classList.add("ship-sprite-invalid");
  if (options.sunk) el.classList.add("ship-sprite-sunk");
  el.innerHTML = svg;

  const horizontal = direction === DIRECTION.HORIZONTAL;
  const size = getShipGridSize(shipId);
  const cell = getCellSize();
  const long = size * cell;
  const short = cell;

  if (horizontal) {
    el.style.width = `${long}px`;
    el.style.height = `${short}px`;
  } else {
    el.classList.add("ship-sprite-vertical");
    el.style.width = `${short}px`;
    el.style.height = `${long}px`;
    const svgEl = el.querySelector(".ship-svg");
    if (svgEl) {
      svgEl.style.width = `${long}px`;
      svgEl.style.height = `${short}px`;
    }
  }

  if (options.row != null && options.col != null) {
    el.style.left = `${options.col * cell}px`;
    el.style.top = `${options.row * cell}px`;
  }

  return el;
}

function renderShipLayer(layerEl, board, { showShips, showSunk = true } = {}) {
  if (!layerEl) return;
  layerEl.innerHTML = "";
  if (!showShips) return;

  for (const ship of board.ships) {
    const sunk = board.sunkShipIds.has(ship.id);
    if (sunk && !showSunk) continue;

    const row = Math.min(...ship.cells.map((c) => c.row));
    const col = Math.min(...ship.cells.map((c) => c.col));
    const sprite = createShipSprite(ship.id, getShipOrientation(ship), {
      row,
      col,
      sunk,
    });
    if (sprite) layerEl.appendChild(sprite);
  }
}

function createPickerShipThumb(shipId) {
  const wrap = document.createElement("div");
  wrap.className = `ship-thumb ship-thumb-${shipId}`;
  const size = SHIP_THUMB_SIZE[shipId];
  const gridSize = getShipGridSize(shipId);
  if (size) {
    wrap.style.width = `${size.width}px`;
    wrap.style.height = `${size.height}px`;
  }
  wrap.style.aspectRatio = `${gridSize} / 1`;
  wrap.innerHTML = SHIP_SVG[shipId];
  return wrap;
}
