const API_URL = window.location.origin

function leaderboardHeaders() {
  const token = localStorage.getItem('token')
  const h = {}
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_URL}/leaderboard`, {
      headers: leaderboardHeaders(),
    })
    const data = await res.json()
    console.log('Kapott adat:', data)
    if (!Array.isArray(data)) {
      document.getElementById('tableBody').textContent =
        typeof t === 'function' ? t('leaderboard.invalid_response') : 'Érvénytelen válasz a szervertől.'
      return
    }
    renderLeaderboard(data)
  } catch (err) {
    console.error('Hiba:', err)
    document.getElementById('tableBody').textContent =
      typeof t === 'function' ? t('leaderboard.load_error') : 'Nem sikerült betölteni a ranglistát.'
  }
}

function renderLeaderboard(data) {
  const table = document.getElementById('tableBody')
  table.innerHTML = ''

  if (data.length === 0) {
    table.textContent = typeof t === 'function' ? t('leaderboard.empty') : 'Még nincs adat.'
    return
  }

  data.forEach((player, index) => {
    const row = document.createElement('div')
    row.className = 'row'
    if (player.isYou) {
      row.classList.add('row--you')
      row.title = typeof t === 'function' ? t('leaderboard.you_tooltip') : 'Ez te vagy'
    }

    const nameCell = document.createElement('span')
    nameCell.className = 'row-name'
    nameCell.textContent = player.name
    if (player.isYou) {
      const badge = document.createElement('span')
      badge.className = 'you-badge'
      badge.textContent = typeof t === 'function' ? t('leaderboard.you_badge') : 'Te'
      nameCell.appendChild(document.createTextNode(' '))
      nameCell.appendChild(badge)
    }

    row.innerHTML = ''
    const rank = document.createElement('span')
    rank.textContent = String(index + 1)
    const score = document.createElement('span')
    score.textContent = String(player.highscore)
    row.appendChild(rank)
    row.appendChild(nameCell)
    row.appendChild(score)

    table.appendChild(row)
  })
}

async function sendScore(currentScore) {
  const token = localStorage.getItem('token')

  if (!token) {
    alert(typeof t === 'function' ? t('common.alert_not_logged_in') : 'Nem vagy bejelentkezve!')
    return
  }

  try {
    await fetch(`${API_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ score: currentScore }),
    })

    loadLeaderboard()
  } catch (err) {
    console.error('Feltöltési hiba:', err)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLeaderboard)
} else {
  loadLeaderboard()
}
