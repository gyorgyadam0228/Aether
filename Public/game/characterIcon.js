/**
 * Karakter/ellenfel ikon megjelenítése.
 * URL vagy elérési út esetén <img>-ként renderel.
 * Ha két kép van megadva, idle állapotban váltogatja őket.
 */
;(function (global) {
    var IDLE_MS = 500

    function shouldRenderAsImage(icon) {
        var s = String(icon == null ? '' : icon).trim()
        if (!s) return false
        if (/^https?:\/\//i.test(s)) return true
        if (s.charAt(0) === '/') return true
        return /\.(png|webp|gif|jpe?g|svg)(\?|$)/i.test(s)
    }

    function resolveIconSrc(icon) {
        if (!icon || !String(icon).trim()) return null
        var s = String(icon).trim()
        if (/^https?:\/\//i.test(s)) return s
        if (s.charAt(0) === '/') return s
        return '/' + s.replace(/^\/+/, '')
    }

    /**
     * @param {HTMLElement} container Cél DOM elem.
     * @param {{ icon?: string|null, iconAlt?: string|null, fallbackChar?: string }} opts Ikon beállítások.
     * @returns {function} Leállító függvény az idle váltogatáshoz.
     */
    function renderInto(container, opts) {
        if (!container) return function noop() {}
        opts = opts || {}
        var icon = opts.icon
        var iconAlt = opts.iconAlt
        var fallbackChar = opts.fallbackChar != null ? String(opts.fallbackChar) : '?'

        container.innerHTML = ''
        var primaryRaw = String(icon == null ? '' : icon).trim()
        var altRaw = String(iconAlt == null ? '' : iconAlt).trim()

        if (!primaryRaw) {
            container.textContent = fallbackChar
            return function noop() {}
        }

        if (!shouldRenderAsImage(primaryRaw)) {
            container.textContent = fallbackChar
            return function noop() {}
        }

        var primary = resolveIconSrc(primaryRaw)
        var alt =
            altRaw && shouldRenderAsImage(altRaw) ? resolveIconSrc(altRaw) : null

        var img = document.createElement('img')
        img.className = 'character-icon-img'
        img.alt = ''
        img.referrerPolicy = 'no-referrer'
        container.appendChild(img)

        function showFallback() {
            container.innerHTML = ''
            container.textContent = fallbackChar
        }

        if (!alt || alt === primary) {
            img.src = primary
            img.addEventListener('error', showFallback)
            return function noop() {}
        }

        var usePrimary = true
        img.src = primary
        img.addEventListener('error', showFallback)

        var timer = setInterval(function () {
            usePrimary = !usePrimary
            img.src = usePrimary ? primary : alt
        }, IDLE_MS)

        return function stop() {
            clearInterval(timer)
        }
    }

    global.characterIcon = {
        shouldRenderAsImage: shouldRenderAsImage,
        resolveIconSrc: resolveIconSrc,
        renderInto: renderInto,
    }
})(
    typeof globalThis !== 'undefined'
        ? globalThis
        : typeof window !== 'undefined'
          ? window
          : this
)
