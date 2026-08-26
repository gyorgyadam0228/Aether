// Karakterválasztó képernyő
const API_URL = window.location.origin;

let selectedClassIndex = 0;

let characterData = [];

/** @type {() => void} */
let stopPreviewIdle = function () {};

// Karakteradatok betöltése és felület inicializálása
async function loadCharacterData() {
    const statusEl = document.getElementById('class-load-status');
    if (statusEl) statusEl.textContent = typeof t === 'function' ? t('classSelection.loading_classes') : 'Loading classes...';
    try {
        const lang = typeof getLang === 'function' ? getLang() : 'hu'
        const response = await fetch(
            `${API_URL}/game-data?lang=${encodeURIComponent(lang)}`
        )
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!Array.isArray(data.classes) || data.classes.length === 0) {
            throw new Error('No classes returned from server');
        }
        characterData = data.classes.map((cls) => ({
            id: cls.id,
            name: cls.name,
            description: cls.description || '',
            icon: cls.icon ?? null,
            iconAlt: cls.iconAlt ?? null,
            emoji: cls.icon || (cls.name ? cls.name[0] : '?'),
        }));
        if (statusEl) statusEl.textContent = '';
        updateCharacterDisplay();
        setupSelectionListeners();
    } catch (err) {
        console.error('Failed to load classes:', err);
        if (statusEl) statusEl.textContent = typeof t === 'function' ? t('classSelection.load_error') : 'Could not load classes. Please try again later.';
        document.getElementById('start-game-btn').disabled = true;
    }
}

// Előnézet frissítése
function updateCharacterDisplay() {
    const character = characterData[selectedClassIndex];
    document.getElementById('character-name').textContent = character.name;
    document.getElementById('character-description').textContent = character.description;
    const preview = document.getElementById('character-preview');
    stopPreviewIdle();
    stopPreviewIdle = function () {};
    if (preview && typeof characterIcon !== 'undefined' && characterIcon.renderInto) {
        stopPreviewIdle = characterIcon.renderInto(preview, {
            icon: character.icon,
            iconAlt: character.iconAlt,
            fallbackChar: character.name ? character.name[0] : '?',
        });
    } else if (preview) {
        preview.textContent = character.emoji;
    }
}

// Eseménykezelők beállítása
function setupSelectionListeners() {
    document.getElementById('prev-char-btn').addEventListener('click', () => {
        selectedClassIndex = (selectedClassIndex - 1 + characterData.length) % characterData.length;
        updateCharacterDisplay();
    });
    
    document.getElementById('next-char-btn').addEventListener('click', () => {
        selectedClassIndex = (selectedClassIndex + 1) % characterData.length;
        updateCharacterDisplay();
    });
    
    document.getElementById('start-game-btn').addEventListener('click', () => {
        // Kiválasztott karakter indexének mentése, majd átirányítás a játékra
        sessionStorage.setItem('selectedClassIndex', selectedClassIndex);
        window.location.href = 'game.html';
    });
}

// Inicializálás oldalbetöltéskor
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCharacterData);
} else {
    loadCharacterData();
}
