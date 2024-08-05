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
const uploadButton = document.getElementById('uploadButton');

document.getElementById('logoutButton').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
});

// Función para obtener los tickets asignados al agente
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
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = `${ticket.from}: ${ticket.message}`;
      li.addEventListener('click', () => openChat(ticket));
      ticketList.appendChild(li);
    });
  } catch (error) {
    console.error('Error al obtener los tickets:', error);
  }
}

// Función para abrir el chat de un ticket seleccionado
function openChat(ticket) {
  chatBox.style.display = 'flex';
  chatMessages.innerHTML = '';
  chatMessages.dataset.ticketId = ticket._id;
  appendMessage(ticket.message, 'client');
}

// Función para añadir un mensaje al chat
function appendMessage(message, sender) {
  const div = document.createElement('div');
  
  if (message.startsWith('[IMAGE]') || message.startsWith('[VIDEO]') || message.startsWith('[AUDIO]')) {
    const fileType = message.substring(1, message.indexOf(']')).toLowerCase();
    const filePath = message.substring(message.indexOf(' ') + 1);
    
    if (fileType === 'image') {
      const img = document.createElement('img');
      img.src = filePath;
      img.style.maxWidth = '100%';
      div.appendChild(img);
    } else if (fileType === 'video') {
      const video = document.createElement('video');
      video.src = filePath;
      video.controls = true;
      video.style.maxWidth = '100%';
      div.appendChild(video);
    } else if (fileType === 'audio') {
      const audio = document.createElement('audio');
      audio.src = filePath;
      audio.controls = true;
      div.appendChild(audio);
    } else {
      const a = document.createElement('a');
      a.href = filePath;
      a.textContent = filePath;
      div.appendChild(a);
    }
  } else {
    div.textContent = message;
  }

  div.className = sender === 'client' ? 'text-left' : 'text-right';
  chatMessages.appendChild(div);
}

// Manejador para el botón de enviar
sendButton.addEventListener('click', async () => {
  const message = chatInput.value;
  if (!message) return;

  const ticketId = chatMessages.dataset.ticketId;
  try {
    await axios.post('/agent/tickets/' + ticketId + '/message', { message }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    appendMessage(message, 'agent');
    chatInput.value = '';
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
  }
});

// Manejador para la subida de archivos
uploadButton.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const ticketId = chatMessages.dataset.ticketId;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/agent/tickets/' + ticketId + '/media', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    appendMessage(`[${file.type.split('/')[0].toUpperCase()}] /uploads/${file.name}`, 'agent');
  } catch (error) {
    console.error('Error al enviar el archivo:', error);
  }
});

// Inicialización
fetchTickets();
