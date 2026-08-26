const API_URL = window.location.origin

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const name = document.getElementById('name').value
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  if (!name || !email || !password) {
    document.getElementById('message').innerText = 'Minden mező kitöltése kötelező!'
    return
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    })

    const data = await response.json()
    console.log(data)

    if (response.ok) {
      document.getElementById('message').innerText =
        'Sikeres regisztráció! Átirányítás a bejelentkezéshez...'

      setTimeout(() => {
        window.location.href = '/login/login.html'
      }, 1500)
    } else {
      document.getElementById('message').innerText =
        data.error || 'Hiba történt a regisztráció során'
    }
  } catch (err) {
    document.getElementById('message').innerText = 'Nem érhető el a szerver'
  }
})
