const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

const ticketList = document.getElementById('ticketList');
const chatBox = document.getElementById('chatBox');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const closeTicketButton = document.getElementById('closeTicketButton');

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});

const socket = io();

socket.on('newTicket', (ticket) => {
    addTicketToList(ticket);
});

socket.on('newMessage', ({ ticketId, message, mediaType }) => {
    if (chatMessages.dataset.ticketId === ticketId) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        if (mediaType && mediaType.startsWith('image/')) {
            messageElement.innerHTML = `<img src="${message}" alt="Imagen" style="max-width: 100px; cursor: pointer;" onclick="openImage('${message}')">`;
        } else if (mediaType) {
            messageElement.innerHTML = `<a href="${message}" download>Descargar archivo</a>`;
        } else {
            messageElement.textContent = message;
        }
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

socket.on('ticketClosed', ({ ticketId }) => {
    const ticketElement = document.querySelector(`li[data-ticket-id="${ticketId}"]`);
    if (ticketElement) {
        ticketElement.remove();
    }
    if (chatMessages.dataset.ticketId === ticketId) {
        chatMessages.innerHTML = '';
        chatBox.style.display = 'none';
    }
});

async function fetchTickets() {
    try {
        const response = await axios.get('/agent/tickets', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const tickets = response.data;
        ticketList.innerHTML = '';
        tickets.forEach(ticket => {
            addTicketToList(ticket);
        });
    } catch (error) {
        console.error('Error al obtener los tickets:', error);
    }
}

function addTicketToList(ticket) {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = `${ticket.from}: ${ticket.message.split('\n').pop()}`;
    li.dataset.ticketId = ticket._id;
    li.addEventListener('click', () => openChat(ticket));
    ticketList.appendChild(li);
}

function openChat(ticket) {
    chatBox.style.display = 'flex';
    chatMessages.innerHTML = ticket.message.split('\n').map(msg => {
        if (msg.startsWith('[IMAGE]')) {
            const imgSrc = msg.replace('[IMAGE]', '').trim();
            return `<div class="chat-message"><img src="${imgSrc}" alt="Imagen" style="max-width: 100px; cursor: pointer;" onclick="openImage('${imgSrc}')"></div>`;
        } else if (msg.startsWith('[MEDIA]')) {
            const mediaSrc = msg.replace('[MEDIA]', '').trim();
            return `<div class="chat-message"><a href="${mediaSrc}" download>Descargar archivo</a></div>`;
        } else {
            return `<div class="chat-message">${msg}</div>`;
        }
    }).join('');
    chatMessages.dataset.ticketId = ticket._id;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function openImage(src) {
    $('#modalImage').attr('src', src);
    $('#imageModal').modal('show');
}

sendButton.addEventListener('click', async () => {
    const message = chatInput.value;
    if (!message) return;

    const ticketId = chatMessages.dataset.ticketId;
    try {
        await axios.post(`/agent/tickets/${ticketId}/message`, { message }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        chatMessages.innerHTML += `<div class="chat-message">${message}</div>`;
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
    }
});

fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const ticketId = chatMessages.dataset.ticketId;
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`/agent/tickets/${ticketId}/media`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        const mediaSrc = `/uploads/${response.data.filename}`;
        if (file.type.startsWith('image/')) {
            chatMessages.innerHTML += `<div class="chat-message"><img src="${mediaSrc}" alt="Imagen" style="max-width: 100px; cursor: pointer;" onclick="openImage('${mediaSrc}')"></div>`;
        } else {
            chatMessages.innerHTML += `<div class="chat-message"><a href="${mediaSrc}" download>Descargar archivo</a></div>`;
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error al enviar el archivo:', error);
    }
});

closeTicketButton.addEventListener('click', async () => {
    const ticketId = chatMessages.dataset.ticketId;
    const solution = prompt('Por favor, ingrese la solución para este ticket:');
    if (!solution) return;

    try {
        await axios.post(`/agent/tickets/${ticketId}/close`, { solution }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        fetchTickets();
        chatBox.style.display = 'none';
    } catch (error) {
        console.error('Error al cerrar el ticket:', error);
    }
});

fetchTickets();
