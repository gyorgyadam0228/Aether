/**
 * Syncs html[data-theme] with localStorage.darkMode ('true' = dark).
 * Call after login/options save. When unset, defaults to light (matches users.theme default and unchecked #tema).
 */
;(function () {
    function applyThemeFromStorage() {
        var d = localStorage.getItem('darkMode')
        var isDark = d === 'true'
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }

    window.applyThemeFromStorage = applyThemeFromStorage
    applyThemeFromStorage()
})()
