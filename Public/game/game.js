
// JÁTÉKADATOK — a GET /game-data tölti fel (lásd: loadGameData)
let gameData = {
  classes: [],
  abilities: [],
  enemies: [],
  enemyAbilities: [],
  /** @type {Record<string, { id: number, key: string, name: string, description: string, isStackable: boolean, power: number, duration: number, stackCount: number }>} */
  effectDefinitions: {}
};

/**
 * Szerverről betöltött effekt meta (effects tábla). A stackCount nincs az adatbázisban: kezdő stack növelés = 1.
 */
function getEffectDefinition(effectType) {
  return gameData.effectDefinitions[effectType] ?? null;
}






















// JÁTÉK ÁLLAPOTA

let gameState = {
    player: null,
    enemy: null,
    score: 0,
    enemyNumber: 1,
    playerStatusEffects: [],
    enemyStatusEffects: [],
    enemyCooldowns: {},
    isPlayerTurn: true,
    gameOver: false
};

// néhány konstans

const API_URL = window.location.origin;

/**
 * Fordítás + egyszerű `{kulcs}` helyettesítés a combat log üzenetekhez.
 * A translations.js-ben lévő globális t() függvényt használja (ha elérhető).
 * @param {string} keyPath
 * @param {Record<string, any>} vars
 */
function tt(keyPath, vars = {}) {
    const raw = typeof t === 'function' ? t(keyPath) : String(keyPath ?? '');
    if (!raw) return '';
    return String(raw).replace(/\{(\w+)\}/g, (_, k) => {
        if (Object.prototype.hasOwnProperty.call(vars, k)) return String(vars[k]);
        return `{${k}}`;
    });
}

function getEffectLabel(effectType) {
    const def = getEffectDefinition(effectType);
    if (def && def.name) return def.name;
    return effectType || '';
}

function noteAppliedEffect(effectType, targetName) {
    noteAbilityLine(
        tt('game.combat.applied_effect', {
            effect: getEffectLabel(effectType),
            target: targetName || '',
        })
    );
}

/** Leállítja a játékos/ellenfél portrék idle képcseréjét. */
let stopPlayerIconIdle = () => {};
let stopEnemyIconIdle = () => {};

































// INICIALIZÁLÁS


async function loadGameData() {
    try {
        const lang = typeof getLang === 'function' ? getLang() : 'hu'
        const response = await fetch(
            `${API_URL}/game-data?lang=${encodeURIComponent(lang)}`
        )
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        const data = await response.json();
        if (!Array.isArray(data.classes) || data.classes.length === 0) {
            throw new Error('No classes returned from server');
        }
        if (!Array.isArray(data.abilities) || data.abilities.length === 0) {
            throw new Error('No abilities returned from server');
        }
        if (!Array.isArray(data.enemies) || data.enemies.length === 0) {
            throw new Error('No enemies returned from server');
        }

        gameData.abilities = data.abilities;

        gameData.effectDefinitions = {};
        for (const row of data.effects || []) {
            if (!row || !row.key) continue;
            gameData.effectDefinitions[row.key] = {
                id: row.id,
                key: row.key,
                name: row.name ?? '',
                description: row.description ?? '',
                isStackable: Boolean(row.isStackable),
                power: row.power != null ? Number(row.power) : 0,
                duration: row.duration != null ? Number(row.duration) : 0,
                stackCount: 1
            };
        }

        // Backend karakterlista átalakítása a harcrendszer formátumára
        gameData.classes = data.classes.map((cls) => ({
            id: cls.id,
            name: cls.name,
            // Jelenleg itt számoljuk a harci alapértékeket (később mehet DB oszlopokba)
            health: 100,
            mana: 100,
            abilities: Array.isArray(cls.abilities) ? cls.abilities : [],
            description: cls.description || '',
            icon: cls.icon ?? null,
            iconAlt: cls.iconAlt ?? null,
            emoji: cls.icon || (cls.name ? cls.name[0] : '❔'),
        }));

        gameData.enemies = data.enemies;

        const enemyAbilityIds = new Set();
        for (const e of data.enemies) {
            for (const slot of e.abilities || []) {
                if (slot && slot.abilityId != null) enemyAbilityIds.add(slot.abilityId);
            }
        }
        gameData.enemyAbilities = data.abilities.filter((a) => enemyAbilityIds.has(a.id));
    } catch (err) {
        console.error('Failed to load /game-data for game:', err);
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #ff4444;">
                <h1>Error Loading Game</h1>
                <p>Could not load classes from the server. Please try again later.</p>
            </div>
        `;
        return;
    }
    // Indítás előtti szerkezeti ellenőrzés
    if (!gameData.classes?.length || !gameData.abilities?.length || !gameData.enemies?.length) {
        console.error('Invalid game data structure');
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #ff4444;">
                <h1>Error Loading Game</h1>
                <p>Invalid game data structure.</p>
            </div>
        `;
        return;
    }
    await initializeGame();
}

/**
 * A játékos neve a UI-ban és a logban: bejelentkezett név, különben karakter név.
 * @param {string} classNameFallback Tartalék karakter név.
 * @returns {Promise<string>}
 */
async function resolvePlayerDisplayName(classNameFallback) {
    const fallback = (classNameFallback && String(classNameFallback).trim()) || 'Player';
    try {
        const raw = localStorage.getItem('userProfile');
        if (raw) {
            const p = JSON.parse(raw);
            const n = p && p.name != null ? String(p.name).trim() : '';
            if (n) return n;
        }
    } catch (_) {
        /* ignore */
    }

    const token = localStorage.getItem('token');
    if (!token) return fallback;

    try {
        const res = await fetch(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return fallback;
        const u = await res.json();
        const n = u && u.name != null ? String(u.name).trim() : '';
        if (n) {
            try {
                localStorage.setItem(
                    'userProfile',
                    JSON.stringify({
                        name: u.name,
                        profile_icon: u.profile_icon,
                    })
                );
            } catch (_) {
                /* ignore */
            }
            return n;
        }
    } catch (_) {
        /* ignore */
    }

    return fallback;
}

async function initializeGame() {
    // sessionStorage-ből kiolvassuk a választott karakter indexét (alapértelmezett: 0)
    const selectedIndex = parseInt(sessionStorage.getItem('selectedClassIndex')) || 0;
    const selectedClass = gameData.classes[selectedIndex];
    
    if (!selectedClass) {
        console.error('Selected class not found in game data');
        return;
    }
    
    // Játékos objektum létrehozása — karakterhez tartozó képességekkel a DB-ből
    const playerAbilities = selectedClass.abilities
        .map((abilityId) => gameData.abilities.find((a) => a.id === abilityId))
        .filter(Boolean);

    const displayName = await resolvePlayerDisplayName(selectedClass.name);

    gameState.player = {
        id: selectedClass.id,
        name: displayName,
        className: selectedClass.name,
        health: selectedClass.health,
        maxHealth: selectedClass.health,
        mana: selectedClass.mana,
        maxMana: selectedClass.mana,
        abilities: playerAbilities,
        originalAbilities: [...playerAbilities] // Eredeti képességlista mentése visszaállításhoz
    };
    
    const playerDisplay = document.getElementById('player-display');
    stopPlayerIconIdle();
    stopPlayerIconIdle = () => {};
    if (playerDisplay && typeof characterIcon !== 'undefined' && characterIcon.renderInto) {
        stopPlayerIconIdle = characterIcon.renderInto(playerDisplay, {
            icon: selectedClass.icon,
            iconAlt: selectedClass.iconAlt,
            fallbackChar: selectedClass.name ? selectedClass.name[0] : '❔',
        });
    } else if (playerDisplay && selectedClass.emoji) {
        playerDisplay.textContent = selectedClass.emoji;
    }
    
    // gameState többi részének alaphelyzetbe állítása
    gameState.playerStatusEffects = [];
    gameState.score = 0;
    gameState.enemyNumber = 1;
    gameState.gameOver = false;
    gameState.isPlayerTurn = true;
    
    // Első ellenfél létrehozása
    spawnNewEnemy();
    
    // UI és eseménykezelők inicializálása
    updateUI();
    setupEventListeners();
}

/** Főmenü */
const MAIN_MENU_HREF = '/menu/menu.html';

function goToMainMenuFromGame() {
    window.location.href = MAIN_MENU_HREF;
}

function getGameOverSaveStatusEl() {
    return document.getElementById('game-over-save-status');
}

function clearGameOverSaveStatus() {
    const el = getGameOverSaveStatusEl();
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
    el.classList.remove('is-error', 'is-success');
}

function showGameOverSaveStatus(message, kind) {
    const el = getGameOverSaveStatusEl();
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
    el.classList.remove('is-error', 'is-success');
    if (kind === 'error') el.classList.add('is-error');
    if (kind === 'success') el.classList.add('is-success');
}

function setGameOverButtonsDisabled(disabled) {
    document.getElementById('game-over-menu-btn')?.toggleAttribute('disabled', disabled);
    const saveBtn = document.getElementById('game-over-save-btn');
    if (saveBtn) {
        saveBtn.disabled = disabled;
        if (disabled) {
            saveBtn.dataset.labelRestore = saveBtn.textContent;
            saveBtn.textContent = typeof t === 'function' ? t('game.saving') : 'Saving…';
        } else if (saveBtn.dataset.labelRestore) {
            saveBtn.textContent = saveBtn.dataset.labelRestore;
            delete saveBtn.dataset.labelRestore;
        }
    }
}

/**
 * POST /score — JWT + score + classId (runs tábla + users.highscore frissítés szerveroldalon).
 */
async function saveRunAndReturn() {
    const token = localStorage.getItem('token');
    if (!token) {
        showGameOverSaveStatus('You must be logged in to save. Use Return to Main Menu and sign in.', 'error');
        return;
    }

    if (!gameState.player || gameState.player.id == null) {
        showGameOverSaveStatus('Missing class data; cannot save this run.', 'error');
        return;
    }

    const score = Math.round(Number(gameState.score));
    if (!Number.isFinite(score)) {
        showGameOverSaveStatus('Invalid score.', 'error');
        return;
    }

    clearGameOverSaveStatus();
    setGameOverButtonsDisabled(true);

    try {
        const res = await fetch(`${API_URL}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                score,
                classId: gameState.player.id,
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('userProfile');
            showGameOverSaveStatus('Session expired. Redirecting to sign-in…', 'error');
            setGameOverButtonsDisabled(false);
            setTimeout(() => {
                window.location.replace('/login/login.html');
            }, 1500);
            return;
        }

        if (!res.ok) {
            showGameOverSaveStatus(data.error || `Save failed (${res.status}).`, 'error');
            setGameOverButtonsDisabled(false);
            return;
        }

        window.location.replace(MAIN_MENU_HREF);
    } catch (err) {
        console.error('saveRunAndReturn:', err);
        showGameOverSaveStatus('Network error. Check the server and try again.', 'error');
        setGameOverButtonsDisabled(false);
    }
}

function setupEventListeners() {
    const surrenderBtn = document.getElementById('surrender-btn');
    if (surrenderBtn) {
        surrenderBtn.addEventListener('click', () => {
            // A játékos feladja -> azonnali játék vége
            if (!gameState.gameOver) {
                addLog(
                    tt('game.combat.surrender', { player: gameState.player.name }),
                    'player',
                    'effect'
                );
                endGame();
            }
        });
    }

    const gameOverMenuBtn = document.getElementById('game-over-menu-btn');
    if (gameOverMenuBtn) {
        gameOverMenuBtn.addEventListener('click', () => goToMainMenuFromGame());
    }

    const gameOverSaveBtn = document.getElementById('game-over-save-btn');
    if (gameOverSaveBtn) {
        gameOverSaveBtn.addEventListener('click', () => {
            void saveRunAndReturn();
        });
    }
}
































// ELLENFELEK MENEDZSELÉSE


function spawnNewEnemy() {
    // Véletlen ellenfél kiválasztása
    const enemyIndex = Math.floor(Math.random() * gameData.enemies.length);
    const enemyTemplate = gameData.enemies[enemyIndex];
    
    if (!enemyTemplate) {
        console.error('Enemy template not found');
        return;
    }
    
    // Ellenfél objektum létrehozása
    gameState.enemy = {
        id: enemyTemplate.id,
        name: enemyTemplate.name,
        health: enemyTemplate.baseHealth,
        maxHealth: enemyTemplate.baseHealth,
        abilities: enemyTemplate.abilities.map(ab => {
            const ability = gameData.enemyAbilities.find(a => a.id === ab.abilityId);
            if (!ability) {
                console.warn(`Enemy ability ${ab.abilityId} not found`);
                return null;
            }
            return {
                ...ability,
                chance: ab.chance,
                cooldown: ab.cooldown
            };
        }).filter(Boolean) // Null elemek kiszűrése
    };
    
    // Ellenfélhez tartozó gameState mezők alaphelyzetbe állítása
    gameState.enemyStatusEffects = [];
    gameState.enemyCooldowns = {};
    
    // Ellenfél név és megjelenítés frissítése — az `icon` adatbázisból érkezik
    const displayGlyph = String(enemyTemplate.icon ?? '').trim();
    if (!displayGlyph) {
        console.warn(
            `Enemy "${enemyTemplate.name}" (id ${enemyTemplate.id}) has no icon in the database — set enemies.icon in Supabase.`
        );
    }
    const enemyDisplay = document.getElementById('enemy-display');
    const enemyNameElement = document.getElementById('enemy-name');

    stopEnemyIconIdle();
    stopEnemyIconIdle = () => {};
    if (enemyDisplay && typeof characterIcon !== 'undefined' && characterIcon.renderInto) {
        stopEnemyIconIdle = characterIcon.renderInto(enemyDisplay, {
            icon: displayGlyph,
            iconAlt: enemyTemplate.iconAlt ?? null,
            fallbackChar: '👹',
        });
    } else if (enemyDisplay) {
        enemyDisplay.textContent = displayGlyph;
    }
    if (enemyNameElement) {
        enemyNameElement.textContent = gameState.enemy.name;
    }
    
    // Napló
    console.log(`[Enemy Spawned] ${gameState.enemy.name} appears!`);
    addLog(tt('game.combat.enemy_appears', { enemy: gameState.enemy.name }), 'enemy');
}


function defeatEnemy() {
    gameState.score += Math.floor(gameState.enemy.maxHealth);
    gameState.enemyNumber++;
    
    console.log(`[Enemy Defeated] ${gameState.enemy.name} is defeated! Score: +${Math.floor(gameState.enemy.maxHealth)}`);
    addLog(
        tt('game.combat.enemy_defeated', {
            enemy: gameState.enemy.name,
            score: Math.floor(gameState.enemy.maxHealth),
        }),
        'player',
        'heal'
    );
    
    // Rövid késleltetés
    setTimeout(() => {
        console.log(`[Spawning] New enemy spawning...`);
        spawnNewEnemy();
        gameState.isPlayerTurn = true;
        console.log(`[Turn] Player turn set to true, updating UI`);
        updateUI();
    }, 1500);
}



































// UI FRISSÍTÉSEI


function updateUI() {
    if (!gameState.player || !gameState.enemy) {
        return; // Ne frissítsen ha nincs inicializálva a játék
    }
    
    // játékos statok frissítése
    updateHealthBar('player', gameState.player.health, gameState.player.maxHealth);
    updateManaBar(gameState.player.mana, gameState.player.maxMana);
    document.getElementById('player-health-text').textContent = 
        `${gameState.player.health}/${gameState.player.maxHealth}`;
    document.getElementById('player-mana-text').textContent = 
        `${gameState.player.mana}/${gameState.player.maxMana}`;
    document.getElementById('player-name').textContent = gameState.player.name;
    
    // ellenfél statok frissítése
    updateHealthBar('enemy', gameState.enemy.health, gameState.enemy.maxHealth);
    document.getElementById('enemy-health-text').textContent = 
        `${gameState.enemy.health}/${gameState.enemy.maxHealth}`;
    document.getElementById('enemy-name').textContent = gameState.enemy.name;
    
    // pontszám frissítése
    document.getElementById('score').textContent = gameState.score;
    
    // státusz effektek frissítése
    updateStatusEffects('player', gameState.playerStatusEffects);
    updateStatusEffects('enemy', gameState.enemyStatusEffects);
    
    // képességek renderelése
    renderAbilities();
}

/**
 * health bar frissítése
 * @param {string} character - 'player' vagy 'enemy'
 * @param {number} current - Jelenlegi HP
 * @param {number} max - Maximális HP
 */
function updateHealthBar(character, current, max) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const healthBar = document.getElementById(`${character}-health-bar`);
    if (healthBar) {
        healthBar.style.width = `${percentage}%`;
    }
}

/**
 * mana bar frissítése
 * @param {number} current - Jelenlegi mana
 * @param {number} max - Maximális mana
 */
function updateManaBar(current, max) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const manaBar = document.getElementById('player-mana-bar');
    if (manaBar) {
        manaBar.style.width = `${percentage}%`;
    }
}

/**
 * státusz effektek megjelenítésének frissítése
 * @param {string} character - 'player' vagy 'enemy'
 * @param {Array} effects - Státuszeffektek tömbje
 */
function updateStatusEffects(character, effects) {
    const container = document.getElementById(`${character}-status-effects`);
    if (!container) return;

    closeGameTooltip()

    container.innerHTML = '';

    effects.forEach(effect => {
        const effectEl = document.createElement('div');
        effectEl.className = `status-effect ${effect.type}`;

        // megjelenítés "name xx" stackelőknek, "name (x)" durationösöknek
        if (effect.isStackable) {
            effectEl.textContent = `${effect.name} x${effect.stackCount}`;
        } else {
            effectEl.textContent = `${effect.name} (${effect.duration})`;
        }

        const tip = effect.description || getEffectDefinition(effect.type)?.description;
        if (tip) {
            effectEl.setAttribute('role', 'button');
            effectEl.setAttribute('tabindex', '0');
            effectEl.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleGameTooltip(effectEl, tip);
            });
            effectEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleGameTooltip(effectEl, tip);
                }
            });
        }

        container.appendChild(effectEl);
    });
}


function renderAbilities() {
    const container = document.getElementById('abilities-container')
    if (!container || !gameState.player) return

    closeGameTooltip()

    container.innerHTML = ''

    // Megnézzük a God of Chaos aktív e
    const godOfChaosActive = gameState.playerStatusEffects.find(e => e.type === 'god_of_chaos')
    // Megnézzük a God of Divinity aktív e
    const godOfDivinityActive = gameState.playerStatusEffects.find(e => e.type === 'god_of_divinity')
    // God of Time (Final Form) — Restart requires this
    const godOfTimeActive = gameState.playerStatusEffects.find(e => e.type === 'god_of_time')

    gameState.player.abilities.forEach((ability, index) => {
        if (!ability) return; // skippeljük az undefined ability-ket

        const slot = document.createElement('div')
        slot.className = 'ability-slot'

        const btn = document.createElement('button')
        btn.className = 'ability-btn'

        // Disable ha nincs mana, playerTurn, vagy vége a játéknak
        const requiredMana = getAbilityManaCost(ability, gameState.player.mana);

        let canUse =
                     Number.isFinite(requiredMana) &&
                     gameState.player.mana >= requiredMana &&
                     gameState.isPlayerTurn &&
                     !gameState.gameOver;

        // Ha God of Chaos aktív, csak a 11-es indexű képességet engedélyezze (Reality-breaking Shot)
        if (godOfChaosActive && ability.id !== 11) {
            canUse = false;
        }

        // 14-es indexű képesség (Slashes of Divinity) disabled alapból, enabled lesz God of Divinity aktív állapotában
        if (ability.id === 14 && !godOfDivinityActive) {
            canUse = false;
        }

        // 4-es képesség (Restart): csak God of Time mellett használható
        if (ability.id === 4 && !godOfTimeActive) {
            canUse = false;
        }

        // 20-as indexű képesség (Death's Maw) disabled ha az ellenfélnek nincs "impaled" státusza
        if (ability.id === 20) {
            const enemyImpaled = gameState.enemyStatusEffects.find(e => e.type === 'impaled')
            if (!enemyImpaled) {
                canUse = false;
            }
        }

        btn.disabled = !canUse;

        // gomb szövegeinek megjelenítése
        btn.innerHTML = `
            <div class="ability-name">${ability.name}</div>
            <div class="ability-mana">MP: ${ability.mana}</div>
        `;

        btn.addEventListener('click', () => void usePlayerAbility(ability));
        slot.appendChild(btn)

        if (ability.description) {
            const infoBtn = document.createElement('button')
            infoBtn.type = 'button'
            infoBtn.className = 'ability-info-btn'
            infoBtn.setAttribute(
                'aria-label',
                typeof t === 'function' ? t('game.ability_details') : 'Ability details'
            )
            infoBtn.textContent = 'i'
            infoBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleGameTooltip(infoBtn, ability.description)
            })
            slot.appendChild(infoBtn)
        } else {
            slot.classList.add('ability-slot--solo')
        }

        container.appendChild(slot)
    });
}

/** @type {(() => void) | null} */
let gameTooltipDismissCleanup = null
/** @type {HTMLElement | null} */
let gameTooltipCurrentTarget = null

function getOrCreateGameTooltip() {
    let el = document.getElementById('game-tooltip')
    if (!el) {
        el = document.createElement('div')
        el.id = 'game-tooltip'
        el.className = 'tooltip'
        document.body.appendChild(el)
    }
    return el
}

/** Közös tooltip kezelés a képesség infó gombokhoz és státusz chipekhez (kattintás/tap, nem hover). */
function closeGameTooltip() {
    if (gameTooltipDismissCleanup) {
        gameTooltipDismissCleanup()
        gameTooltipDismissCleanup = null
    }
    const tooltip = document.getElementById('game-tooltip')
    if (tooltip) tooltip.classList.remove('visible')
    gameTooltipCurrentTarget = null
}

/**
 * @param {HTMLElement} targetEl - A buborékhoz horgonyként használt chip vagy infó vezérlő
 * @param {string} text
 */
function toggleGameTooltip(targetEl, text) {
    const tooltip = getOrCreateGameTooltip()
    if (tooltip.classList.contains('visible') && gameTooltipCurrentTarget === targetEl) {
        closeGameTooltip()
        return
    }

    closeGameTooltip()

    gameTooltipCurrentTarget = targetEl
    tooltip.textContent = text
    tooltip.classList.add('visible')
    requestAnimationFrame(() => {
        positionTooltip(tooltip, targetEl)
        requestAnimationFrame(() => positionTooltip(tooltip, targetEl))
    })

    const onDocClick = (e) => {
        const t = e.target
        if (t && (tooltip.contains(t) || targetEl.contains(t))) return
        closeGameTooltip()
    }
    const onKey = (e) => {
        if (e.key === 'Escape') closeGameTooltip()
    }
    setTimeout(() => {
        document.addEventListener('click', onDocClick, true)
        document.addEventListener('keydown', onKey)
    }, 0)

    gameTooltipDismissCleanup = () => {
        document.removeEventListener('click', onDocClick, true)
        document.removeEventListener('keydown', onKey)
    }
}

/**
 * a tooltip relatív elhelyezése az elementekhez
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {HTMLElement} target - Target element
 */
function positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // előszőr felé próbáljuk megjeleníteni, ha nincs hely akkor meg alá
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    
    if (spaceAbove >= tooltipRect.height + 10) {
        // felé
        tooltip.style.top = `${rect.top + scrollY - tooltipRect.height - 8}px`;
        tooltip.classList.remove('below');
        tooltip.classList.add('above');
    } else {
        // alá
        tooltip.style.top = `${rect.bottom + scrollY + 8}px`;
        tooltip.classList.remove('above');
        tooltip.classList.add('below');
    }
    
    // középre igazítás targethez képest
    tooltip.style.left = `${rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2)}px`;
    
    // biztosítsuk hogy ne legyen off-screen a tooltip
    const tooltipLeft = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    const padding = 10;
    
    if (tooltipLeft < padding) {
        tooltip.style.left = `${padding + scrollX}px`;
    } else if (tooltipLeft + tooltipRect.width > window.innerWidth - padding) {
        tooltip.style.left = `${window.innerWidth - tooltipRect.width - padding + scrollX}px`;
    }
}

/**
 * combat loghoz új üzenet (illetve csak 10 üzenet megtartása)
 * @param {string} message - Megjelenítendő üzenet
 * @param {string} type - 'player' vagy 'enemy'
 * @param {string} category - 'damage', 'heal', 'effect', etc.
 */
function addLog(message, type = '', category = '') {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;
    
    // új log üzenet
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type} ${category}`;
    logEntry.textContent = message;
    
    // konténerhez adás
    logContainer.appendChild(logEntry);
    
    // csak az utolsó 10-et tartjuk meg
    while (logContainer.children.length > 10) {
        logContainer.removeChild(logContainer.firstChild);
    }
    
    // Automatikusan az aljára ugrik új log esetén
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Képességhasználatonként egy összegző combat-log sor: sebzés, öngyógyítás, MP visszatöltés, extra megjegyzések.
 * @type {{ isPlayer: boolean, abilityName: string, dealt: number, healed: number, mpGained: number, notes: string[] } | null}
 */
let activeAbilityContext = null;

function startAbilityContext(isPlayer, abilityName) {
    activeAbilityContext = {
        isPlayer,
        abilityName: abilityName || 'Ability',
        dealt: 0,
        healed: 0,
        mpGained: 0,
        notes: [],
    };
}

function noteAbilityLine(text) {
    if (activeAbilityContext && text) activeAbilityContext.notes.push(text);
}

function noteAbilityKey(keyPath, vars) {
    noteAbilityLine(tt(keyPath, vars));
}

function recordAbilityMpGained(amount) {
    if (activeAbilityContext && amount > 0) activeAbilityContext.mpGained += amount;
}

function flushAbilityContext() {
    const ctx = activeAbilityContext;
    activeAbilityContext = null;
    if (!ctx) return;
    const actor = ctx.isPlayer ? gameState.player : gameState.enemy;
    if (!actor) return;
    const parts = [];
    if (ctx.dealt > 0) {
        parts.push(tt('game.combat.summary_dealt_damage', { amount: ctx.dealt }));
    }
    if (ctx.healed > 0) {
        parts.push(tt('game.combat.summary_healed_hp', { amount: ctx.healed }));
    }
    if (ctx.mpGained > 0) {
        parts.push(tt('game.combat.summary_restored_mp', { amount: ctx.mpGained }));
    }
    for (const n of ctx.notes) parts.push(n);
    if (parts.length === 0) return;
    const logType = ctx.isPlayer ? 'player' : 'enemy';
    let category = 'effect';
    if (ctx.dealt > 0) category = 'damage';
    else if (ctx.healed > 0 || ctx.mpGained > 0) category = 'heal';
    addLog(
        tt('game.combat.ability_summary', {
            actor: actor.name,
            ability: ctx.abilityName,
            summary: parts.join(', '),
        }),
        logType,
        category
    );
}

/** Kör eleji effekt tick: DoT összesítések és opcionális extra hatások (pl. mezőgyújtás). */
let effectTickContext = null;
/** @type {{ player: string[], enemy: string[] } | null} */
let effectTickNameSnapshot = null;

function beginEffectTickTracking() {
    effectTickContext = {
        player: { poison: 0, burn: 0, chrono: 0, manaRegen: 0, extras: [] },
        enemy: { poison: 0, burn: 0, chrono: 0, manaRegen: 0, extras: [] },
    };
    effectTickNameSnapshot = {
        player: snapshotEffectLabels(gameState.playerStatusEffects),
        enemy: snapshotEffectLabels(gameState.enemyStatusEffects),
    };
}

function snapshotEffectLabels(effects) {
    if (!effects || !effects.length) return [];
    return effects.map((e) =>
        e.isStackable ? `${e.name} x${e.stackCount}` : e.name
    );
}

function addEffectTickExtra(isPlayer, text) {
    if (!effectTickContext || !text) return;
    const key = isPlayer ? 'player' : 'enemy';
    effectTickContext[key].extras.push(text);
}

function flushEffectTickLogs() {
    if (!effectTickContext || !effectTickNameSnapshot) {
        effectTickContext = null;
        effectTickNameSnapshot = null;
        return;
    }
    emitOneEffectTickLine(true);
    emitOneEffectTickLine(false);
    effectTickContext = null;
    effectTickNameSnapshot = null;
}

function resetEffectTickSide(isPlayer) {
    if (!effectTickContext) return;
    const key = isPlayer ? 'player' : 'enemy';
    effectTickContext[key] = { poison: 0, burn: 0, chrono: 0, manaRegen: 0, extras: [] };
    if (effectTickNameSnapshot) {
        effectTickNameSnapshot[key] = [];
    }
}

/** Egy effekt-tick log kiírása az adott oldalra, majd az oldali számlálók ürítése. */
function flushOneEffectTickLineNow(isPlayer) {
    emitOneEffectTickLine(isPlayer);
    resetEffectTickSide(isPlayer);
}

function effectTickSideHasPendingLine(isPlayer) {
    if (!effectTickContext || !effectTickNameSnapshot) return false;
    const key = isPlayer ? 'player' : 'enemy';
    const st = effectTickContext[key];
    const names = effectTickNameSnapshot[key] || [];
    const parts = [];
    if (names.length) {
        parts.push(tt('game.combat.tick_is', { effects: names.join(', ') }));
    }
    if (st.poison) parts.push(tt('game.combat.tick_takes_poison', { amount: st.poison }));
    if (st.burn) parts.push(tt('game.combat.tick_takes_burn', { amount: st.burn }));
    if (st.chrono) parts.push(tt('game.combat.tick_takes_chrono', { amount: st.chrono }));
    if (st.manaRegen) parts.push(tt('game.combat.tick_restores_mp', { amount: st.manaRegen }));
    if (st.extras && st.extras.length) parts.push(...st.extras);
    return parts.length > 0;
}

/**
 * Karaktert érő sebzés log-stílusa: az ellenfél oszlopát/kategóriáját (`damage`) használjuk,
 * így a DoT sorok vizuálisan igazodnak a "ki okozta" időzítéshez.
 * @param {boolean} victimIsPlayer
 * @returns {'player' | 'enemy'}
 */
function logActorTypeForDamageTo(victimIsPlayer) {
    return victimIsPlayer ? 'enemy' : 'player';
}

function emitOneEffectTickLine(isPlayer) {
    const character = isPlayer ? gameState.player : gameState.enemy;
    if (!character) return;
    const key = isPlayer ? 'player' : 'enemy';
    const st = effectTickContext[key];
    const names = effectTickNameSnapshot[key] || [];
    const parts = [];
    if (names.length) {
        parts.push(tt('game.combat.tick_is', { effects: names.join(', ') }));
    }
    if (st.poison) parts.push(tt('game.combat.tick_takes_poison', { amount: st.poison }));
    if (st.burn) parts.push(tt('game.combat.tick_takes_burn', { amount: st.burn }));
    if (st.chrono) parts.push(tt('game.combat.tick_takes_chrono', { amount: st.chrono }));
    if (st.manaRegen) parts.push(tt('game.combat.tick_restores_mp', { amount: st.manaRegen }));
    for (const x of st.extras) parts.push(x);
    if (!parts.length) return;
    const msg = tt('game.combat.tick_line', {
        character: character.name,
        summary: parts.join(', '),
    });
    const hasDotDamage = st.poison > 0 || st.burn > 0 || st.chrono > 0;
    if (hasDotDamage) {
        addLog(msg, logActorTypeForDamageTo(isPlayer), 'damage');
    } else if (st.manaRegen > 0 && isPlayer) {
        addLog(msg, 'player', 'heal');
    } else {
        addLog(msg, isPlayer ? 'player' : 'enemy', 'effect');
    }
}




































// HARCRENDSZER

/** Várakozás minden képességhasználat után és az effekt-tick szegmensek között (korábban 600 ms). */
const COMBAT_ACTION_GAP_MS = 1800;
/** Várakozás az utolsó effekt-tick után a következő játékos input előtt (korábban 450 ms). */
const COMBAT_ROUND_END_GAP_MS = 1350;

/**
 * Egy képesség MP költségének meghatározása ellenőrzéshez és levonáshoz.
 * Speciális címke esetén az aktuális MP teljes összege fogy el (pl. Reality-breaking Shot).
 * @returns {number} Véges költség, vagy NaN ha a mana mező nem értelmezhető számként.
 */
function getAbilityManaCost(ability, currentMana) {
    if (!ability) return NaN;
    const m = ability.mana;
    if (m === '100% current MP') return currentMana;
    if (typeof m === 'number' && Number.isFinite(m)) return m;
    const n = parseInt(String(m).trim(), 10);
    return Number.isFinite(n) ? n : NaN;
}

/**
 * játékos képességet használ
 * @param {Object} ability - A képesség objektum amit használunk
 */
async function usePlayerAbility(ability) {
    const requiredMana = getAbilityManaCost(ability, gameState.player.mana);

    if (
        !Number.isFinite(requiredMana) ||
        gameState.player.mana < requiredMana ||
        !gameState.isPlayerTurn ||
        gameState.gameOver
    ) {
        return;
    }
    
    //megvizsgáljuk meghal e a játékos status effect check után
    if (!checkDeath()) return;
    
    // megvizsgáljuk tud e csinálni valamit a játékos
    const playerCanAct = canCharacterAct(true);
    if (!playerCanAct.canAct) {
        addLog(playerCanAct.reason, 'player', 'effect');
        // az ellenfél akkor is támadhat
        const enemyAbility = chooseEnemyAbility();
        
        // megvizsgáljuk az ellenfél tud e csinálni valamit
        const enemyCanAct = canCharacterAct(false);
        if (!enemyCanAct.canAct) {
            addLog(enemyCanAct.reason, 'enemy', 'effect');
            // ha egyik se tud csinálni semmit, skip
            gameState.isPlayerTurn = true;
            updateUI();
            return;
        }
        
        await resolveCombatTurn(null, enemyAbility); // null = player skipped
        return;
    }

    // Restart (id 4): only while God of Time (Final Form) is active
    if (
        ability.id === 4 &&
        !gameState.playerStatusEffects.some((e) => e.type === 'god_of_time')
    ) {
        addLog(
            tt('game.combat.need_god_of_time', {
                player: gameState.player.name,
                ability: ability.name,
            }),
            'player',
            'effect'
        );
        return;
    }
    
    // játékos használ egy képességet
    gameState.isPlayerTurn = false;
    // Deduct mana (same rules as getAbilityManaCost)
    if (ability.mana === '100% current MP') {
        gameState.player.mana = 0;
    } else {
        gameState.player.mana -= requiredMana;
    }
    
    // ellenfél választ képességet
    const enemyAbility = chooseEnemyAbility();
    
    // megvizsgáljuk az ellenfél tud e csinálni valamit (lehet csinálok egy függvényt ehhez)
    const enemyCanAct = canCharacterAct(false);
    if (!enemyCanAct.canAct) {
        addLog(enemyCanAct.reason, 'enemy', 'effect');
        await resolveCombatTurn(ability, null); // null = enemy skipped
        return;
    }
    
    // képesség típus alapján állítunk sorrendet
    await resolveCombatTurn(ability, enemyAbility);
}

/**
 * ellenfél választ képességet
 * @returns {Object} A kiválasztott képesség
 */
function chooseEnemyAbility() {
    if (!gameState.enemy || !gameState.enemy.abilities) {
        return null;
    }
    
    // filtereljük a cooldownon lévő képességeket
    const availableAbilities = gameState.enemy.abilities.filter(ab => {
        const cooldownKey = `${gameState.enemy.id}_${ab.id}`;
        const cooldown = gameState.enemyCooldowns[cooldownKey] || 0;
        return cooldown === 0;
    });
    
    if (availableAbilities.length === 0) {
        // ha mindegyik cooldownon lenne (sose fog megtörténni, csak biztonság kedvéért)
        console.log("Nem volt valid képesség");
        return gameState.enemy.abilities[0] || null;
    }
    
    // total chance számítás (cooldownon lévő képességek miatt)
    const totalChance = availableAbilities.reduce((sum, ab) => sum + ab.chance, 0);
    let random = Math.random() * totalChance;
    
    for (const ability of availableAbilities) {
        random -= ability.chance;
        if (random <= 0) {
            // Cooldown beállítása
            const cooldownKey = `${gameState.enemy.id}_${ability.id}`;
            gameState.enemyCooldowns[cooldownKey] = ability.cooldown;
            return ability;
        }
    }
    
    return availableAbilities[0] || null;
}

/**
 * Combat elosztása képesség típusok alapján
 * @param {Object|null} playerAbility - Játékos képessége (null ha kimarad)
 * @param {Object|null} enemyAbility - Ellenfél képessége (null ha kimarad)
 */
async function resolveCombatTurn(playerAbility, enemyAbility) {
    console.log(`[Combat Turn] Starting turn - Player: ${playerAbility ? playerAbility.name : 'skipped'}, Enemy: ${enemyAbility ? enemyAbility.name : 'skipped'}`);

    // Egymás után futnak az oldalak: teljes játékos képesség, majd teljes ellenfél képesség.
    if (playerAbility) {
        applyAbility(playerAbility, true);
        updateUI();
        if (!checkDeath()) return;
        await delay(COMBAT_ACTION_GAP_MS);
    }
    if (enemyAbility) {
        applyAbility(enemyAbility, false);
        updateUI();
        if (!checkDeath()) return;
        await delay(COMBAT_ACTION_GAP_MS);
    }

    // cooldownok csökkentése
    Object.keys(gameState.enemyCooldowns).forEach(key => {
        if (gameState.enemyCooldowns[key] > 0) {
            gameState.enemyCooldowns[key]--;
        }
    });

    if (!checkDeath()) {
        console.log(`[Combat Turn] Turn ended early due to death`);
        return;
    }

    await processRoundEndEffectsSequential();

    if (!checkDeath()) {
        console.log(`[Combat Turn] Turn ended after status ticks due to death`);
        return;
    }

    gameState.isPlayerTurn = true;
    console.log(`[Combat Turn] Turn completed, setting player turn to true`);
    updateUI();
}

/**
 * csak segítség-függvény a "delay" funkciókhoz
 * @param {number} ms - Késleltetés ezredmásodpercben
 * @returns {Promise} Promise, ami a késleltetés után teljesül
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Halálállapot ellenőrzése és kezelése (játékosnál reshapinggel együtt).
 * @returns {boolean} true, ha folytatódhat a játék; false, ha vége.
 */
function checkDeath() {
    // Játékos halálának ellenőrzése
    if (gameState.player.health <= 0) {
        console.log(`[Death Check] Player health is ${gameState.player.health}`);
        // Reshaping effekt ellenőrzése
        const playerReshaping = gameState.playerStatusEffects.find(e => e.type === 'reshaping');
        if (playerReshaping && processReshaping(playerReshaping, gameState.player, true)) {
            // A reshaping megakadályozta a halált
            console.log(`[Death Check] Player reshaped and survived`);
            updateUI();
            return true; // Játék folytatása
        } else {
            // A játékos meghal
            console.log(`[Death Check] Player died, ending game`);
            triggerEvent('onDeath', { character: 'player' });
            endGame();
            return false; // Játék vége
        }
    }
    
    // Ellenfél halálának ellenőrzése
    if (gameState.enemy.health <= 0) {
        console.log(`[Death Check] Enemy health is ${gameState.enemy.health}, calling defeatEnemy()`);
        triggerEvent('onDeath', { character: 'enemy' });
        defeatEnemy();
        return false; // Kör vége (ellenfél legyőzve)
    }
    
    return true; // Mindkét fél él, mehet tovább
}

/**
 * Minden képességet itt fogunk kezelni
 * @param {Object} ability - Maga a képesség objektum
 * @param {boolean} isPlayer - Játékos használja e
 */
function applyAbility(ability, isPlayer) {
    if (!ability) return
    
    // caster és target megállapítása
    const caster = isPlayer ? gameState.player : gameState.enemy

    // Konzolnapló a képességhasználathoz
    console.log(`[${caster.name}] used [${ability.name}]`);

    startAbilityContext(isPlayer, ability.name);
    try {
    // Elágazás képesség ID alapján (játékos: 1-20, ellenfél: 100+)
    switch (ability.id) {
        // Játékos képességek
        case 1:
            applyPommelStrike(ability)
            return
        case 2:
            applyRevertTime(ability)
            return
        case 3:
            applyGodOfTime(ability)
            return
        case 4:
            applyRestart(ability)
            return
        case 5:
            applyQuickShot(ability)
            return
        case 6:
            applyChaosShot(ability)
            return
        case 7:
            applyTakeAim(ability)
            return
        case 8:
            applyGodOfChaos(ability)
            return
        case 9:
            applyWorldBShot(ability)
            return
        case 10:
            applyGalaxyBShot(ability)
            return
        case 11:
            applyRealityBShot(ability)
            return
        case 12:
            applyIntoPieces(ability)
            return
        case 13:
            applySoulSlashes(ability)
            return
        case 14:
            applySlashesOfDivinity(ability)
            return
        case 15:
            applyGodOfDivinity(ability)
            return
        case 16:
            applyDivineImmortality(ability)
            return
        case 17:
            applyTendrilStab(ability)
            return
        case 18:
            applyDeathBlossom(ability)
            return
        case 19:
            applyGodOfDeath(ability)
            return
        case 20:
            applyDeathsMaw(ability)
            return
            
        // Ellenfél képességek
        case 100:
            applyEnemyClawAttack(ability)
            return
        case 101:
            applyEnemyBash(ability)
            return
        case 102:
            applyEnemyPoisonStrike(ability)
            return
        case 103:
            applyEnemyFireBreath(ability)
            return
        case 104:
            applyEnemyDragonsCurse(ability)
            return
        default:
            // Ha ide jutunk, a képességhez nincs speciális kezelő
            // Normál játékmenetben nem kellene előfordulnia, de naplózzuk figyelmeztetésként
            console.warn(`No special handler found for ability ${ability.id} (isPlayer: ${isPlayer})`);
            return
    }
    } finally {
        flushAbilityContext();
    }
    
}




















// SPECIÁLIS KEZELÉS A KÉPESSÉGEKNEK

/**
 * Speciális kezelés Pommel Strike-hoz
 * @param {Object} ability - A Pommel Strike képesség
 */
function applyPommelStrike(ability){
    const caster = gameState.player
    const target = gameState.enemy
    const missingHealth = caster.maxHealth - caster.health
    const missingHealthScale = Math.floor(missingHealth%10)

    const baseDamage = calculateDamage(ability, caster, false)
    const actualDamage = Math.floor(baseDamage + missingHealthScale*5)

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', {target, damage: actualDamage, isPlayer: true})

    const manaGain = 15
    caster.mana = Math.min(caster.maxMana, caster.mana + manaGain)
    recordAbilityMpGained(manaGain)
}

/**
 * Speciális kezelés Revert Time-hoz
 * @param {Object} ability - A Revert Time képesség
 */
function applyRevertTime(ability) {
    const caster = gameState.player
    const target = gameState.enemy
    
    // Chrono-flame stackek az ellenfélnél
    const enemyChronoFlame = gameState.enemyStatusEffects.find(e => e.type === 'chrono_flame')
    const enemyStacks = enemyChronoFlame && enemyChronoFlame.isStackable ? enemyChronoFlame.stackCount : 0
    
    // Sebzés: minden Chrono-flame stack után 5 sebzés
    // Revert Time esetén stackenként számolunk, ezért közvetlenül számítjuk
    const damagePerStack = ability.power
    const totalDamage = enemyStacks * damagePerStack
    if (totalDamage > 0) {
        // Ideiglenes képesség objektum a sebzés számításhoz
        const tempAbility = { ...ability, power: totalDamage, scale: 0 } // scale=0, mert a sebzés már előre összesítve van
        const actualDamage = calculateDamage(tempAbility, caster, false)
        applyDamage(target, actualDamage, false)
        triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: true })
        noteAbilityKey('game.combat.note.revert_time_used_enemy_chrono', { stacks: enemyStacks })
    }
    
    // 1 Chrono-flame stack eltávolítása a játékostól
    const playerChronoFlame = gameState.playerStatusEffects.find(e => e.type === 'chrono_flame')
    if (playerChronoFlame && playerChronoFlame.isStackable && playerChronoFlame.stackCount > 0) {
        const removedStacks = 1
        const healAmount = 20 // Flat 20 HP restoration
        
        // Heal a játékosnak
        applyHeal(caster, healAmount, true)
        triggerEvent('onHeal', { target: caster, amount: healAmount, isPlayer: true })
        
        // Stack eltávolítása
        playerChronoFlame.stackCount -= removedStacks
        if (playerChronoFlame.stackCount <= 0) {
            const index = gameState.playerStatusEffects.indexOf(playerChronoFlame)
            if (index > -1) {
                gameState.playerStatusEffects.splice(index, 1)
            }
        }
        noteAbilityKey('game.combat.note.revert_time_removed_own_chrono', {})
    }
}

/**
 * Speciális kezelés Final Form-hoz (God of Time)
 * @param {Object} ability - A Final Form képesség
 */
function applyGodOfTime(ability) {
    const caster = gameState.player
    
    // God of Time transformation
    applyStatusEffect(caster, 'god_of_time', ability.power, true)
    
    // Mana növelése
    const manaIncrease = 50
    caster.maxMana += manaIncrease
    caster.mana += manaIncrease
    noteAbilityKey('game.combat.note.god_of_time_transform', { manaIncrease })
    recordAbilityMpGained(manaIncrease)
    
    // Chrono-flame stack hozzáadása mindkét félhez
    applyStatusEffect(caster, 'chrono_flame', 1, true)
    applyStatusEffect(gameState.enemy, 'chrono_flame', 1, false)
    noteAbilityKey('game.combat.note.god_of_time_chrono_both', {
        player: caster.name,
        enemy: gameState.enemy.name,
    })
}




/**
 * Speciális kezelés Restart-hoz
 * @param {Object} ability - A Restart képesség
 */
async function applyRestart(ability) {
    const caster = gameState.player
    if (!gameState.playerStatusEffects.some((e) => e.type === 'god_of_time')) {
        return
    }

    // Összes Chrono-flame stack összegyűjtése
    const playerChronoFlame = gameState.playerStatusEffects.find(e => e.type === 'chrono_flame')
    const enemyChronoFlame = gameState.enemyStatusEffects.find(e => e.type === 'chrono_flame')
    
    const playerStacks = playerChronoFlame && playerChronoFlame.isStackable ? playerChronoFlame.stackCount : 0
    const enemyStacks = enemyChronoFlame && enemyChronoFlame.isStackable ? enemyChronoFlame.stackCount : 0
    const totalStacks = playerStacks + enemyStacks
    
    // Heal: 20 HP minden stack után
    if (totalStacks > 0) {
        const healAmount = totalStacks * 20
        applyHeal(caster, healAmount, true)
        triggerEvent('onHeal', { target: caster, amount: healAmount, isPlayer: true })
        noteAbilityKey('game.combat.note.restart_consumed_chrono', { stacks: totalStacks })
    }
    
    // Összes Chrono-flame eltávolítása
    if (playerChronoFlame) {
        const index = gameState.playerStatusEffects.indexOf(playerChronoFlame)
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1)
        }
    }
    if (enemyChronoFlame) {
        const index = gameState.enemyStatusEffects.indexOf(enemyChronoFlame)
        if (index > -1) {
            gameState.enemyStatusEffects.splice(index, 1)
        }
    }
    
    // Új Chrono-flame stackek mindkét félnek
    applyStatusEffect(caster, 'chrono_flame', 1, true)
    applyStatusEffect(gameState.enemy, 'chrono_flame', 1, false)
    noteAbilityKey('game.combat.note.restart_chrono_again', {
        player: caster.name,
        enemy: gameState.enemy.name,
    })
    
    // God of Time átalakulás eltávolítása
    // const godOfTimeEffect = gameState.playerStatusEffects.find(e => e.type === 'god_of_time')
    // if (godOfTimeEffect) {
    //     const index = gameState.playerStatusEffects.indexOf(godOfTimeEffect)
    //     if (index > -1) {
    //         gameState.playerStatusEffects.splice(index, 1)
    //         addLog(`${caster.name} loses the God of Time transformation!`, 'player', 'effect')
    //     }
    // }
}

/**
 * Speciális kezelés a Quickshot képességnek
 * @param {Object} ability - A Quickshot képesség
 */
function applyQuickShot(ability){
    const caster = gameState.player
    const target = gameState.enemy

    const actualDamage = calculateDamage(ability, caster, false)

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', {target, damage: actualDamage, isPlayer: true})

    const manaGain = 25
    caster.mana = Math.min(caster.maxMana, caster.mana + manaGain)
    recordAbilityMpGained(manaGain)
}

/**
 * Speciális kezelés a Chaos Shot képességnek
 * @param {Object} ability - A Chaos Shot képesség
 */
function applyChaosShot(ability){
    const caster = gameState.player
    const target = gameState.enemy

    const enemyCracked = gameState.enemyStatusEffects.find(e => e.type === 'cracked')

    let actualDamage = calculateDamage(ability, caster, false)
    if (enemyCracked) {
        actualDamage = Math.floor(actualDamage * 1.5)
        applyStatusEffect(target, 'broken', 1, false)
        noteAbilityKey('game.combat.note.cracked_bonus_broken', {})
    } else {
        applyStatusEffect(target, 'cracked', 1, false)
        noteAppliedEffect('cracked', target.name)
    }

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', {target, damage: actualDamage, isPlayer: true})

    const manaGain = 25
    caster.mana = Math.min(caster.maxMana, caster.mana + manaGain)
    recordAbilityMpGained(manaGain)
    
    // Aiming státusz eltávolítása, ha aktív
    const aimingEffect = gameState.playerStatusEffects.find(e => e.type === 'aiming');
    if (aimingEffect) {
        const index = gameState.playerStatusEffects.indexOf(aimingEffect);
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1);
            noteAbilityKey('game.combat.note.stops_aiming', {})
            
            // Eredeti képességek visszaállítása
            if (gameState.player && gameState.player.originalAbilities) {
                gameState.player.abilities = [...gameState.player.originalAbilities];
                renderAbilities();
            }
        }
    }
}

/**
 * Speciális kezelés a Take Aim képességnek
 * @param {Object} ability - A Take Aim képesség
 */
function applyTakeAim(ability) {
    const caster = gameState.player

    // Aiming státusz felrakása
    applyStatusEffect(caster, 'aiming', ability.power, true)
    
    // Képesség csere, ha aiming aktív: 5->6, 7->8, 9->10
    const abilityMapping = {
        5: 6,  // Quickshot -> Chaos Shot
        7: 8,  // Take Aim -> Final Form (God of Chaos)
        9: 10  // World-breaking Shot -> Galaxy-breaking Shot
    };
    
    // Képességek helyben cseréje
    caster.abilities = caster.abilities.map(ab => {
        if (abilityMapping[ab.id]) {
            const upgradedAbility = gameData.abilities.find(a => a.id === abilityMapping[ab.id]);
            return upgradedAbility || ab;
        }
        return ab;
    });
    
    noteAbilityKey('game.combat.note.starts_aiming', {})

    // UI frissítése az új képességekhez
    renderAbilities();
}

/**
 * Speciális kezelés Final Form-hoz (God of Chaos)
 * @param {Object} ability - A Final Form képesség
 */
function applyGodOfChaos(ability) {
    const caster = gameState.player

    // Aiming státusz eltávolítása, ha aktív
    const aimingEffect = gameState.playerStatusEffects.find(e => e.type === 'aiming');
    if (aimingEffect) {
        const index = gameState.playerStatusEffects.indexOf(aimingEffect);
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1);
            noteAbilityKey('game.combat.note.stops_aiming', {})
        }
    }
    
    // god_of_chaos státusz felrakása
    applyStatusEffect(caster, 'god_of_chaos', ability.power, true)
    
    // Képesség csere God of Chaos alatt: 10->11
    const abilityMapping = {
        10: 11  // Galaxy-breaking Shot -> Reality-breaking Shot
    };
    
    // Képességek helyben cseréje
    caster.abilities = caster.abilities.map(ab => {
        if (abilityMapping[ab.id]) {
            const upgradedAbility = gameData.abilities.find(a => a.id === abilityMapping[ab.id]);
            return upgradedAbility || ab;
        }
        return ab;
    });
    
    noteAbilityKey('game.combat.note.god_of_chaos_transform', {})
    
    // UI frissítése az új képességekhez
    renderAbilities();
}

/**
 * Speciális kezelés a World-breaking Shot képességnek
 * @param {Object} ability - A World-breaking Shot képesség
 */
function applyWorldBShot(ability){
    const caster = gameState.player
    const target = gameState.enemy

    const actualDamage = calculateDamage(ability, caster, false)
    
    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: true })
}

/**
 * Speciális kezelés a Galaxy-breaking Shot képességnek
 * @param {Object} ability - A Galaxy-breaking Shot képesség
 */
function applyGalaxyBShot(ability){
    const caster = gameState.player
    const target = gameState.enemy

    // Ellenőrizzük, van-e már "cracked" az ellenfélen
    const enemyCracked = gameState.enemyStatusEffects.find(e => e.type === 'cracked');
    
    let actualDamage = calculateDamage(ability, caster, false);
    
    // Ha van "cracked", nő a sebzés és felkerül a "broken"
    if (enemyCracked) {
        actualDamage = Math.floor(actualDamage * 1.5); // +50% sebzés
        applyStatusEffect(target, 'broken', 1, false);
        noteAbilityKey('game.combat.note.cracked_bonus_broken', {})
    } else {
        // "cracked" státusz felrakása az ellenfélre
        applyStatusEffect(target, 'cracked', 1, false);
        noteAppliedEffect('cracked', target.name)
    }
    
    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: true })
    
    // Aiming státusz eltávolítása, ha aktív
    const aimingEffect = gameState.playerStatusEffects.find(e => e.type === 'aiming');
    if (aimingEffect) {
        const index = gameState.playerStatusEffects.indexOf(aimingEffect);
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1);
            noteAbilityKey('game.combat.note.stops_aiming', {})
            
            // Eredeti képességek visszaállítása
            if (gameState.player && gameState.player.originalAbilities) {
                gameState.player.abilities = [...gameState.player.originalAbilities];
                renderAbilities();
            }
        }
    }
}

/**
 * Speciális kezelés a Reality-breaking Shot képességnek
 * @param {Object} ability - A Reality-breaking Shot képesség
 */
function applyRealityBShot(ability){
    const caster = gameState.player
    const target = gameState.enemy

    const crackedStatusEffect = gameState.enemyStatusEffects.find(e=>e.type==="cracked")
    const brokenStatusEffect = gameState.enemyStatusEffects.find(e => e.type === "broken")
    if(crackedStatusEffect || brokenStatusEffect){
        // Azonnali kivégzés, ha az ellenfélen cracked vagy broken van
        target.health = 0
        noteAbilityKey('game.combat.note.reality_shot_instant_kill', { target: target.name })
        shakeHitPortrait(false)
    } else {
        const actualDamage = calculateDamage(ability, caster, false)
        
        applyDamage(target, actualDamage, false)
        triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: true })
    }
    
    // Max HP +50 (mindig megtörténik)
    caster.maxHealth += 50
    caster.health += 50
    noteAbilityKey('game.combat.note.reality_shot_hp_plus_50', {})
    
    // God of Chaos állapot eltávolítása és eredeti képességek visszaállítása
    const godOfChaosEffect = gameState.playerStatusEffects.find(e => e.type === 'god_of_chaos')
    if (godOfChaosEffect) {
        const index = gameState.playerStatusEffects.indexOf(godOfChaosEffect)
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1)
            noteAbilityKey('game.combat.note.god_of_chaos_ends', {})
        }
        
        // Eredeti képességek visszaállítása
        if (gameState.player && gameState.player.originalAbilities) {
            caster.abilities = [...gameState.player.originalAbilities];
            renderAbilities();
        }
    }
}

/**
 * Speciális kezelés a Soul Slashes képességnek
 * @param {Object} ability - A Soul Slashes képesség
 */
function applySoulSlashes(ability) {
    const caster = gameState.player
    const target = gameState.enemy


    // Divinity stackek lekérése
    const divinityEffect = gameState.playerStatusEffects.find(e => e.type === 'divinity');
    const divinityStacks = divinityEffect && divinityEffect.isStackable ? divinityEffect.stackCount : 0;
    const multiplier = 1 + divinityStacks;
    console.log(multiplier)

    const baseDamage = calculateDamage(ability, caster, false)
    const actualDamage = Math.floor(baseDamage * multiplier)

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', {target, damage: actualDamage, isPlayer: true})

    const baseManaGain = 3
    const manaGain = Math.floor(baseManaGain * multiplier)
    caster.mana = Math.min(caster.maxMana, caster.mana + manaGain)
    recordAbilityMpGained(manaGain)
    
    // 1 db divinity stack felrakása
    applyStatusEffect(caster, 'divinity', 1, true)
}

/**
 * Speciális kezelés a Slashes of Divinity képességnek
 * @param {Object} ability - A Slashes of Divinity képesség
 */
function applySlashesOfDivinity(ability) {
    const caster = gameState.player
    const target = gameState.enemy

    // Divinity stackek lekérése
    const divinityEffect = gameState.playerStatusEffects.find(e => e.type === 'divinity');
    const divinityStacks = divinityEffect && divinityEffect.isStackable ? divinityEffect.stackCount : 0;
    const multiplier = 1 + divinityStacks;

    const baseDamage = calculateDamage(ability, caster, false)
    const actualDamage = Math.floor(baseDamage * multiplier)

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', {target, damage: actualDamage, isPlayer: true})

    const baseHealAmount = 5
    const healAmount = Math.floor(baseHealAmount * multiplier)
    applyHeal(caster, healAmount, true)
    triggerEvent('onHeal', { target: caster, amount: healAmount, isPlayer: true })
    
    // Összes divinity stack elfogyasztása
    if (divinityEffect) {
        const index = gameState.playerStatusEffects.indexOf(divinityEffect);
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1);
        }
    }
}

/**
 * Speciális kezelés Final Form-hoz (God of Divinity)
 * @param {Object} ability - A Final Form képesség
 */
function applyGodOfDivinity(ability) {
    const caster = gameState.player
    
    // god_of_divinity státusz felrakása
    applyStatusEffect(caster, 'god_of_divinity', ability.power, true)
    
    noteAbilityKey('game.combat.note.god_of_divinity_transform', {})

    applyStatusEffect(caster, 'divinity', 10, true)
    
    // UI frissítése az új képességekhez
    renderAbilities();
}

/**
 * Speciális kezelés a Divine Immortality képességnek
 * @param {Object} ability - A Divine Immortality képesség
 */
function applyDivineImmortality(ability) {
    const caster = gameState.player    
    
    // Teljes gyógyítás max HP-ra
    const healAmount = caster.maxHealth - caster.health
    caster.health = caster.maxHealth
    triggerEvent('onHeal', { target: caster, amount: healAmount, isPlayer: true })
    if (activeAbilityContext && healAmount > 0) {
        activeAbilityContext.healed += healAmount
    }

    // Divinity stackek lekérése
    const divinityEffect = gameState.playerStatusEffects.find(e => e.type === 'divinity');
    const divinityStacks = divinityEffect && divinityEffect.isStackable ? divinityEffect.stackCount : 0;
    
    // Minden divinity stack +1 max HP-t ad
    const hpIncrease = divinityStacks
    if (hpIncrease > 0) {
        caster.maxHealth += hpIncrease
        caster.health += hpIncrease
        noteAbilityKey('game.combat.note.divine_immortality_max_hp_from_divinity', {
            hpIncrease,
        })
    }
    
    if (divinityEffect) {
        const index = gameState.playerStatusEffects.indexOf(divinityEffect);
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1);
        }
    }
}

/**
 * Speciális kezelés a Into Pieces képességnek
 * @param {Object} ability - A Into Pieces képesség
 */
function applyIntoPieces(ability) {
    const caster = gameState.player
    
    // Reshaping státusz felrakása
    applyStatusEffect(caster, 'reshaping', ability.power, true)
    noteAbilityKey('game.combat.note.into_pieces_reshaping', {})
    
    // Aiming státusz eltávolítása, ha aktív
    const aimingEffect = gameState.playerStatusEffects.find(e => e.type === 'aiming');
    if (aimingEffect) {
        const index = gameState.playerStatusEffects.indexOf(aimingEffect);
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1);
            noteAbilityKey('game.combat.note.stops_aiming', {})
            
            // Eredeti képességek visszaállítása
            if (gameState.player && gameState.player.originalAbilities) {
                gameState.player.abilities = [...gameState.player.originalAbilities];
                renderAbilities();
            }
        }
    }
}

/**
 * Speciális kezelés a Tendril Stab képességnek
 * @param {Object} ability - A Tendril Stab képesség
 */
function applyTendrilStab(ability) {
    const caster = gameState.player
    const target = gameState.enemy
    
    // Ellenőrizzük, aktív-e a God of Death
    const godOfDeathEffect = gameState.playerStatusEffects.find(e => e.type === 'god_of_death')
    
    // God of Death alatt erősített sebzés (40), +1 tendril stack, majd a státusz elfogy
    let damageAbility = ability
    if (godOfDeathEffect) {
        damageAbility = { ...ability, power: 40 }
    }

    const actualDamage = calculateDamage(damageAbility, caster, false)

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', {target, damage: actualDamage, isPlayer: true})

    const manaGain = 20
    caster.mana = Math.min(caster.maxMana, caster.mana + manaGain)
    recordAbilityMpGained(manaGain)

    // Ha aktív volt a God of Death, elfogyasztjuk és +1 tendril stacket adunk
    if (godOfDeathEffect) {
        // God of Death effekt eltávolítása
        const index = gameState.playerStatusEffects.indexOf(godOfDeathEffect)
        if (index > -1) {
            gameState.playerStatusEffects.splice(index, 1)
        }
        noteAbilityKey('game.combat.note.god_of_death_spent', {})

        // +1 tendril stack
        applyStatusEffect(caster, 'tendrils', 1, true)
        noteAbilityKey('game.combat.note.tendrils_plus_one', {})
    }

    // 50% esély az "impaled" státusz effekt alkalmazására
    if (Math.random() < 0.5) {
        applyStatusEffect(target, 'impaled', 0, false)
        noteAppliedEffect('impaled', target.name)
    }
}

/**
 * Speciális kezelés a Death Blossom képességnek
 * @param {Object} ability - A Death Blossom képesség
 */
function applyDeathBlossom(ability) {
    const caster = gameState.player
    const target = gameState.enemy

    // Játékos tendrils stackjeinek lekérése
    const tendrilsEffect = gameState.playerStatusEffects.find(e => e.type === 'tendrils')
    const tendrilStacks = tendrilsEffect && tendrilsEffect.isStackable ? tendrilsEffect.stackCount : 0

    // Sebzés: alap 3 + minden tendril stack után +3
    const baseDamage = 3
    const damagePerTendril = 3
    const totalDamage = baseDamage + tendrilStacks * damagePerTendril

    // Ideiglenes képesség, hogy a calculateDamage skálázási logikája megmaradjon
    const tempAbility = { ...ability, power: totalDamage, scale: 0 } // scale=0, mert a sebzés már összesítve van
    const actualDamage = calculateDamage(tempAbility, caster, false)

    applyDamage(target, actualDamage, false)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: true })
    noteAbilityKey('game.combat.note.used_tendrils_in_calc', { stacks: tendrilStacks })

    // 100% eséllyel felkerül az "impaled"
    applyStatusEffect(target, 'impaled', 0, false)
    noteAppliedEffect('impaled', target.name)
}

/**
 * Speciális kezelés a Final Form (God of Death) képsségnek
 * @param {Object} ability - A Final Form (God of Death) képesség
 */
function applyGodOfDeath(ability) {
    const caster = gameState.player
    
    // God of Death státusz felrakása a játékosra
    applyStatusEffect(caster, 'god_of_death', 0, true)
    noteAbilityKey('game.combat.note.god_of_death_transform', {})

    // 5 db tendril stack adása a játékosnak (stackelő buff)
    applyStatusEffect(caster, 'tendrils', 5, true)
    noteAbilityKey('game.combat.note.tendrils_plus_five', {})
}

/**
 * Speciális kezelés a Death's Maw képességnek
 * @param {Object} ability - A Death's Maw képesség
 */
function applyDeathsMaw(ability) {
    const caster = gameState.player
    const target = gameState.enemy

    // Alap gyógyítási érték
    const baseHeal = ability.power // 100

    // Ellenfél drained stackjeinek lekérése
    const drainedEffect = gameState.enemyStatusEffects.find(e => e.type === 'drained')
    const drainedStacks = drainedEffect && drainedEffect.isStackable ? drainedEffect.stackCount : 0

    // Gyógyítás csökkentés: drained stackenként 25%, maximum 100%
    const reductionPercent = Math.min(100, drainedStacks * 25)
    const healMultiplier = (100 - reductionPercent) / 100
    const actualHealAmount = Math.floor(baseHeal * healMultiplier)

    // Játékos gyógyítása
    if (actualHealAmount > 0) {
        applyHeal(caster, actualHealAmount, true)
        triggerEvent('onHeal', { target: caster, amount: actualHealAmount, isPlayer: true })
        if (drainedStacks > 0) {
            noteAbilityKey('game.combat.note.deaths_maw_heal_reduced', {
                reductionPercent,
                drainedStacks,
                target: target.name,
            })
        }
    } else {
        noteAbilityKey('game.combat.note.deaths_maw_no_heal', { target: target.name })
    }

    // "drained" státusz felrakása az ellenfélre
    applyStatusEffect(target, 'drained', 0, false)
    noteAppliedEffect('drained', target.name)

    // "impaled" elfogyasztása — ennek csak itt szabad eltűnnie
    const impaled = gameState.enemyStatusEffects.find((e) => e.type === 'impaled')
    if (impaled) {
        const idx = gameState.enemyStatusEffects.indexOf(impaled)
        if (idx > -1) gameState.enemyStatusEffects.splice(idx, 1)
    }
}








// ELLENFÉL KÉPESSÉGKEZELŐK

/**
 * Speciális kezelés Claw Attack-hoz (enemy)
 * @param {Object} ability - A Claw Attack képesség
 */
function applyEnemyClawAttack(ability) {
    const caster = gameState.enemy
    const target = gameState.player
    
    const actualDamage = calculateDamage(ability, caster, true)
    
    applyDamage(target, actualDamage, true)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: false })
}

/**
 * Speciális kezelés Bash-hoz (enemy)
 * @param {Object} ability - A Bash képesség
 */
function applyEnemyBash(ability) {
    const caster = gameState.enemy
    const target = gameState.player
    
    const actualDamage = calculateDamage(ability, caster, true)
    
    applyDamage(target, actualDamage, true)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: false })
    
    // Stun effekt
    if (ability.effect) {
        applyStatusEffect(target, ability.effect, ability.power, true)
        noteAppliedEffect(ability.effect, target.name)
    }
}

/**
 * Speciális kezelés Poison Strike-hoz (enemy)
 * @param {Object} ability - A Poison Strike képesség
 */
function applyEnemyPoisonStrike(ability) {
    const caster = gameState.enemy
    const target = gameState.player
    
    const actualDamage = calculateDamage(ability, caster, true)
    
    applyDamage(target, actualDamage, true)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: false })
    
    // Poison effekt
    if (ability.effect) {
        applyStatusEffect(target, ability.effect, ability.power, true)
        noteAppliedEffect(ability.effect, target.name)
    }
}

/**
 * Speciális kezelés Fire Breath-hoz (enemy)
 * @param {Object} ability - A Fire Breath képesség
 */
function applyEnemyFireBreath(ability) {
    const caster = gameState.enemy
    const target = gameState.player
    
    const actualDamage = calculateDamage(ability, caster, true)
    
    applyDamage(target, actualDamage, true)
    triggerEvent('onDamage', { target, damage: actualDamage, isPlayer: false })
    
    // Burn effekt
    if (ability.effect) {
        applyStatusEffect(target, ability.effect, ability.power, true)
        noteAppliedEffect(ability.effect, target.name)
    }
}

/**
 * Speciális kezelés Dragon's Curse-hoz (enemy)
 * @param {Object} ability - A Dragon's Curse képesség
 */
function applyEnemyDragonsCurse(ability) {
    const caster = gameState.enemy
    const target = gameState.player
    
    // Weakness debuff
    if (ability.effect) {
        applyStatusEffect(target, ability.effect, ability.power, true)
        noteAppliedEffect(ability.effect, target.name)
    }
}






























// SEBZÉS ÉS HEAL

/**
 * sebzés kalkulálás egyéb effekteket beleszámolva
 * @param {Object} ability - Képesség objektum
 * @param {Object} caster - A képességet használó karakter
 * @param {boolean} targetIsPlayer - Igaz, ha a célpont a játékos
 * @returns {number} Számolt sebzés
 */
function calculateDamage(ability, caster, targetIsPlayer) {
    const target = targetIsPlayer ? gameState.player : gameState.enemy;
    const effects = targetIsPlayer ? gameState.playerStatusEffects : gameState.enemyStatusEffects;
    
    // Alapsebzés a képesség saját power értékéből jön
    const abilityPower = ability.power || 0;
    let baseDamage = abilityPower;
    
    // weakness effekt vizsgálata
    const weakness = effects.find(e => e.type === 'weakness');
    if (weakness) {
        baseDamage = Math.floor(baseDamage * 1.5); // weakness alatt +50% sebzés
    }
    
    // broken effekt vizsgálata - stackenként +20% sebzés
    const broken = effects.find(e => e.type === 'broken');
    if (broken && broken.stackCount > 0) {
        const brokenMultiplier = 1 + (0.2 * broken.stackCount); // 20% per stack
        baseDamage = Math.floor(baseDamage * brokenMultiplier);
    }
    
    return Math.floor(baseDamage);
}

/**
 * A sebzést kapott fél portré paneljének megrázása (a .combat-area extra helye elkerüli az átfedést).
 * @param {boolean} targetIsPlayer - true, ha a játékos kapta a találatot
 */
function shakeHitPortrait(targetIsPlayer) {
    const panel = document.querySelector(
        targetIsPlayer ? '.player-panel' : '.enemy-panel'
    );
    if (!panel) return;
    panel.classList.remove('character-panel--hit-shake');
    panel.offsetWidth;
    panel.classList.add('character-panel--hit-shake');
    const onEnd = () => {
        panel.classList.remove('character-panel--hit-shake');
        panel.removeEventListener('animationend', onEnd);
    };
    panel.addEventListener('animationend', onEnd);
}

/**
 * sebzés kiosztása
 * @param {Object} target - Cél karakter objektum
 * @param {number} amount - Sebzés értéke
 * @param {boolean} targetIsPlayer - Igaz, ha a célpont a játékos
 */
function applyDamage(target, amount, targetIsPlayer) {
    target.health = Math.max(0, target.health - amount);
    if (activeAbilityContext && amount > 0) {
        const ctx = activeAbilityContext;
        if (targetIsPlayer !== ctx.isPlayer) {
            ctx.dealt += amount;
        }
    }
    if (amount > 0) {
        shakeHitPortrait(targetIsPlayer);
    }
}

/**
 * heal kiosztása
 * @param {Object} target - Cél karakter objektum
 * @param {number} amount - Gyógyítás értéke
 * @param {boolean} targetIsPlayer - Igaz, ha a célpont a játékos
 */
function applyHeal(target, amount, targetIsPlayer) {
    const oldHealth = target.health;
    target.health = Math.min(target.maxHealth, target.health + amount);
    const actualHeal = target.health - oldHealth;
    if (activeAbilityContext && actualHeal > 0) {
        const ctx = activeAbilityContext;
        if (targetIsPlayer === ctx.isPlayer) {
            ctx.healed += actualHeal;
        }
    }
}































// STATUS EFFEKT KEZELÉS

/**
 * status effekt hozzáadása
 * @param {Object} target - Cél karakter objektum
 * @param {string} effectType - Effekt típusa (poison, burn, stun, stb.)
 * @param {number} power - Erősség érték (ha meg van adva, felülírja a definíciót)
 * @param {boolean} targetIsPlayer - Igaz, ha a célpont a játékos
 */
function applyStatusEffect(target, effectType, power, targetIsPlayer) {
    const effects = targetIsPlayer ? gameState.playerStatusEffects : gameState.enemyStatusEffects;
    
    // effekt difiníció megszerzése (effects tábla /game-data)
    const effectDef = getEffectDefinition(effectType);
    if (!effectDef) {
        console.warn(`Unknown status effect type: ${effectType}`);
        return;
    }
    
    // tulajdonságok begyűjtése
    let duration = effectDef.duration;
    let effectPower = power !== undefined && power !== null ? power : effectDef.power;
    let stackCount = effectDef.stackCount;

    // Stackelő effekteknél a harmadik paraméter (power) a stack **növelés**
    // Ha 0 vagy hiányzik, marad a definíció szerinti +1 (pl. "drained" hívás 0-val).
    let stackIncrement = stackCount;
    if (effectDef.isStackable) {
        if (power !== undefined && power !== null) {
            stackIncrement = power === 0 ? effectDef.stackCount : power;
        } else {
            stackIncrement = effectDef.stackCount;
        }
    }

    
    // megvizsgáljuk, hogy már létezik e
    const existingEffect = effects.find(e => e.type === effectType);
    if (existingEffect) {
        if (effectDef.isStackable) {
            // hozzáadjuk az új stacket
            existingEffect.stackCount += stackIncrement;
        } else {
            // nem stackelő effektekhez frissítjük a cooldownt
            existingEffect.duration = Math.max(existingEffect.duration, duration);
            // frissítjük az effekt erejét ha lehetséges (majd meglátom ez mennyire szükséges)
            if (effectPower !== undefined && effectPower !== null) {
                existingEffect.power = effectPower;
            }
        }
    } else {
        // új status effekt objektum
        const newEffect = {
            type: effectType,
            name: effectDef.name,
            description: effectDef.description,
            isStackable: effectDef.isStackable,
            power: effectPower
        };
        
        if (effectDef.isStackable) {
            newEffect.stackCount = stackIncrement;
        } else {
            newEffect.duration = duration;
        }
        
        effects.push(newEffect);
    }
}

/**
 * másodlagos effekt logika (meglátom mennyire szükséges)
 * @param {string} effectType - Effekt típusa
 * @param {Object} target - Cél karakter objektum
 * @param {number} power - Erősség érték
 * @param {boolean} targetIsPlayer - Igaz, ha a célpont a játékos
 */
function applyEffect(effectType, target, power, targetIsPlayer) {
    switch (effectType) {
        case 'poison':
            applyStatusEffect(target, 'poison', 3, targetIsPlayer)
            break
        case 'burn':
            applyStatusEffect(target, 'burn', 3, targetIsPlayer)
            break
        case 'stun':
            applyStatusEffect(target, 'stun', 1, targetIsPlayer)
            break
        case 'weakness':
            applyStatusEffect(target, 'weakness', 3, targetIsPlayer)
            break
        case 'mana_regen':
            applyStatusEffect(target, 'mana_regen', power, targetIsPlayer)
            break
        case 'superheated':
            applyStatusEffect(target, 'superheated', power, targetIsPlayer)
            break
        case 'cracked':
            applyStatusEffect(target, 'cracked', power, targetIsPlayer)
            break
        case 'aiming':
            applyStatusEffect(target, 'aiming', power, targetIsPlayer)
            break
        case 'god_of_chaos':
            applyStatusEffect(target, 'god_of_chaos', power, targetIsPlayer)
            break
        case 'broken':
            applyStatusEffect(target, 'broken', power, targetIsPlayer)
            break
        case 'reshaping':
            applyStatusEffect(target, 'reshaping', power, targetIsPlayer)
            break
        case 'chrono_flame':
            applyStatusEffect(target, 'chrono_flame', power, targetIsPlayer)
            break
        case 'god_of_time':
            applyStatusEffect(target, 'god_of_time', power, targetIsPlayer)
            break
        case 'god_of_divinity':
            applyStatusEffect(target, 'god_of_divinity', power, targetIsPlayer)
            break
        case 'divinity':
            applyStatusEffect(target, 'divinity', power, targetIsPlayer)
            break
    }
}

/**
 * Körvégi passzív feldolgozás: mezőhatások, majd játékos oldali tickek (Chrono DoT + időtartamos DoT/regen),
 * utána ellenfél oldali tickek. Mindkét képesség után fut, olvasható késleltetésekkel.
 * @returns {Promise<void>}
 */
async function processRoundEndEffectsSequential() {
    triggerEvent('onTurnStart', {});

    beginEffectTickTracking();
    try {
        const godOfTimeEffect = gameState.playerStatusEffects.find(e => e.type === 'god_of_time');
        if (godOfTimeEffect) {
            processGodOfTime(godOfTimeEffect, gameState.player, true);
        }

        const playerChronoFlame = gameState.playerStatusEffects.find(e => e.type === 'chrono_flame');
        if (playerChronoFlame) {
            processChronoFlame(playerChronoFlame, gameState.player, true);
        }

        processCharacterStatusEffects(gameState.player, gameState.playerStatusEffects, true);
        updateUI();
        flushOneEffectTickLineNow(true);
        if (!checkDeath()) return;
        await delay(COMBAT_ACTION_GAP_MS);

        const enemyChronoFlame = gameState.enemyStatusEffects.find(e => e.type === 'chrono_flame');
        if (enemyChronoFlame) {
            processChronoFlame(enemyChronoFlame, gameState.enemy, false);
        }

        processCharacterStatusEffects(gameState.enemy, gameState.enemyStatusEffects, false);
        updateUI();
        flushOneEffectTickLineNow(false);
        if (!checkDeath()) return;
        await delay(COMBAT_ROUND_END_GAP_MS);
    } finally {
        if (effectTickContext && effectTickNameSnapshot) {
            if (effectTickSideHasPendingLine(true)) flushOneEffectTickLineNow(true);
            if (effectTickSideHasPendingLine(false)) flushOneEffectTickLineNow(false);
        }
        effectTickContext = null;
        effectTickNameSnapshot = null;
    }
}

/**
 * A vizsgálat függvénye, hogy tud e valamit csinálni a karakter
 * @param {boolean} isPlayer - Igaz, ha a játékost vizsgáljuk
 * @returns {Object} { canAct: boolean, reason: string }
 */
function canCharacterAct(isPlayer) {
    const effects = isPlayer ? gameState.playerStatusEffects : gameState.enemyStatusEffects;
    const character = isPlayer ? gameState.player : gameState.enemy;
    
    // végigmegyünk az összes effekten
    for (const effect of effects) {
        switch (effect.type) {
            case 'stun':
                return {
                    canAct: false,
                    reason: tt('game.combat.stunned_cannot_act', { character: character.name }),
                };
            // Majd ide jön többi "stun" effekt ha lesz
        }
    }
    
    return { canAct: true, reason: null };
}

// STÁTUSZEFFEKT FELDOLGOZÓK

/**
 * Poison effekt feldolgozása - idővel sebzést okoz.
 * @param {Object} effect - Poison effekt objektum
 * @param {Object} character - Karakter objektum
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 */
function processPoison(effect, character, isPlayer) {
    const damage = effect.power || 5;
    applyDamage(character, damage, isPlayer);
    if (effectTickContext && damage > 0) {
        const key = isPlayer ? 'player' : 'enemy';
        effectTickContext[key].poison += damage;
    }
}

/**
 * Burn effekt feldolgozása - idővel tűzsebzést okoz.
 * @param {Object} effect - Burn effekt objektum
 * @param {Object} character - Karakter objektum
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 */
function processBurn(effect, character, isPlayer) {
    const damage = effect.power || 3;
    applyDamage(character, damage, isPlayer);
    if (effectTickContext && damage > 0) {
        const key = isPlayer ? 'player' : 'enemy';
        effectTickContext[key].burn += damage;
    }
}

/**
 * Chrono-flame effekt feldolgozása - stack alapon idővel sebzést okoz.
 * @param {Object} effect - Chrono_flame effekt objektum
 * @param {Object} character - Karakter objektum
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 */
function processChronoFlame(effect, character, isPlayer) {
    if (effect.isStackable && effect.stackCount > 0) {
        const damagePerStack = 5;
        const totalDamage = effect.stackCount * damagePerStack;
        applyDamage(character, totalDamage, isPlayer);
        if (effectTickContext && totalDamage > 0) {
            const key = isPlayer ? 'player' : 'enemy';
            effectTickContext[key].chrono += totalDamage;
        }
    }
}

/**
 * Mana_regen effekt feldolgozása - körönként manát tölt vissza.
 * @param {Object} effect - Mana_regen effekt objektum
 * @param {Object} character - Karakter objektum
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 */
function processManaRegen(effect, character, isPlayer) {
    if (isPlayer) {
        const manaGain = effect.power || 5;
        character.mana = Math.min(character.maxMana, character.mana + manaGain);
        if (effectTickContext && manaGain > 0) {
            effectTickContext.player.manaRegen += manaGain;
        }
    }
}

/**
 * God of Time effekt feldolgozása - minden körben Chrono-flame stackeket ad.
 * @param {Object} effect - God_of_time effekt objektum
 * @param {Object} character - Karakter objektum
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 */
function processGodOfTime(effect, character, isPlayer) {
    if (isPlayer) {
        applyStatusEffect(gameState.player, 'chrono_flame', 1, true);
        applyStatusEffect(gameState.enemy, 'chrono_flame', 1, false);
        const msg = tt('game.combat.tick_chrono_field');
        addEffectTickExtra(true, msg);
        addEffectTickExtra(false, msg);
    }
}

/**
 * Reshaping effekt feldolgozása - halál esetén visszatölti a HP-t, így megment.
 * @param {Object} effect - Reshaping effekt objektum
 * @param {Object} character - Karakter objektum
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 * @returns {boolean} true, ha a reshaping megakadályozta a halált
 */
function processReshaping(effect, character, isPlayer) {
    if (character.health <= 0) {
        character.health = character.maxHealth;
        addLog(
            tt('game.combat.reshaping_restore', { character: character.name }),
            isPlayer ? 'player' : 'enemy',
            'heal'
        );
        
        // Reshaping effekt eltávolítása használat után
        const effects = isPlayer ? gameState.playerStatusEffects : gameState.enemyStatusEffects;
        const index = effects.indexOf(effect);
        if (index > -1) {
            effects.splice(index, 1);
        }
        
        return true;
    }
    return false;
}

/**
 * Effektek feldolgozásának a függvénye
 * @param {Object} character - Karakter objektum
 * @param {Array} effects - Státuszeffektek tömbje
 * @param {boolean} isPlayer - Igaz, ha a karakter a játékos
 */
function processCharacterStatusEffects(character, effects, isPlayer) {
    for (const effect of effects) {
        // A stackelő effekteket nem dolgozzuk fel (ezeket képességek kezelik)
        if (effect.isStackable) {
            continue;
        }

        // Permanent effektek (duration 0), amik nem futnak minden körben
        if (effect.duration === 0) {
            // Ezeket másik logika kezeli (pl. god_of_time a processRoundEndEffectsSequential-ben)
            continue;
        }
        
        effect.duration--;
        
        // Megfelelő feldolgozó kiválasztása effekt típus alapján
        switch (effect.type) {
            case 'poison':
                processPoison(effect, character, isPlayer);
                break;
            case 'burn':
                processBurn(effect, character, isPlayer);
                break;
            case 'mana_regen':
                processManaRegen(effect, character, isPlayer);
                break;
            // Passzív effektek (stun, weakness, broken) más függvényekben ellenőrzöttek
            // A reshaping ellenőrzése akkor történik, amikor a karakter halna
        }
    }
    
    // Ellenőrizzük, volt-e aiming a szűrés előtt
    const hadAiming = isPlayer && effects.find(e => e.type === 'aiming');
    
    // Lejárt effektek kiszűrése (stackelő és permanent effektek maradnak)
    if (isPlayer) {
        gameState.playerStatusEffects = effects.filter(e => 
            e.isStackable || 
            e.duration > 0 || 
            e.type === 'impaled' ||
            (e.duration === 0 && !e.isStackable && (e.type === 'god_of_time' || e.type === 'god_of_chaos' || e.type === 'god_of_divinity' || e.type === 'aiming'))
        );
        
        // Ha aiming lejárt, az eredeti képességeket visszaállítjuk
        const hasAiming = gameState.playerStatusEffects.find(e => e.type === 'aiming');
        if (hadAiming && !hasAiming && gameState.player && gameState.player.originalAbilities) {
            gameState.player.abilities = [...gameState.player.originalAbilities];
            renderAbilities();
        }
    } else {
        gameState.enemyStatusEffects = effects.filter(
            (e) => e.isStackable || e.duration > 0 || e.type === 'impaled'
        );
    }
}



















// JÁTÉK FOLYAMAT

// Játék lezárása (játékos meghal)
function endGame() {
    gameState.gameOver = true;
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('final-enemies').textContent = gameState.enemyNumber - 1;
    clearGameOverSaveStatus();
    setGameOverButtonsDisabled(false);
    const saveBtn = document.getElementById('game-over-save-btn');
    if (saveBtn && saveBtn.dataset.labelRestore) {
        saveBtn.textContent = saveBtn.dataset.labelRestore;
        delete saveBtn.dataset.labelRestore;
    }
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
}























// EVENT RENDSZER

const eventHandlers = {
    onTurnStart: [],
    onTurnEnd: [],
    onDamage: [],
    onHeal: [],
    onDeath: [],
    onAbilityUse: []
};

/**
 * event triggerelése
 * @param {string} eventName - Az esemény neve
 * @param {Object} data - Esemény adatai
 */
function triggerEvent(eventName, data) {
    if (eventHandlers[eventName]) {
        eventHandlers[eventName].forEach(handler => handler(data));
    }
}

/**
 * regisztráljuk az event kezelőt
 * @param {string} eventName - Az esemény neve
 * @param {Function} handler - Kezelő függvény
 */
function on(eventName, handler) {
    if (!eventHandlers[eventName]) {
        eventHandlers[eventName] = [];
    }
    eventHandlers[eventName].push(handler);
}






















// JÁTÉK ELKEZDÉSE

// inicializálunk ha betöltött az oldal
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGameData);
} else {
    loadGameData();
}
