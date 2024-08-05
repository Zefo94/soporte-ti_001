document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const createAgentForm = document.getElementById('createAgentForm');
    const logoutBtn = document.getElementById('logoutBtn');
  
    if (loginForm) {
      loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (result.token) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('role', result.role);
          if (result.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'agent.html';
          }
        } else {
          alert('Error al iniciar sesión');
        }
      });
    }
  
    if (registerForm) {
      registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const response = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        });
        const result = await response.json();
        if (result.message) {
          alert('Usuario registrado con éxito');
          window.location.href = 'login.html';
        } else {
          alert('Error al registrar usuario');
        }
      });
    }
  
    if (createAgentForm) {
      createAgentForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const agentUsername = document.getElementById('agentUsername').value;
        const agentPassword = document.getElementById('agentPassword').value;
        const token = localStorage.getItem('token');
        const response = await fetch('/admin/create-agent', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ username: agentUsername, password: agentPassword })
        });
        const result = await response.json();
        if (result.message) {
          alert('Agente creado con éxito');
          loadTickets(); // Refresca la lista de tickets
        } else {
          alert('Error al crear agente');
        }
      });
    }
  
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
      });
    }
  
    async function loadTickets() {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      let endpoint = '';
      if (role === 'admin') {
        endpoint = '/admin/tickets';
      } else {
        endpoint = '/agent/tickets';
      }
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tickets = await response.json();
      displayTickets(tickets);
    }
  
    function displayTickets(tickets) {
      const ticketsList = document.getElementById('ticketsList') || document.getElementById('agentTicketsList');
      ticketsList.innerHTML = '';
      tickets.forEach(ticket => {
        const ticketElement = document.createElement('div');
        ticketElement.className = 'ticket';
        ticketElement.innerHTML = `
          <span>${ticket.from}</span>
          <span>${ticket.message}</span>
          <span>${ticket.status}</span>
          <div class="ticket-actions">
            <button onclick="updateTicketStatus('${ticket._id}', 'resolved')">Resolver</button>
            <button onclick="updateTicketStatus('${ticket._id}', 'pending')">Pendiente</button>
          </div>
        `;
        ticketsList.appendChild(ticketElement);
      });
    }
  
    async function updateTicketStatus(id, status) {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      let endpoint = '';
      if (role === 'admin') {
        endpoint = `/admin/tickets/${id}`;
      } else {
        endpoint = `/agent/tickets/${id}`;
      }
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (result.message) {
        alert('Ticket actualizado con éxito');
        loadTickets(); // Refresca la lista de tickets
      } else {
        alert('Error al actualizar el ticket');
      }
    }
  
    // Cargar tickets al cargar la página
    if (document.getElementById('ticketsList') || document.getElementById('agentTicketsList')) {
      loadTickets();
    }
  });
  