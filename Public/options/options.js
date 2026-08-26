const API_URL = window.location.origin

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const token = getToken()
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function loadSettings() {
  const token = getToken()
  if (!token) {
    window.location.replace('/login/login.html')
    return
  }

  try {
    const res = await fetch(`${API_URL}/me`, { headers: authHeaders() })
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('userProfile')
      window.location.replace('/login/login.html')
      return
    }
    if (!res.ok) return

    const u = await res.json()

    const anon = document.getElementById('anonymity')
    if (anon) anon.checked = Boolean(u.anonymity_mode)

    const tema = document.getElementById('tema')
    if (tema) {
      const isDark = u.theme === 'dark'
      tema.checked = isDark
      localStorage.setItem('darkMode', String(isDark))
    }
    if (typeof applyThemeFromStorage === 'function') applyThemeFromStorage()

    const lang = document.getElementById('language')
    const serverLang = u.language === 'en' || u.language === 'hu' ? u.language : 'hu'
    if (lang) lang.value = serverLang
    localStorage.setItem('language', serverLang)
    document.documentElement.lang = serverLang
    if (typeof applyStaticI18n === 'function') applyStaticI18n()
  } catch (e) {
    console.error('loadSettings', e)
  }
}

async function saveSettings() {
  const token = getToken()
  if (!token) {
    window.location.replace('/login/login.html')
    return
  }

  const anonymity = document.getElementById('anonymity')?.checked ?? false
  const darkMode = document.getElementById('tema')?.checked ?? false
  const language = document.getElementById('language')?.value || 'hu'

  const theme = darkMode ? 'dark' : 'light'
  localStorage.setItem('darkMode', String(darkMode))

  const msgEl = document.getElementById('options-message')

  try {
    const res = await fetch(`${API_URL}/me/settings`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        anonymity_mode: anonymity,
        theme,
        language,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('userProfile')
      window.location.replace('/login/login.html')
      return
    }

    if (!res.ok) {
      if (msgEl) msgEl.textContent = data.error || (typeof t === 'function' ? t('options.msg_save_failed') : 'Mentés sikertelen.')
      return
    }

    const savedLang = data.language === 'en' || data.language === 'hu' ? data.language : language
    localStorage.setItem('language', savedLang)
    document.documentElement.lang = savedLang

    if (typeof applyThemeFromStorage === 'function') applyThemeFromStorage()
    if (typeof applyStaticI18n === 'function') applyStaticI18n()
    if (msgEl) msgEl.textContent = typeof t === 'function' ? t('options.msg_saved') : 'Beállítások mentve.'
    setTimeout(() => {
      if (msgEl) msgEl.textContent = ''
    }, 2500)
  } catch (e) {
    console.error('saveSettings', e)
    if (msgEl) msgEl.textContent = typeof t === 'function' ? t('options.msg_network_error') : 'Hálózati hiba.'
  }
}

window.saveSettings = saveSettings

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings)
} else {
  loadSettings()
}
