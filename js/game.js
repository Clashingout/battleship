const PHASE = {
  PLACEMENT: "placement",
  BATTLE: "battle",
  OVER: "over",
};

class BattleshipGame {
  constructor() {
    this.phase = PHASE.PLACEMENT;
    this.playerBoard = new Board();
    this.enemyBoard = new Board();
    this.ai = new BattleshipAI(this.playerBoard);
    this.placedShipIds = new Set();
    this.selectedShipId = SHIPS[0].id;
    this.direction = DIRECTION.HORIZONTAL;
    this.playerTurn = true;
    this.aiThinking = false;

    this.unlockedAbilities = new Set();
    this.usedAbilities = new Set();
    this.armedAbilityId = null;
    this.pendingLineStrike = null;
    this.multiShotsLeft = 0;
    this.multiShotAbilityId = null;
    this.scoutZones = [];

    this.statusEl = document.getElementById("status");
    this.playerGridEl = document.getElementById("player-board");
    this.enemyGridEl = document.getElementById("enemy-board");
    this.playerShipLayerEl = document.getElementById("player-ship-layer");
    this.previewLayerEl = document.getElementById("placement-preview-layer");
    this.enemySectionEl = document.getElementById("enemy-section");
    this.placementPanelEl = document.getElementById("placement-controls");
    this.abilitiesPanelEl = document.getElementById("abilities-panel");
    this.abilitiesListEl = document.getElementById("abilities-list");
    this.linePickerEl = document.getElementById("line-axis-picker");
    this.linePickerLabelEl = document.getElementById("line-picker-label");
    this.lineRowBtn = document.getElementById("line-row-btn");
    this.lineColBtn = document.getElementById("line-col-btn");
    this.lineCancelBtn = document.getElementById("line-cancel-btn");
    this.abilityBannerEl = document.getElementById("ability-targeting-banner");
    this.abilityBannerTextEl = document.getElementById("ability-banner-text");
    this.abilityCancelBtn = document.getElementById("ability-cancel-btn");
    this.shipPickerEl = document.getElementById("ship-picker");
    this.startBtn = document.getElementById("start-btn");
    this.rotateBtn = document.getElementById("rotate-btn");
    this.autoPlaceBtn = document.getElementById("auto-place-btn");
    this.gameOverEl = document.getElementById("game-over");
    this.gameOverTextEl = document.getElementById("game-over-text");
    this.playAgainBtn = document.getElementById("play-again-btn");

    this.bindEvents();
    this.buildShipPicker();
    this.setBodyPhase();
    this.renderPlayerBoard();
    this.renderEnemyBoard();
    this.updateUI();
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startBattle());
    this.rotateBtn.addEventListener("click", () => this.rotate());
    this.autoPlaceBtn.addEventListener("click", () => this.autoPlace());
    this.playAgainBtn.addEventListener("click", () => this.resetGame());
    this.lineRowBtn.addEventListener("click", () => this.executeLineStrike("row"));
    this.lineColBtn.addEventListener("click", () => this.executeLineStrike("col"));
    this.lineCancelBtn.addEventListener("click", () => this.cancelAbilityMode());
    this.abilityCancelBtn.addEventListener("click", () => this.cancelAbilityMode());
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R") this.rotate();
      if (e.key === "Escape") this.cancelAbilityMode();
    });
  }

  setBodyPhase() {
    document.body.classList.toggle("phase-placement", this.phase === PHASE.PLACEMENT);
    document.body.classList.toggle("phase-battle", this.phase === PHASE.BATTLE);
    document.body.classList.toggle("phase-over", this.phase === PHASE.OVER);
  }

  resetAbilityState() {
    this.unlockedAbilities = new Set();
    this.usedAbilities = new Set();
    this.disarmAbility(false);
    this.multiShotsLeft = 0;
    this.multiShotAbilityId = null;
    this.scoutZones = [];
  }

  disarmAbility(updateStatus = true) {
    this.armedAbilityId = null;
    this.pendingLineStrike = null;
    if (this.linePickerEl) this.linePickerEl.hidden = true;
    this.updateAbilityBanner();
    this.renderAbilitiesPanel();
    if (updateStatus && this.phase === PHASE.BATTLE && this.playerTurn) {
      this.setStatus("Click enemy radar to fire.");
    }
  }

  updateAbilityBanner() {
    if (!this.abilityBannerEl) return;
    const armed =
      this.phase === PHASE.BATTLE &&
      this.playerTurn &&
      (this.armedAbilityId || this.pendingLineStrike);

    this.abilityBannerEl.hidden = !armed;
    if (armed && this.abilityBannerTextEl) {
      const name = this.armedAbilityId
        ? ABILITIES[this.armedAbilityId]?.name
        : "Ability";
      this.abilityBannerTextEl.textContent = `${name} armed — click radar to use, or cancel to shoot normally.`;
    }
  }

  buildShipPicker() {
    this.shipPickerEl.innerHTML = "";
    for (const ship of SHIPS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ship-option";
      btn.dataset.shipId = ship.id;
      btn.appendChild(createPickerShipThumb(ship.id));
      const label = document.createElement("span");
      label.className = "ship-name";
      label.textContent = ship.name;
      btn.appendChild(label);
      btn.addEventListener("click", () => this.selectShip(ship.id));
      this.shipPickerEl.appendChild(btn);
    }
    this.updateShipPicker();
  }

  selectShip(shipId) {
    if (this.placedShipIds.has(shipId)) return;
    this.selectedShipId = shipId;
    this.updateShipPicker();
  }

  rotate() {
    if (this.phase !== PHASE.PLACEMENT) return;
    this.direction =
      this.direction === DIRECTION.HORIZONTAL
        ? DIRECTION.VERTICAL
        : DIRECTION.HORIZONTAL;
    this.renderPlayerBoard();
  }

  autoPlace() {
    if (this.phase !== PHASE.PLACEMENT) return;
    this.playerBoard.autoPlaceAll(SHIPS);
    this.placedShipIds = new Set(SHIPS.map((s) => s.id));
    this.renderPlayerBoard();
    this.updateUI();
  }

  startBattle() {
    if (this.placedShipIds.size !== SHIPS.length) return;
    this.phase = PHASE.BATTLE;
    this.enemyBoard.autoPlaceAll(SHIPS);
    this.ai.reset();
    this.resetAbilityState();
    this.playerTurn = true;
    this.enemySectionEl.classList.remove("enemy-standby");
    this.placementPanelEl.hidden = true;
    this.abilitiesPanelEl.hidden = false;
    this.setBodyPhase();
    this.renderEnemyBoard();
    this.renderPlayerBoard();
    this.updateUI();
    this.updateAbilityBanner();
    this.setStatus("Your turn — click enemy radar to fire.");
  }

  resetGame() {
    this.phase = PHASE.PLACEMENT;
    this.playerBoard.reset();
    this.enemyBoard.reset();
    this.ai = new BattleshipAI(this.playerBoard);
    this.placedShipIds = new Set();
    this.selectedShipId = SHIPS[0].id;
    this.direction = DIRECTION.HORIZONTAL;
    this.playerTurn = true;
    this.aiThinking = false;
    this.resetAbilityState();
    this.enemySectionEl.classList.add("enemy-standby");
    this.placementPanelEl.hidden = false;
    this.abilitiesPanelEl.hidden = true;
    this.hideGameOver();
    this.setBodyPhase();
    this.renderPlayerBoard();
    this.renderEnemyBoard();
    this.updateUI();
  }

  getSelectedShip() {
    return SHIPS.find((s) => s.id === this.selectedShipId);
  }

  placeShipAt(row, col) {
    const def = this.getSelectedShip();
    if (!def || this.placedShipIds.has(def.id)) return;

    if (this.playerBoard.placeShip(def, row, col, this.direction)) {
      this.placedShipIds.add(def.id);
      const next = SHIPS.find((s) => !this.placedShipIds.has(s.id));
      if (next) this.selectedShipId = next.id;
      this.clearPlacementPreview();
      this.renderPlayerBoard();
      this.updateUI();
    }
  }

  getPlacementPreview(row, col) {
    const def = this.getSelectedShip();
    if (!def || this.placedShipIds.has(def.id)) return null;
    const cells = getShipCells(row, col, def.size, this.direction);
    const valid = this.playerBoard.canPlace(cells);
    return { cells, valid, def };
  }

  unlockAbilityForSunkShip(shipId) {
    if (ABILITIES[shipId]) {
      this.unlockedAbilities.add(shipId);
      this.renderAbilitiesPanel();
    }
  }

  renderAbilitiesPanel() {
    this.abilitiesListEl.innerHTML = "";
    for (const id of Object.keys(ABILITIES)) {
      if (!this.unlockedAbilities.has(id)) continue;
      const def = ABILITIES[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ability-btn";
      if (this.usedAbilities.has(id)) btn.classList.add("used");
      if (this.armedAbilityId === id) {
        btn.classList.add("active-mode");
      }
      btn.disabled =
        this.usedAbilities.has(id) ||
        !this.playerTurn ||
        this.aiThinking ||
        this.phase !== PHASE.BATTLE;
      btn.innerHTML = `
        <span class="ability-name">${def.name}</span>
        <span class="ability-desc">${def.desc}</span>
      `;
      btn.addEventListener("click", () => this.startAbility(id));
      this.abilitiesListEl.appendChild(btn);
    }
  }

  startAbility(abilityId) {
    if (
      this.usedAbilities.has(abilityId) ||
      !this.playerTurn ||
      this.aiThinking ||
      this.phase !== PHASE.BATTLE
    ) {
      return;
    }

    if (this.armedAbilityId === abilityId) {
      this.disarmAbility();
      return;
    }

    if (abilityId === "cruiser") {
      this.usedAbilities.add(abilityId);
      this.multiShotsLeft = 3;
      this.multiShotAbilityId = abilityId;
      this.disarmAbility(false);
      this.setStatus("Triple Shot: fire 3 times on radar.");
      this.renderAbilitiesPanel();
      this.renderEnemyBoard();
      return;
    }

    this.armedAbilityId = abilityId;
    this.pendingLineStrike = null;
    if (this.linePickerEl) this.linePickerEl.hidden = true;

    const messages = {
      carrier: "Strafe Run armed — click radar, then pick row or column.",
      battleship: "Broadside armed — click radar, then pick row or column.",
      submarine: "Torpedo armed — click radar for cross strike.",
      destroyer: "Scout armed — click radar to scan 4×4 area.",
    };
    this.setStatus(messages[abilityId] || "Ability armed.");
    this.renderEnemyBoard();
    this.renderAbilitiesPanel();
    this.updateAbilityBanner();
  }

  cancelAbilityMode() {
    this.disarmAbility();
    this.renderEnemyBoard();
  }

  handleArmedAbilityClick(row, col) {
    const id = this.armedAbilityId;

    if (id === "carrier" || id === "battleship") {
      this.pendingLineStrike = { row, col, abilityId: id };
      const isStrafe = id === "carrier";
      this.linePickerLabelEl.textContent = isStrafe
        ? "Strafe direction:"
        : "Broadside direction:";
      this.lineRowBtn.textContent = isStrafe
        ? `Strike Row ${row + 1}`
        : `Broadside Row ${row + 1}`;
      this.lineColBtn.textContent = isStrafe
        ? `Strike Column ${col + 1}`
        : `Broadside Column ${col + 1}`;
      if (this.linePickerEl) this.linePickerEl.hidden = false;
      this.updateAbilityBanner();
      this.setStatus(
        isStrafe
          ? `Strafe Run: strike row ${row + 1} or column ${col + 1}?`
          : `Broadside: fire 5 cells on row ${row + 1} or column ${col + 1}?`
      );
      return;
    }

    if (id === "submarine") {
      this.executeTorpedo(row, col);
      return;
    }

    if (id === "destroyer") {
      this.executeScout(row, col);
      return;
    }
  }

  onEnemyCellClick(row, col) {
    if (this.multiShotsLeft > 0) {
      this.fireAtEnemy(row, col, { countsAsTurn: false, multiShot: true });
      return;
    }

    if (this.armedAbilityId) {
      this.handleArmedAbilityClick(row, col);
      return;
    }

    this.fireAtEnemy(row, col, { countsAsTurn: true });
  }

  executeLineStrike(axis) {
    if (!this.pendingLineStrike) return;
    const { row, col, abilityId } = this.pendingLineStrike;
    const laneAxis = axis === "row" ? "row" : "col";

    if (abilityId === "carrier") {
      this.executeStrafe(row, col, laneAxis);
    } else if (abilityId === "battleship") {
      this.executeBroadside(row, col, laneAxis);
    }
  }

  fireCells(cells) {
    let hits = 0;
    for (const c of cells) {
      const key = this.enemyBoard.shotKey(c.row, c.col);
      if (!this.enemyBoard.shots.has(key)) {
        const result = this.enemyBoard.receiveShot(c.row, c.col);
        if (result?.hit) hits++;
        if (result?.sunk) this.unlockAbilityForSunkShip(result.sunk.id);
      }
    }
    return hits;
  }

  executeStrafe(row, col, axis) {
    const cells = getCellsInLane(row, col, axis);
    this.usedAbilities.add("carrier");
    this.disarmAbility(false);

    const hits = this.fireCells(cells);
    this.renderEnemyBoard();
    this.renderAbilitiesPanel();

    if (this.enemyBoard.allShipsSunk()) {
      this.endGame(true);
      return;
    }

    const lane = axis === "row" ? `row ${row + 1}` : `column ${col + 1}`;
    this.setStatus(`Strafe Run cleared ${lane} (${hits} hit${hits !== 1 ? "s" : ""}). Enemy turn.`);
    this.endPlayerTurn();
  }

  executeBroadside(row, col, axis) {
    const cells = getBroadsideCells(row, col, axis);
    this.usedAbilities.add("battleship");
    this.disarmAbility(false);

    const hits = this.fireCells(cells);
    this.renderEnemyBoard();
    this.renderAbilitiesPanel();

    if (this.enemyBoard.allShipsSunk()) {
      this.endGame(true);
      return;
    }

    const lane = axis === "row" ? `row ${row + 1}` : `column ${col + 1}`;
    this.setStatus(`Broadside on ${lane} — ${hits} hit${hits !== 1 ? "s" : ""}. Enemy turn.`);
    this.endPlayerTurn();
  }

  executeTorpedo(row, col) {
    const cells = getCrossCells(row, col);
    this.usedAbilities.add("submarine");
    this.disarmAbility(false);

    let hits = 0;
    for (const c of cells) {
      const key = this.enemyBoard.shotKey(c.row, c.col);
      if (!this.enemyBoard.shots.has(key)) {
        const result = this.enemyBoard.receiveShot(c.row, c.col);
        if (result?.hit) hits++;
        if (result?.sunk) this.unlockAbilityForSunkShip(result.sunk.id);
      }
    }

    this.renderEnemyBoard();
    this.renderAbilitiesPanel();

    if (this.enemyBoard.allShipsSunk()) {
      this.endGame(true);
      return;
    }

    this.setStatus(`Torpedo away! ${hits} hit${hits !== 1 ? "s" : ""}. Enemy turn.`);
    this.endPlayerTurn();
  }

  executeScout(row, col) {
    const cells = getScoutCells(row, col);
    const contact = scoutHasShip(this.enemyBoard, cells);

    this.usedAbilities.add("destroyer");
    this.scoutZones.push({ row, col, contact });
    this.disarmAbility(false);

    this.renderEnemyBoard();
    this.renderAbilitiesPanel();

    const zoneLabel = `rows ${cells[0].row + 1}–${cells[0].row + 4}, cols ${cells[0].col + 1}–${cells[0].col + 4}`;
    this.setStatus(
      contact
        ? `Scout report: CONTACT in sector (${zoneLabel}). Ship locations unknown.`
        : `Scout report: ALL CLEAR in sector (${zoneLabel}). No ships detected.`
    );
    this.endPlayerTurn();
  }

  fireAtEnemy(row, col, options = {}) {
    const { countsAsTurn = true, multiShot = false } = options;

    if (
      this.phase !== PHASE.BATTLE ||
      !this.playerTurn ||
      this.aiThinking
    ) {
      return;
    }

    const key = this.enemyBoard.shotKey(row, col);
    if (this.enemyBoard.shots.has(key)) return;

    if (!multiShot) {
      this.disarmAbility(false);
    }

    const result = this.enemyBoard.receiveShot(row, col);
    if (!result) return;
    this.renderEnemyBoard();
    this.renderPlayerBoard();

    if (result.sunk) {
      this.unlockAbilityForSunkShip(result.sunk.id);
      this.setStatus(`You sunk the enemy ${result.sunk.name}!`);
    } else if (result.hit) {
      this.setStatus("Direct hit! Fire again.");
    } else if (multiShot && this.multiShotsLeft > 0) {
      this.setStatus(`Miss. ${this.multiShotsLeft} shot${this.multiShotsLeft > 1 ? "s" : ""} remaining.`);
    } else if (!multiShot) {
      this.setStatus("Miss. Enemy is firing...");
    }

    if (this.enemyBoard.allShipsSunk()) {
      this.endGame(true);
      return;
    }

    if (multiShot) {
      this.multiShotsLeft -= 1;
      if (this.multiShotsLeft > 0) {
        const tag = result.hit ? "Hit" : "Miss";
        this.setStatus(
          `${tag}! ${this.multiShotsLeft} shot${this.multiShotsLeft > 1 ? "s" : ""} remaining.`
        );
        return;
      }
      this.multiShotAbilityId = null;
      this.setStatus("Shots complete. Enemy turn.");
      this.endPlayerTurn();
      return;
    }

    if (result.hit && !result.sunk) {
      this.updateAbilityBanner();
      return;
    }

    if (!result.hit && countsAsTurn) {
      this.endPlayerTurn();
    }
  }

  onPlayerFire(row, col) {
    this.onEnemyCellClick(row, col);
  }

  endPlayerTurn() {
    this.playerTurn = false;
    this.multiShotsLeft = 0;
    this.multiShotAbilityId = null;
    this.disarmAbility(false);
    this.disableEnemyBoard(true);
    this.renderAbilitiesPanel();
    this.updateAbilityBanner();
    setTimeout(() => this.aiTurn(), 700);
  }

  aiTurn() {
    if (this.phase !== PHASE.BATTLE) return;
    this.aiThinking = true;
    const shot = this.ai.fire();
    this.aiThinking = false;

    if (!shot) return;

    this.renderPlayerBoard();

    if (this.playerBoard.allShipsSunk()) {
      this.endGame(false);
      return;
    }

    if (shot.hit) {
      if (shot.sunk) {
        this.setStatus(`Enemy sunk your ${shot.sunk.name}! They're firing again...`);
      } else {
        this.setStatus("Enemy hit your ship! They're firing again...");
      }
      setTimeout(() => this.aiTurn(), 700);
      return;
    }

    this.setStatus("Enemy missed. Your turn — click enemy radar to fire.");
    this.playerTurn = true;
    this.disarmAbility(false);
    this.disableEnemyBoard(false);
    this.renderAbilitiesPanel();
    this.updateAbilityBanner();
  }

  endGame(playerWon) {
    this.phase = PHASE.OVER;
    this.setBodyPhase();
    this.gameOverTextEl.textContent = playerWon
      ? "Victory! You sank the entire enemy fleet."
      : "Defeat. The enemy sank your fleet.";
    this.showGameOver();
    this.setStatus(playerWon ? "You win!" : "You lose.");
  }

  showGameOver() {
    this.gameOverEl.removeAttribute("hidden");
  }

  hideGameOver() {
    this.gameOverEl.setAttribute("hidden", "");
  }

  setStatus(text) {
    this.statusEl.textContent = text;
  }

  updateUI() {
    this.updateShipPicker();
    this.startBtn.disabled = this.placedShipIds.size !== SHIPS.length;
    this.renderAbilitiesPanel();

    if (this.phase === PHASE.PLACEMENT) {
      const remaining = SHIPS.length - this.placedShipIds.size;
      if (remaining === 0) {
        this.setStatus("Fleet ready. Press Start Battle!");
      } else {
        const ship = this.getSelectedShip();
        this.setStatus(
          `Place your ${ship.name} on the open sea (${remaining} ship${remaining > 1 ? "s" : ""} left).`
        );
      }
    } else if (this.phase === PHASE.BATTLE && this.playerTurn) {
      if (this.multiShotsLeft > 0) {
        return;
      }
      this.setStatus("Your turn — click enemy radar to fire, or arm an ability.");
    }
  }

  updateShipPicker() {
    const options = this.shipPickerEl.querySelectorAll(".ship-option");
    options.forEach((el) => {
      const id = el.dataset.shipId;
      el.classList.toggle("placed", this.placedShipIds.has(id));
      el.classList.toggle("selected", id === this.selectedShipId);
      el.disabled = this.placedShipIds.has(id);
    });
  }

  getScoutCellInfo(row, col) {
    for (const zone of this.scoutZones) {
      const cells = getScoutCells(zone.row, zone.col);
      if (cells.some((c) => c.row === row && c.col === col)) {
        return { inZone: true, contact: zone.contact };
      }
    }
    return null;
  }

  canTargetEnemyCell(row, col) {
    if (this.phase !== PHASE.BATTLE || !this.playerTurn || this.aiThinking) {
      return false;
    }
    if (this.armedAbilityId) {
      return true;
    }
    return !this.enemyBoard.shots.has(this.enemyBoard.shotKey(row, col));
  }

  createGrid(container, gridClass, options) {
    container.innerHTML = "";
    container.className = `grid ${gridClass}`;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.setAttribute("aria-label", `Cell ${row + 1}, ${col + 1}`);
        options.onCell(cell, row, col);
        container.appendChild(cell);
      }
    }
  }

  renderPlayerBoard() {
    const showShips =
      this.phase === PHASE.PLACEMENT || this.phase === PHASE.BATTLE;

    this.createGrid(this.playerGridEl, "sea-grid", {
      onCell: (cell, row, col) => {
        const key = this.playerBoard.shotKey(row, col);
        const shot = this.playerBoard.shots.get(key);
        const ship = this.playerBoard.getShipAt(row, col);

        if (shot) {
          cell.classList.add(shot.hit ? "hit" : "miss");
        }
        if (ship && this.playerBoard.sunkShipIds.has(ship.id)) {
          cell.classList.add("sunk");
        } else if (showShips && ship) {
          cell.classList.add("under-ship");
        }

        if (this.phase === PHASE.PLACEMENT) {
          cell.addEventListener("click", () => this.placeShipAt(row, col));
          cell.addEventListener("mouseenter", () => {
            this.showPlacementPreview(row, col);
          });
          cell.addEventListener("mouseleave", () => {
            this.clearPlacementPreview();
          });
        }
      },
    });

    renderShipLayer(this.playerShipLayerEl, this.playerBoard, {
      showShips,
      showSunk: true,
    });
    this.clearPlacementPreview();
  }

  showPlacementPreview(row, col) {
    if (this.phase !== PHASE.PLACEMENT) return;
    this.previewLayerEl.innerHTML = "";

    const preview = this.getPlacementPreview(row, col);
    if (!preview) return;

    const anchorRow = preview.cells[0].row;
    const anchorCol = preview.cells[0].col;
    const sprite = createShipSprite(preview.def.id, this.direction, {
      preview: true,
      invalid: !preview.valid,
      row: anchorRow,
      col: anchorCol,
    });

    preview.cells.forEach((c) => {
      const idx = c.row * BOARD_SIZE + c.col;
      const cells = this.playerGridEl.querySelectorAll(".cell");
      const cell = cells[idx];
      if (cell) {
        cell.classList.remove("placing-preview", "placing-invalid");
        cell.classList.add(
          preview.valid ? "placing-preview" : "placing-invalid"
        );
      }
    });

    if (sprite) this.previewLayerEl.appendChild(sprite);
  }

  clearPlacementPreview() {
    this.previewLayerEl.innerHTML = "";
    this.playerGridEl.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove("placing-preview", "placing-invalid");
    });
  }

  renderEnemyBoard() {
    this.createGrid(this.enemyGridEl, "radar-grid", {
      onCell: (cell, row, col) => {
        const key = this.enemyBoard.shotKey(row, col);
        const shot = this.enemyBoard.shots.get(key);
        const ship = this.enemyBoard.getShipAt(row, col);

        if (shot) {
          cell.classList.add(shot.hit ? "hit" : "miss");
        }
        if (ship && this.enemyBoard.sunkShipIds.has(ship.id)) {
          cell.classList.add("sunk");
        }
        const scoutInfo = this.getScoutCellInfo(row, col);
        if (scoutInfo) {
          cell.classList.add("scout-zone");
          if (scoutInfo.contact) {
            cell.classList.add("scout-zone-contact");
          }
        }

        if (this.phase === PHASE.BATTLE) {
          if (this.canTargetEnemyCell(row, col)) {
            cell.classList.add("targetable");
            cell.addEventListener("click", () => this.onEnemyCellClick(row, col));
          } else {
            cell.classList.add("disabled");
          }
        }
      },
    });

    this.syncEnemyBoardInput();
  }

  syncEnemyBoardInput() {
    const boardDisabled = !this.playerTurn || this.aiThinking;
    this.enemyGridEl.querySelectorAll(".cell").forEach((cell) => {
      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);
      const canTarget = !boardDisabled && this.canTargetEnemyCell(row, col);

      cell.classList.toggle("disabled", !canTarget);
      cell.classList.toggle("targetable", canTarget);
    });
  }

  disableEnemyBoard(disabled) {
    if (disabled) {
      this.enemyGridEl.querySelectorAll(".cell").forEach((cell) => {
        cell.classList.add("disabled");
        cell.classList.remove("targetable");
      });
    } else {
      this.syncEnemyBoardInput();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new BattleshipGame();
});
