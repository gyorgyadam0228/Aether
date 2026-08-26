/** Must match theme ids in Public/shared/avatarTheme.js */
export const AVATAR_THEME_IDS = new Set([
    'slate-amber',
    'navy-mint',
    'plum-gold',
    'forest-cream',
    'wine-sky',
    'teal-coral',
    'ink-lime',
    'brown-sand',
    'indigo-rose',
    'ocean-ice',
])

const THEME_PREFIX = 'theme:'

/**
 * @param {string} s
 * @returns {boolean}
 */
export function isValidThemeProfileIcon(s) {
    if (typeof s !== 'string') return false
    const t = s.trim()
    if (!t.startsWith(THEME_PREFIX)) return false
    const id = t.slice(THEME_PREFIX.length)
    if (!/^[a-z0-9-]+$/.test(id)) return false
    return AVATAR_THEME_IDS.has(id)
}

/**
 * Non-theme profile_icon values (image URL or site-relative path).
 * @param {string} s
 * @returns {boolean}
 */
export function isValidImageProfileIcon(s) {
    if (typeof s !== 'string') return false
    const t = s.trim()
    if (t.length === 0 || t.length > 500) return false
    if (/[\0<>\n\r]/.test(t)) return false
    if (t.toLowerCase().startsWith(THEME_PREFIX)) return false
    if (/^https?:\/\//i.test(t)) return /^https?:\/\/\S+$/i.test(t)
    return /^[\w./-]+$/.test(t)
}

/**
 * @param {string|null} value trimmed or null
 * @returns {boolean}
 */
export function isValidProfileIconValue(value) {
    if (value == null || value === '') return true
    const s = String(value).trim()
    if (s === '') return true
    if (isValidThemeProfileIcon(s)) return true
    return isValidImageProfileIcon(s)
}
