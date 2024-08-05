const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  from: { type: String, required: true },
  message: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'in progress', 'closed'], default: 'open' }
});

module.exports = mongoose.model('Ticket', ticketSchema);
