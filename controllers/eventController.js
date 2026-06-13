const Event = require("../models/Event.js");
const Branch = require("../models/Branch.js");
const {
  getBranchFilter,
  restrictBranchAccess,
} = require("../utils/branchAccess.js");

const getBranchCode = (branchName = "") => {
  return (
    branchName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3) || "OTH"
  );
};

const generateEventId = async (branch) => {
  const branchCode = getBranchCode(branch);
  const prefix = `SLB-${branchCode}-EVT-`;

  const lastEvent = await Event.findOne({
    eventId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastEvent?.eventId) {
    const lastNumber = parseInt(lastEvent.eventId.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      type,
      date,
      startTime,
      endTime,
      registrationDeadline,
      coordinator,
      eventCoordinator,
      venue,
      branch,
      participants,
      status,
      description,
    } = req.body;

 if (
  !name?.trim() ||
  !type?.trim() ||
  !date ||
  
  !branch?.trim()
) {
  return res.status(400).json({
    message: "Name, type, date, venue and branch are required",
    received: { name, type, date, venue, branch },
  });
}

    if (!restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const branchExists = await Branch.findOne({ name: branch });

    if (!branchExists) {
      return res.status(400).json({
        message: "Selected branch does not exist",
      });
    }

    const eventId = await generateEventId(branch);

    const event = await Event.create({
      eventId,
      name,
      type,
      date,
      startTime: startTime || "",
      endTime: endTime || "",
      registrationDeadline: registrationDeadline || "",
      coordinator: coordinator || eventCoordinator || "",
      eventCoordinator: eventCoordinator || coordinator || "",
      venue,
      branch,
      participants: Number(participants) || 0,
      status: status || "Upcoming",
      description,
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const query = getBranchFilter(req, "branch");

    const { type, branch, status, date } = req.query;

    if (type) query.type = type;
    if (branch) query.branch = branch;
    if (status) query.status = status;
    if (date) query.date = date;

    const events = await Event.find(query).sort({ date: -1, createdAt: -1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getBranchFilter(req, "branch"),
    };

    const event = await Event.findOne(query);

    if (!event) {
      return res
        .status(404)
        .json({ message: "Event not found or access denied" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!restrictBranchAccess(req, event.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const {
      name,
      type,
      date,
      startTime,
      endTime,
      registrationDeadline,
      coordinator,
      eventCoordinator,
      venue,
      branch,
      participants,
      status,
      description,
    } = req.body;

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    if (branch) {
      const branchExists = await Branch.findOne({ name: branch });

      if (!branchExists) {
        return res.status(400).json({
          message: "Selected branch does not exist",
        });
      }
    }

    event.name = name || event.name;
    event.type = type || event.type;
    event.date = date || event.date;
    event.startTime = startTime !== undefined ? startTime : event.startTime;
    event.endTime = endTime !== undefined ? endTime : event.endTime;
    event.registrationDeadline =
      registrationDeadline !== undefined
        ? registrationDeadline
        : event.registrationDeadline;

    event.coordinator =
      coordinator !== undefined
        ? coordinator
        : eventCoordinator !== undefined
        ? eventCoordinator
        : event.coordinator;

    event.eventCoordinator =
      eventCoordinator !== undefined
        ? eventCoordinator
        : coordinator !== undefined
        ? coordinator
        : event.eventCoordinator;

    event.venue = venue || event.venue;
    event.branch = branch || event.branch;
    event.participants =
      participants !== undefined
        ? Number(participants) || 0
        : event.participants;
    event.status = status || event.status;
    event.description =
      description !== undefined ? description : event.description;

    await event.save();

    res.json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!restrictBranchAccess(req, event.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};