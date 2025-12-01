const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    pixelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pixel",
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

module.exports = mongoose.model("Assignment", assignmentSchema);

