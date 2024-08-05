const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  from: { type: String, required: true },
  message: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now },
  mediaType: { type: String, required: false }, // Tipo de medio (opcional)
  mediaPath: { type: String, required: false }  // Ruta del medio (opcional)
});

module.exports = mongoose.model('Ticket', ticketSchema);
