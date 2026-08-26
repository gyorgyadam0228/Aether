const API_URL = window.location.origin

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (data.token) {
      localStorage.setItem('token', data.token)
      if (data.user) {
        localStorage.setItem(
          'userProfile',
          JSON.stringify({
            name: data.user.name,
            profile_icon: data.user.profile_icon ?? null,
          })
        )
      }
      window.location.href = '/menu/menu.html'
    } else {
      document.getElementById('message').innerText = data.error
    }
  } catch {
    document.getElementById('message').innerText = 'Nem érhető el a szerver'
  }
})
