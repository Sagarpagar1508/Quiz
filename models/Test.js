const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true },
});

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  questions: [questionSchema], // Embedded question schema
  startTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // In minutes
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  class: { type: String },
});

const Test = mongoose.model('Test', testSchema);
module.exports = Test;
