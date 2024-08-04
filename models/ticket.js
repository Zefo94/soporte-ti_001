const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  from: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'open' }, // 'open', 'in progress', 'closed'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ticket', ticketSchema);
