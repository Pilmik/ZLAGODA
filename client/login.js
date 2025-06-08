document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = form.querySelector('input[name="login"]').value;
    const password = form.querySelector('input[name="password"]').value;
    console.log("ID: " + id + " password: " + password);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token saved:', localStorage.getItem('token'));
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        if (payload.roles === "MANAGER") {
          window.location.href = "/dashboard-manager"
        } else if (payload.roles === "CASHIER") {
          window.location.href = "/dashboard-cashier"
        }
      } 
    }catch (error) {
        console.error('Помилка:', error);
        alert('Помилка сервера');
      }
  })
})