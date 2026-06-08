const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    venue: {
      type: String,
      required: true,
    },

    branch: {
      type: String,
      required: true,
    },

    participants: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Planning", "Completed", "Cancelled"],
      default: "Upcoming",
    },

    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);