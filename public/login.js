document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
        localStorage.setItem('token', data.token);
        if (data.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (data.role === 'agent') {
            window.location.href = 'agent.html';
        }
    } else {
        alert(data.error);
    }
});
