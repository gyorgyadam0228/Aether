/**
 * Top-right profile chip: loads /me when logged in, or shows login link.
 * Include profileHeader.css before this script.
 * Include /shared/avatarTheme.js before this script for theme:… profile_icon values.
 */
;(function () {
    const API_URL = window.location.origin

    function loginHref() {
        return '/login/login.html'
    }

    function profilHref() {
        return '/profile/profile.html'
    }

    /** Ne lehessen a chipre kattintva elhagyni a futó meccset. */
    function isJatekCombatPage() {
        const p = window.location.pathname.replace(/\\/g, '/').toLowerCase()
        return p.includes('/game/game.html')
    }

    function getAT() {
        return typeof window !== 'undefined' && window.AvatarTheme ? window.AvatarTheme : null
    }

    function profileIconSrc(icon) {
        const AT = getAT()
        if (AT) return AT.profileIconUrl(icon)
        if (!icon || !String(icon).trim()) return null
        const s = String(icon).trim()
        if (/^https?:\/\//i.test(s)) return s
        if (s.startsWith('/')) return s
        return '/' + s.replace(/^\/+/, '')
    }

    function renderLoggedOut(container) {
        container.innerHTML = ''
        const a = document.createElement('a')
        a.className = 'profile-header-login'
        a.href = loginHref()
        a.textContent = typeof t === 'function' ? t('common.login_link') : 'Bejelentkezés'
        container.appendChild(a)
    }

    function renderChip(container, { name, profile_icon }) {
        container.innerHTML = ''
        const clickable = !isJatekCombatPage()
        const wrap = clickable
            ? document.createElement('a')
            : document.createElement('div')
        wrap.className = 'profile-header-chip'
        if (clickable) {
            wrap.href = profilHref()
            wrap.title = typeof t === 'function' ? t('common.profile_open_title') : 'Profil megnyitása'
        }

        const url = profileIconSrc(profile_icon)
        if (url) {
            const img = document.createElement('img')
            img.className = 'profile-header-avatar'
            img.alt = ''
            img.src = url
            img.referrerPolicy = 'no-referrer'
            img.addEventListener('error', () => {
                img.replaceWith(letterAvatar(name, null))
            })
            wrap.appendChild(img)
        } else {
            wrap.appendChild(letterAvatar(name, profile_icon))
        }

        const span = document.createElement('span')
        span.className = 'profile-header-name'
        span.textContent = name || 'Játékos'
        span.title = name || ''
        wrap.appendChild(span)

        container.appendChild(wrap)
    }

    function letterAvatar(name, profile_icon) {
        const div = document.createElement('div')
        div.className = 'profile-header-avatar-placeholder'
        const AT = getAT()
        if (AT) {
            AT.applyLetterAvatar(div, name, profile_icon, {})
        } else {
            const letter = (name && name.trim()[0]) || '?'
            div.textContent = letter.toUpperCase()
        }
        return div
    }

    function readCachedProfile() {
        try {
            const raw = localStorage.getItem('userProfile')
            if (!raw) return null
            return JSON.parse(raw)
        } catch {
            return null
        }
    }

    async function init() {
        let root = document.getElementById('profile-header-root')
        if (!root) {
            root = document.createElement('div')
            root.id = 'profile-header-root'
            document.body.appendChild(root)
        }

        const token = localStorage.getItem('token')
        if (!token) {
            renderLoggedOut(root)
            return
        }

        const cached = readCachedProfile()
        if (cached && (cached.name != null || cached.profile_icon != null)) {
            renderChip(root, {
                name: cached.name,
                profile_icon: cached.profile_icon,
            })
        }

        try {
            const res = await fetch(`${API_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token')
                localStorage.removeItem('userProfile')
                renderLoggedOut(root)
                return
            }
            if (!res.ok) return
            const u = await res.json()
            const next = {
                name: u.name,
                profile_icon: u.profile_icon,
            }
            localStorage.setItem('userProfile', JSON.stringify(next))
            if (u.theme === 'dark' || u.theme === 'light') {
                localStorage.setItem('darkMode', String(u.theme === 'dark'))
                if (typeof applyThemeFromStorage === 'function') applyThemeFromStorage()
            }
            renderChip(root, next)
        } catch {
            /* keep cached render if any */
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init)
    } else {
        init()
    }
})()
