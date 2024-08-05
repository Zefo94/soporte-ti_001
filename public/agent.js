document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

async function fetchAssignedTickets() {
    const token = localStorage.getItem('token');
    const response = await fetch('/agent/tickets', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const tickets = await response.json();
    const ticketsDiv = document.getElementById('assigned-tickets');
    ticketsDiv.innerHTML = '<table><thead><tr><th>De</th><th>Mensaje</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
        tickets.map(ticket => `<tr>
            <td>${ticket.from}</td>
            <td>${ticket.message}</td>
            <td>${ticket.status}</td>
            <td>
                <button onclick="updateTicketStatus('${ticket._id}', 'resolved')">Resolver</button>
                <button onclick="updateTicketStatus('${ticket._id}', 'pending')">Pendiente</button>
            </td>
        </tr>`).join('') +
        '</tbody></table>';

    // Emitir un sonido si hay nuevos tickets
    if (tickets.length > 0) {
        const audio = new Audio('notification.mp3');
        audio.play();
    }
}

async function updateTicketStatus(ticketId, status) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });

    if (response.ok) {
        fetchAssignedTickets();
    } else {
        alert('Error al actualizar el ticket');
    }
}

// Actualizar automáticamente la bandeja de entrada de mensajes cada 10 segundos
setInterval(fetchAssignedTickets, 10000);

fetchAssignedTickets();
