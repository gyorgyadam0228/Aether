const API_URL = window.location.origin

function getAT() {
    return typeof window !== 'undefined' && window.AvatarTheme ? window.AvatarTheme : null
}

function resetAvatarElement(el) {
    el.innerHTML = ''
    el.style.cssText = ''
}

function setAvatar(el, name, profile_icon) {
    resetAvatarElement(el)
    const AT = getAT()
    const url = AT ? AT.profileIconUrl(profile_icon) : legacyProfileIconSrc(profile_icon)

    if (url) {
        const img = document.createElement('img')
        img.src = url
        img.alt = ''
        img.referrerPolicy = 'no-referrer'
        img.style.cssText =
            'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;'
        img.addEventListener('error', () => {
            resetAvatarElement(el)
            if (AT) {
                AT.applyLetterAvatar(el, name, null, {
                    fontSize: '48px',
                    defaultFg: '#25304a',
                })
            } else {
                el.textContent = (name && name[0]) || '?'
                el.style.fontSize = '48px'
                el.style.color = '#25304a'
                el.style.display = 'flex'
                el.style.alignItems = 'center'
                el.style.justifyContent = 'center'
            }
        })
        el.appendChild(img)
        return
    }

    if (AT) {
        AT.applyLetterAvatar(el, name, profile_icon, {
            fontSize: '48px',
            defaultFg: '#25304a',
        })
        return
    }

    el.textContent = (name && name.trim()[0]) || '?'
    el.style.fontSize = '48px'
    el.style.color = '#25304a'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
}

function legacyProfileIconSrc(icon) {
    if (!icon || !String(icon).trim()) return null
    const s = String(icon).trim()
    if (/^https?:\/\//i.test(s)) return s
    if (s.startsWith('/')) return s
    return '/' + s.replace(/^\/+/, '')
}

function tKey(key, fallback) {
    return typeof t === 'function' ? t(key) : fallback
}

function uiLang() {
    return typeof getLang === 'function' ? getLang() : 'hu'
}

function formatRunDate(dateStr) {
    if (dateStr == null || dateStr === '') return '—'
    try {
        const s = String(dateStr).slice(0, 10)
        const d = new Date(s + 'T12:00:00')
        if (Number.isNaN(d.getTime())) return String(dateStr)
        return new Intl.DateTimeFormat(uiLang() === 'en' ? 'en' : 'hu', { dateStyle: 'medium' }).format(d)
    } catch {
        return String(dateStr)
    }
}

function hideProfileInfoError() {
    const el = document.getElementById('profile-info-error')
    if (!el) return
    el.textContent = ''
    el.hidden = true
}

function showProfileInfoError(msg) {
    const el = document.getElementById('profile-info-error')
    if (!el) return
    el.textContent = msg
    el.hidden = false
}

async function loadRunHistory(token) {
    const listEl = document.getElementById('profile-run-list')
    const emptyEl = document.getElementById('profile-run-empty')
    hideProfileInfoError()
    if (!listEl) return
    listEl.innerHTML = ''
    if (emptyEl) emptyEl.hidden = true

    try {
        const res = await fetch(
            API_URL + '/me/runs?lang=' + encodeURIComponent(uiLang() === 'en' ? 'en' : 'hu'),
            {
                headers: { Authorization: 'Bearer ' + token },
            }
        )
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token')
            localStorage.removeItem('userProfile')
            window.location.href = '/login/login.html'
            return
        }
        if (!res.ok) {
            showProfileInfoError(tKey('profile.run_history_error', 'Nem sikerült betölteni a futásokat.'))
            return
        }
        const rows = await res.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            if (emptyEl) emptyEl.hidden = false
            return
        }

        const tpl = tKey('profile.run_played_with', 'Futás ezzel: {class}')
        const unknown = tKey('profile.run_unknown_class', '—')
        const scoreLbl = tKey('profile.run_score', 'Pontszám')
        const dateLbl = tKey('profile.run_date', 'Dátum')

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i]
            const rawName = r.className != null ? String(r.className).trim() : ''
            const className = rawName || unknown
            const article = document.createElement('article')
            article.className = 'run-history-card'
            const h3 = document.createElement('h3')
            h3.className = 'run-history-card__title'
            h3.textContent = tpl.replace(/\{class\}/g, className)
            const meta = document.createElement('div')
            meta.className = 'run-history-card__meta'
            const scoreP = document.createElement('p')
            scoreP.className = 'run-history-card__line'
            scoreP.textContent = scoreLbl + ': ' + String(r.score ?? '—')
            const dateP = document.createElement('p')
            dateP.className = 'run-history-card__line'
            dateP.textContent = dateLbl + ': ' + formatRunDate(r.date)
            meta.appendChild(scoreP)
            meta.appendChild(dateP)
            article.appendChild(h3)
            article.appendChild(meta)
            listEl.appendChild(article)
        }
    } catch {
        showProfileInfoError(tKey('profile.run_history_error', 'Nem sikerült betölteni a futásokat.'))
    }
}

let profileModal = null
let profileOverlay = null
let escapeHandler = null
let currentUserName = ''
let currentProfileIcon = null
let avatarClickWired = false

function closeThemeModal() {
    if (!profileOverlay) return
    profileOverlay.classList.remove('profile-icon-overlay--open')
    profileOverlay.setAttribute('aria-hidden', 'true')
    const btn = document.getElementById('profile-avatar')
    if (btn) btn.setAttribute('aria-expanded', 'false')
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler)
        escapeHandler = null
    }
}

function openThemeModal() {
    if (!profileOverlay) return
    const title = profileModal && profileModal.querySelector('#profile-theme-dialog-title')
    if (title) title.textContent = tKey('profile.theme_picker_title', 'Profilkép színek')
    const closeBtn = profileModal && profileModal.querySelector('.profile-icon-dialog-close')
    if (closeBtn) closeBtn.textContent = tKey('profile.theme_close', 'Bezárás')
    const status = profileModal && profileModal.querySelector('.profile-icon-dialog-status')
    if (status) status.textContent = ''
    profileOverlay.classList.add('profile-icon-overlay--open')
    profileOverlay.setAttribute('aria-hidden', 'false')
    const btn = document.getElementById('profile-avatar')
    if (btn) btn.setAttribute('aria-expanded', 'true')
    escapeHandler = function (e) {
        if (e.key === 'Escape') closeThemeModal()
    }
    document.addEventListener('keydown', escapeHandler)
}

function buildThemeModal() {
    const AT = getAT()
    if (!AT || profileOverlay) return

    profileOverlay = document.createElement('div')
    profileOverlay.className = 'profile-icon-overlay'
    profileOverlay.setAttribute('aria-hidden', 'true')
    profileOverlay.addEventListener('click', function (e) {
        if (e.target === profileOverlay) closeThemeModal()
    })

    profileModal = document.createElement('div')
    profileModal.className = 'profile-icon-dialog'
    profileModal.setAttribute('role', 'dialog')
    profileModal.setAttribute('aria-modal', 'true')
    profileModal.setAttribute('aria-labelledby', 'profile-theme-dialog-title')

    const title = document.createElement('h2')
    title.id = 'profile-theme-dialog-title'
    title.className = 'profile-icon-dialog-title'
    title.setAttribute('data-i18n', 'profile.theme_picker_title')
    title.textContent = tKey('profile.theme_picker_title', 'Profilkép színek')

    const status = document.createElement('p')
    status.className = 'profile-icon-dialog-status'
    status.setAttribute('aria-live', 'polite')
    status.textContent = ''

    const grid = document.createElement('div')
    grid.className = 'profile-icon-theme-grid'

    function makeSwatch(theme, isDefault) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'profile-icon-theme-swatch' + (isDefault ? ' profile-icon-theme-swatch-default' : '')
        if (isDefault) {
            b.title = tKey('profile.theme_default_title', 'Alapértelmezett betű, nincs téma')
            b.style.background = 'var(--theme-surface-4)'
            b.style.color = 'var(--theme-text-soft)'
            b.textContent = '—'
        } else {
            b.title = theme.id
            b.style.background = AT.splitCircleStyle(theme.bg, theme.fg)
            b.setAttribute('aria-label', theme.id)
        }
        b.addEventListener('click', function () {
            saveProfileIcon(isDefault ? null : AT.PREFIX + theme.id, status)
        })
        return b
    }

    grid.appendChild(makeSwatch(null, true))
    for (var i = 0; i < AT.THEMES.length; i++) {
        grid.appendChild(makeSwatch(AT.THEMES[i], false))
    }

    const closeRow = document.createElement('div')
    closeRow.className = 'profile-icon-dialog-actions'
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'profile-icon-dialog-close'
    closeBtn.setAttribute('data-i18n', 'profile.theme_close')
    closeBtn.textContent = tKey('profile.theme_close', 'Bezárás')
    closeBtn.addEventListener('click', function (e) {
        e.preventDefault()
        e.stopPropagation()
        closeThemeModal()
    })
    closeRow.appendChild(closeBtn)

    profileModal.appendChild(title)
    profileModal.appendChild(status)
    profileModal.appendChild(grid)
    profileModal.appendChild(closeRow)
    profileOverlay.appendChild(profileModal)
    document.body.appendChild(profileOverlay)
}

async function saveProfileIcon(value, statusEl) {
    const token = localStorage.getItem('token')
    if (!token) {
        window.location.href = '/login/login.html'
        return
    }
    statusEl.textContent = tKey('profile.theme_saving', 'Mentés…')
    try {
        const res = await fetch(API_URL + '/me/profile', {
            method: 'PATCH',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ profile_icon: value }),
        })
        const data = await res.json().catch(function () {
            return {}
        })
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token')
            localStorage.removeItem('userProfile')
            window.location.href = '/login/login.html'
            return
        }
        if (!res.ok) {
            statusEl.textContent = data.error || tKey('profile.theme_save_failed', 'Mentés sikertelen.')
            return
        }
        currentProfileIcon = data.profile_icon ?? null
        try {
            const raw = localStorage.getItem('userProfile')
            const p = raw ? JSON.parse(raw) : {}
            p.profile_icon = currentProfileIcon
            if (currentUserName != null) p.name = currentUserName
            localStorage.setItem('userProfile', JSON.stringify(p))
        } catch (_) {
            /* ignore */
        }
        const avatarContentEl = document.getElementById('profile-avatar-content')
        if (avatarContentEl) setAvatar(avatarContentEl, currentUserName, currentProfileIcon)
        statusEl.textContent = tKey('profile.theme_saved', 'Mentve.')
        closeThemeModal()
    } catch {
        statusEl.textContent = tKey('profile.theme_network_error', 'Hálózati hiba.')
    }
}

function wireAvatarClick() {
    if (avatarClickWired) return
    const btn = document.getElementById('profile-avatar')
    if (!btn) return
    avatarClickWired = true
    buildThemeModal()
    btn.setAttribute(
        'aria-label',
        tKey('profile.avatar_open_themes', 'Profilkép témák választása') +
            '. ' +
            tKey('profile.avatar_hover_edit', 'Profilkép szerkesztése')
    )
    btn.addEventListener('click', function () {
        openThemeModal()
    })
}

async function loadProfilePage() {
    const token = localStorage.getItem('token')
    if (!token) {
        window.location.href = '/login/login.html'
        return
    }

    const nameEl = document.getElementById('profile-name')
    const emailEl = document.getElementById('profile-email')
    const highEl = document.getElementById('profile-highscore')
    const avatarContentEl = document.getElementById('profile-avatar-content')

    hideProfileInfoError()

    try {
        const res = await fetch(API_URL + '/me', {
            headers: { Authorization: 'Bearer ' + token },
        })
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token')
            localStorage.removeItem('userProfile')
            window.location.href = '/login/login.html'
            return
        }
        if (!res.ok) {
            if (nameEl) nameEl.textContent = typeof t === 'function' ? t('profile.load_error_name') : 'Hiba'
            showProfileInfoError(
                typeof t === 'function' ? t('profile.load_error_hint') : 'Nem sikerült betölteni a profilt.'
            )
            return
        }
        const u = await res.json()
        currentUserName = u.name || ''
        currentProfileIcon = u.profile_icon ?? null
        localStorage.setItem(
            'userProfile',
            JSON.stringify({ name: u.name, profile_icon: u.profile_icon })
        )

        if (nameEl) nameEl.textContent = u.name || '—'
        if (emailEl) emailEl.textContent = u.email || ''
        if (highEl) highEl.textContent = String(u.highscore ?? 0)
        if (avatarContentEl) setAvatar(avatarContentEl, u.name, u.profile_icon)
        wireAvatarClick()
        loadRunHistory(token)
    } catch {
        if (nameEl) nameEl.textContent = typeof t === 'function' ? t('profile.load_error_name') : 'Hiba'
        showProfileInfoError(
            typeof t === 'function' ? t('profile.load_error_network') : 'Hálózati hiba a profil betöltésekor.'
        )
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProfilePage)
} else {
    loadProfilePage()
}
