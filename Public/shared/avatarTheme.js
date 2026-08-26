/**
 * Premade letter-avatar themes: stored in users.profile_icon as "theme:<id>".
 * Image URLs behave as before. Exposes window.AvatarTheme for profile + profileHeader.
 */
;(function (global) {
    var PREFIX = 'theme:'

    /** Left half = avatar background, right half = letter color (preview swatches). */
    var THEMES = [
        { id: 'slate-amber', bg: '#334155', fg: '#fbbf24' },
        { id: 'navy-mint', bg: '#0f172a', fg: '#5eead4' },
        { id: 'plum-gold', bg: '#4c1d95', fg: '#fcd34d' },
        { id: 'forest-cream', bg: '#14532d', fg: '#fef3c7' },
        { id: 'wine-sky', bg: '#7f1d1d', fg: '#7dd3fc' },
        { id: 'teal-coral', bg: '#134e4a', fg: '#fb7185' },
        { id: 'ink-lime', bg: '#18181b', fg: '#a3e635' },
        { id: 'brown-sand', bg: '#78350f', fg: '#fde68a' },
        { id: 'indigo-rose', bg: '#312e81', fg: '#fda4af' },
        { id: 'ocean-ice', bg: '#164e63', fg: '#e0f2fe' },
    ]

    var byId = {}
    for (var i = 0; i < THEMES.length; i++) {
        byId[THEMES[i].id] = THEMES[i]
    }

    function isThemeString(icon) {
        if (icon == null || icon === '') return false
        var s = String(icon).trim()
        if (s.indexOf(PREFIX) !== 0) return false
        var id = s.slice(PREFIX.length)
        return Object.prototype.hasOwnProperty.call(byId, id)
    }

    function themeFromProfileIcon(icon) {
        if (!isThemeString(icon)) return null
        var id = String(icon).trim().slice(PREFIX.length)
        return byId[id] || null
    }

    function profileIconUrl(icon) {
        if (!icon || !String(icon).trim()) return null
        if (isThemeString(icon)) return null
        var s = String(icon).trim()
        if (/^https?:\/\//i.test(s)) return s
        if (s.charAt(0) === '/') return s
        return '/' + s.replace(/^\/+/, '')
    }

    function splitCircleStyle(bg, fg) {
        return 'linear-gradient(90deg,' + bg + ' 50%,' + fg + ' 50%)'
    }

    /**
     * @param {HTMLElement} el
     * @param {string} name
     * @param {string|null|undefined} profile_icon
     * @param {{ fontSize?: string, defaultBg?: string, defaultFg?: string }} [opts]
     */
    function applyLetterAvatar(el, name, profile_icon, opts) {
        opts = opts || {}
        var letter = (name && String(name).trim()[0]) || '?'
        var upper = String(letter).toUpperCase()
        var theme = themeFromProfileIcon(profile_icon)

        el.textContent = upper
        el.style.backgroundImage = ''
        if (theme) {
            el.style.background = theme.bg
            el.style.color = theme.fg
        } else {
            if (opts.defaultBg != null && opts.defaultBg !== '') {
                el.style.background = opts.defaultBg
            } else {
                el.style.removeProperty('background')
            }
            if (opts.defaultFg != null && opts.defaultFg !== '') {
                el.style.color = opts.defaultFg
            } else {
                el.style.removeProperty('color')
            }
        }
        if (opts.fontSize) el.style.fontSize = opts.fontSize
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
    }

    global.AvatarTheme = {
        PREFIX: PREFIX,
        THEMES: THEMES,
        isThemeString: isThemeString,
        themeFromProfileIcon: themeFromProfileIcon,
        profileIconUrl: profileIconUrl,
        splitCircleStyle: splitCircleStyle,
        applyLetterAvatar: applyLetterAvatar,
    }
})(typeof window !== 'undefined' ? window : globalThis)
