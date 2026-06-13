const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
    },

    registrationDeadline: {
      type: String,
      default: "",
    },

    coordinator: {
      type: String,
      default: "",
      trim: true,
    },

    eventCoordinator: {
      type: String,
      default: "",
      trim: true,
    },

    venue: {
      type: String,
     
      trim: true,
    },

    branch: {
      type: String,
      required: true,
      trim: true,
    },

    participants: {
      type: Number,
      default: 0,
      min: 0,
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

eventSchema.pre("save", function (next) {
  if (!this.eventCoordinator && this.coordinator) {
    this.eventCoordinator = this.coordinator;
  }

  if (!this.coordinator && this.eventCoordinator) {
    this.coordinator = this.eventCoordinator;
  }

});

module.exports = mongoose.model("Event", eventSchema);