const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  from: { type: String, required: true },
  message: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'open' },
  solution: String,
  mediaPath: String,
  mediaType: String,
  mediaSize: Number,
  history: [{
    message: String,
    mediaPath: String,
    mediaType: String,
    mediaSize: Number,
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
