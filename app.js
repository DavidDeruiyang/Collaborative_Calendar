const express = require("express");

const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const { createClient } = require("redis");
const app = express();
// For serving frontend files
app.use(express.static('frontend'));
const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend')));
//
const port = 3000;
const server = http.createServer(app);
const io = new Server(server, {
  transports: ["websocket"],
  cors: {
    origin: "*"
  }
});
const CALENDAR_SOCKET_CHANNEL = "calendar:socket-events";

// auth const
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// mailer
const nodemailer = require("nodemailer");

// Middleware to parse JSON request bodies
app.use(express.json({ limit: "10mb" }));

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Redis connection
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});
const redisSubscriber = redisClient.duplicate();

// Handle Redis connection errors
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisSubscriber.on("error", (err) => console.error("Redis Subscriber Error", err));

async function setupRedis() {
  await redisClient.connect();
  await redisSubscriber.connect();

  await redisSubscriber.subscribe(CALENDAR_SOCKET_CHANNEL, (message) => {
    try {
      const payload = JSON.parse(message);
      const { room, eventName, data } = payload;

      if (!room || !eventName) {
        return;
      }

      io.to(room).emit(eventName, data);
    } catch (err) {
      console.error("Failed to process socket event message:", err);
    }
  });
}

async function broadcastCalendarUpdate(calendarId, eventName, data) {
  const room = `calendar:${calendarId}`;

  await redisClient.publish(
    CALENDAR_SOCKET_CHANNEL,
    JSON.stringify({
      room,
      eventName,
      data
    })
  );
}

// Initialize eventCount in Redis if not set
async function initializeEventCount() {
  // Check if "eventCount" exists in Redis
  const value = await redisClient.get("eventCount");

  if (value === null) {
    // If not, query PostgreSQL to count all events
    const result = await pool.query("SELECT COUNT(*) FROM events");
    const count = parseInt(result.rows[0].count, 10);

    // Store the result back into Redis
    await redisClient.set("eventCount", count);
  }
}

// mailer help func
const mailEnabled =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS;

const mailTransporter = mailEnabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

async function sendEmailSafe({ to, subject, text, html }) {
  if (!mailTransporter) {
    console.log("Email disabled: SMTP settings are missing");
    return false;
  }

  try {
    await mailTransporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}

async function getCalendarNotificationRecipients(calendarId, excludeUserId) {
  const result = await pool.query(
    `
    SELECT DISTINCT u.id, u.name, u.email
    FROM (
      SELECT user_id FROM calendars WHERE id = $1
      UNION
      SELECT user_id FROM calendar_shares WHERE calendar_id = $1
    ) recipients
    JOIN users u ON u.id = recipients.user_id
    WHERE recipients.user_id <> $2
    ORDER BY u.email ASC
    `,
    [calendarId, excludeUserId]
  );

  return result.rows;
}

async function notifyCalendarRecipients({
  calendarId,
  excludeUserId,
  subject,
  textBuilder,
  htmlBuilder
}) {
  const recipients = await getCalendarNotificationRecipients(calendarId, excludeUserId);

  if (recipients.length === 0) {
    return;
  }

  await Promise.allSettled(
    recipients.map((recipient) =>
      sendEmailSafe({
        to: recipient.email,
        subject,
        text: textBuilder(recipient),
        html: htmlBuilder ? htmlBuilder(recipient) : undefined
      })
    )
  );
}

// permission helper (getCalendarRole, canWrite, canRead, canDelete)
async function getCalendarRole(userId, calendarId) {
  const ownerResult = await pool.query(
    "SELECT user_id FROM calendars WHERE id = $1",
    [calendarId]
  );

  if (ownerResult.rows.length === 0) {
    return null;
  }

  if (ownerResult.rows[0].user_id === userId) {
    return "owner";
  }

  const shareResult = await pool.query(
    "SELECT permission FROM calendar_shares WHERE calendar_id = $1 AND user_id = $2",
    [calendarId, userId]
  );

  if (shareResult.rows.length === 0) {
    return null;
  }

  return shareResult.rows[0].permission;
}

function canRead(role) {
  return role === "owner" || role === "editor" || role === "viewer";
}

function canWrite(role) {
  return role === "owner" || role === "editor";
}

function canDelete(role) {
  return role === "owner" || role === "editor";
}

async function getCalendarById(calendarId) {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      name,
      description,
      created_at
    FROM calendars
    WHERE id = $1
    `,
    [calendarId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function getEventById(eventId) {
  const result = await pool.query(
    `
    SELECT e.*, c.user_id AS owner_id
    FROM events e
    JOIN calendars c ON e.calendar_id = c.id
    WHERE e.id = $1
    `,
    [eventId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// token generator func
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, global_role: user.global_role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// web socket auth
function extractSocketToken(socket) {
  const raw =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization ||
    "";

  if (!raw) return null;

  if (raw.startsWith("Bearer ")) {
    return raw.slice(7);
  }

  return raw;
}

io.use((socket, next) => {
  try {
    const token = extractSocketToken(socket);

    if (!token) {
      return next(new Error("Missing token"));
    }

    const user = jwt.verify(token, JWT_SECRET);
    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}, user=${socket.data.user.email}`);

  socket.on("join_calendar", async (calendarId, callback) => {
    try {
      const parsedCalendarId = Number(calendarId);

      if (Number.isNaN(parsedCalendarId)) {
        if (callback) callback({ ok: false, error: "Invalid calendar id" });
        return;
      }

      const role = await getCalendarRole(socket.data.user.id, parsedCalendarId);

      if (!canRead(role)) {
        if (callback) callback({ ok: false, error: "You do not have access to this calendar" });
        return;
      }

      const roomName = `calendar:${parsedCalendarId}`;
      socket.join(roomName);

      if (callback) {
        callback({
          ok: true,
          room: roomName,
          role
        });
      }
    } catch (err) {
      console.error("join_calendar error:", err);
      if (callback) callback({ ok: false, error: "Server error" });
    }
  });

  socket.on("leave_calendar", (calendarId, callback) => {
    const parsedCalendarId = Number(calendarId);

    if (Number.isNaN(parsedCalendarId)) {
      if (callback) callback({ ok: false, error: "Invalid calendar id" });
      return;
    }

    const roomName = `calendar:${parsedCalendarId}`;
    socket.leave(roomName);

    if (callback) {
      callback({
        ok: true,
        room: roomName
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// POST /events: Create a new event
app.post("/events", requireAuth, async (req, res) => {
  const { calendar_id, title, description, start_time, end_time, location, status } = req.body;

  if (!calendar_id || !title || !start_time || !end_time) {
    return res.status(400).json({
      error: "Required fields: calendar_id, title, start_time, end_time"
    });
  }

  const calendarId = Number(calendar_id);

  if (Number.isNaN(calendarId)) {
    return res.status(400).json({ error: "calendar_id must be a number" });
  }

  try {
    const role = await getCalendarRole(req.user.id, calendarId);

    if (!role) {
      return res.status(403).json({ error: "You do not have access to this calendar" });
    }

    if (!canWrite(role)) {
      return res.status(403).json({ error: "You do not have permission to create events" });
    }

    const result = await pool.query(
      `
      INSERT INTO events (calendar_id, title, description, start_time, end_time, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [calendarId, title, description || null, start_time, end_time, location || null, status || "scheduled"]
    );

    await redisClient.incr("eventCount");

    // mail notification
    await notifyCalendarRecipients({
      calendarId,
      excludeUserId: req.user.id,
      subject: `Event created: ${result.rows[0].title}`,
      textBuilder: () =>
        `${req.user.email} created a new event "${result.rows[0].title}" in calendar ${calendarId}.`,
      htmlBuilder: () => `
        <p><strong>${req.user.email}</strong> created a new event
        "<strong>${result.rows[0].title}</strong>" in calendar <strong>${calendarId}</strong>.</p>
      `
    });

    // socket io emission
    await broadcastCalendarUpdate(calendarId, "event_created", result.rows[0]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /events: Retrieve only events visible to the logged-in user
app.get("/events", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT e.*
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      LEFT JOIN calendar_shares cs
        ON cs.calendar_id = c.id
        AND cs.user_id = $1
      WHERE c.user_id = $1
         OR cs.user_id = $1
      ORDER BY e.start_time ASC
      `,
      [req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Search Events API
app.get("/events/search", requireAuth, async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  try {
    const result = await pool.query(
      `
      SELECT DISTINCT e.*
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      LEFT JOIN calendar_shares cs
        ON cs.calendar_id = c.id
      LEFT JOIN event_participants ep
        ON ep.event_id = e.id
      LEFT JOIN users u
        ON u.id = ep.user_id
      WHERE (e.title ILIKE $1
             OR e.description ILIKE $1
             OR u.email ILIKE $1)
        AND (c.user_id = $2 OR cs.user_id = $2)
      ORDER BY e.start_time ASC
      `,
      [`%${q}%`, req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /events/:id: Retrieve one event if user can read its calendar
app.get("/events/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const event = await getEventById(id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const role = await getCalendarRole(req.user.id, event.calendar_id);

    if (!canRead(role)) {
      return res.status(403).json({ error: "You do not have access to this event" });
    }

    return res.status(200).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});


// GET participants of an event
app.get("/events/:id/participants", requireAuth, async (req, res) => {
  const eventId = Number(req.params.id);

  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  try {
    const event = await getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const role = await getCalendarRole(req.user.id, event.calendar_id);
    if (!canRead(role)) {
      return res.status(403).json({ error: "No permission" });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = $1`,
      [eventId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



// PUT /events/:id: Update an event if user can write to its calendar
app.put("/events/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const existingEvent = await getEventById(id);

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    const role = await getCalendarRole(req.user.id, existingEvent.calendar_id);

    if (!canWrite(role)) {
      return res.status(403).json({ error: "You do not have permission to update this event" });
    }

    const updatedData = {
      title: req.body.title !== undefined ? req.body.title : existingEvent.title,
      description: req.body.description !== undefined ? req.body.description : existingEvent.description,
      start_time: req.body.start_time !== undefined ? req.body.start_time : existingEvent.start_time,
      end_time: req.body.end_time !== undefined ? req.body.end_time : existingEvent.end_time,
      location: req.body.location !== undefined ? req.body.location : existingEvent.location,
      status: req.body.status !== undefined ? req.body.status : existingEvent.status,
    };

    const updateResult = await pool.query(
      `
      UPDATE events
      SET title = $1,
          description = $2,
          start_time = $3,
          end_time = $4,
          location = $5,
          status = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        updatedData.title,
        updatedData.description,
        updatedData.start_time,
        updatedData.end_time,
        updatedData.location,
        updatedData.status,
        id
      ]
    );

    // mail notification
    await notifyCalendarRecipients({
      calendarId: existingEvent.calendar_id,
      excludeUserId: req.user.id,
      subject: `Event updated: ${updateResult.rows[0].title}`,
      textBuilder: () =>
        `${req.user.email} updated the event "${updateResult.rows[0].title}" in calendar ${existingEvent.calendar_id}.`,
      htmlBuilder: () => `
        <p><strong>${req.user.email}</strong> updated the event
        "<strong>${updateResult.rows[0].title}</strong>" in calendar <strong>${existingEvent.calendar_id}</strong>.</p>
      `
    });

    // socket io emission
    await broadcastCalendarUpdate(
      existingEvent.calendar_id,
      "event_updated",
      updateResult.rows[0]
    );

    return res.status(200).json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /events/:id: Delete an event if user is the owner of the calendar
app.delete("/events/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const existingEvent = await getEventById(id);

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    const role = await getCalendarRole(req.user.id, existingEvent.calendar_id);

    if (!canDelete(role)) {
      return res.status(403).json({ error: "You do not have permission to delete this event" });
    }

    const deletedEventPayload = {
      id: existingEvent.id,
      calendar_id: existingEvent.calendar_id,
      title: existingEvent.title
    };

    await pool.query("DELETE FROM events WHERE id = $1", [id]);
    await redisClient.decr("eventCount");

    await broadcastCalendarUpdate(
      existingEvent.calendar_id,
      "event_deleted",
      deletedEventPayload
    );

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Add participant to event
app.post("/events/:id/participants", requireAuth, async (req, res) => {
  const eventId = Number(req.params.id);
  const { email } = req.body;

  if (Number.isNaN(eventId) || !email) {
    return res.status(400).json({ error: "Invalid event id or email" });
  }

  try {
    const event = await getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const role = await getCalendarRole(req.user.id, event.calendar_id);
    if (!canWrite(role)) {
      return res.status(403).json({ error: "No permission" });
    }

    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Invalid email: user not found" });
    }

    const targetUser = userResult.rows[0];

    const result = await pool.query(
      `INSERT INTO event_participants (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING *`,
      [eventId, targetUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: "User is already a participant" });
    }

    return res.status(201).json({
      message: "Participant added",
      user: targetUser
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Remove participant from event
app.delete("/events/:id/participants/:userId", requireAuth, async (req, res) => {
  const eventId = Number(req.params.id);
  const userId = Number(req.params.userId);

  if (Number.isNaN(eventId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const event = await getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const role = await getCalendarRole(req.user.id, event.calendar_id);
    if (!canWrite(role)) {
      return res.status(403).json({ error: "No permission" });
    }

    await pool.query(
      "DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2",
      [eventId, userId]
    );

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /stats: Retrieve cached event count
app.get("/stats", async (req, res) => {
  try {
    await initializeEventCount();
    const value = await redisClient.get("eventCount");
    const eventCount = parseInt(value, 10);
    res.status(200).json({ eventCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/register: 
app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, global_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, global_role`,
      [name, email, passwordHash, "member"]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/login:
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, global_role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        global_role: user.global_role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /me:
app.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, global_role, created_at, profile_picture FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



// POST /calendars: Create a calendar for the logged-in user
app.post("/calendars", requireAuth, async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Calendar name is required" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO calendars (user_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [req.user.id, name.trim(), description || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /calendars: List calendars the user owns or that are shared with them
app.get("/calendars", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT
        c.id,
        c.user_id,
        c.name,
        c.description,
        c.created_at,
        CASE
          WHEN c.user_id = $1 THEN 'owner'
          ELSE cs.permission
        END AS role
      FROM calendars c
      LEFT JOIN calendar_shares cs
        ON cs.calendar_id = c.id
        AND cs.user_id = $1
      WHERE c.user_id = $1
         OR cs.user_id = $1
      ORDER BY c.created_at ASC
      `,
      [req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /calendars/:id: Retrieve one calendar if the user has access
app.get("/calendars/:id", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);

  if (Number.isNaN(calendarId)) {
    return res.status(400).json({ error: "Invalid calendar id" });
  }

  try {
    const calendar = await getCalendarById(calendarId);

    if (!calendar) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const role = await getCalendarRole(req.user.id, calendarId);

    if (!canRead(role)) {
      return res.status(403).json({ error: "You do not have access to this calendar" });
    }

    return res.status(200).json({
      ...calendar,
      role
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT /calendars/:id: Only the owner can update calendar details
app.put("/calendars/:id", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);

  if (Number.isNaN(calendarId)) {
    return res.status(400).json({ error: "Invalid calendar id" });
  }

  try {
    const calendar = await getCalendarById(calendarId);

    if (!calendar) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    if (calendar.user_id !== req.user.id) {
      return res.status(403).json({ error: "Only owner can update this calendar" });
    }

    const updatedName =
      req.body.name !== undefined ? req.body.name.trim() : calendar.name;
    const updatedDescription =
      req.body.description !== undefined ? req.body.description : calendar.description;

    if (!updatedName) {
      return res.status(400).json({ error: "Calendar name cannot be empty" });
    }

    const result = await pool.query(
      `
      UPDATE calendars
      SET name = $1,
          description = $2
      WHERE id = $3
      RETURNING *
      `,
      [updatedName, updatedDescription, calendarId]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /calendars/:id: Only the owner can delete a calendar
app.delete("/calendars/:id", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);

  if (Number.isNaN(calendarId)) {
    return res.status(400).json({ error: "Invalid calendar id" });
  }

  try {
    const calendar = await getCalendarById(calendarId);

    if (!calendar) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    if (calendar.user_id !== req.user.id) {
      return res.status(403).json({ error: "Only owner can delete this calendar" });
    }

    // Keep Redis eventCount accurate after cascading event deletes
    const eventCountResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM events WHERE calendar_id = $1",
      [calendarId]
    );
    const deletedEventCount = eventCountResult.rows[0].count;

    await pool.query("DELETE FROM calendars WHERE id = $1", [calendarId]);

    if (deletedEventCount > 0) {
      const currentValue = await redisClient.get("eventCount");
      const currentCount = parseInt(currentValue || "0", 10);
      const nextCount = Math.max(0, currentCount - deletedEventCount);
      await redisClient.set("eventCount", nextCount);
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /calendars/:id/share: share calendar
app.post("/calendars/:id/share", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);
  const { user_email, permission } = req.body;

  if (Number.isNaN(calendarId)) {
    return res.status(400).json({ error: "Invalid calendar id" });
  }

  if (!user_email || !permission) {
    return res.status(400).json({ error: "user_email and permission are required" });
  }

  if (!["viewer", "editor"].includes(permission)) {
    return res.status(400).json({ error: "permission must be viewer or editor" });
  }

  try {
    const calendarResult = await pool.query(
      "SELECT * FROM calendars WHERE id = $1",
      [calendarId]
    );

    if (calendarResult.rows.length === 0) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const calendar = calendarResult.rows[0];

    if (calendar.user_id !== req.user.id) {
      return res.status(403).json({ error: "Only the calendar owner can share it" });
    }

    const userResult = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [user_email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const targetUser = userResult.rows[0];

    await pool.query(
      `
      INSERT INTO calendar_shares (calendar_id, user_id, permission)
      VALUES ($1, $2, $3)
      ON CONFLICT (calendar_id, user_id)
      DO UPDATE SET permission = EXCLUDED.permission
      `,
      [calendarId, targetUser.id, permission]
    );

    // mail notification
    await sendEmailSafe({
      to: targetUser.email,
      subject: `A calendar was shared with you: ${calendar.name}`,
      text: `${req.user.email} shared the calendar "${calendar.name}" with you as ${permission}.`,
      html: `
        <p><strong>${req.user.email}</strong> shared the calendar
        "<strong>${calendar.name}</strong>" with you as <strong>${permission}</strong>.</p>
      `
    });

    return res.status(200).json({
      message: "Calendar shared successfully",
      calendar_id: calendarId,
      user_id: targetUser.id,
      permission
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /calendars/:id/members: listen calendar members
app.get("/calendars/:id/members", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);

  if (Number.isNaN(calendarId)) {
    return res.status(400).json({ error: "Invalid calendar id" });
  }

  try {
    const calendarResult = await pool.query(
      "SELECT * FROM calendars WHERE id = $1",
      [calendarId]
    );

    if (calendarResult.rows.length === 0) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const calendar = calendarResult.rows[0];
    const role = await getCalendarRole(req.user.id, calendarId);

    if (!canRead(role)) {
      return res.status(403).json({ error: "You do not have access to this calendar" });
    }

    const membersResult = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        cs.permission
      FROM calendar_shares cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.calendar_id = $1
      ORDER BY u.name ASC
      `,
      [calendarId]
    );

    return res.status(200).json({
      owner_id: calendar.user_id,
      shared_members: membersResult.rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /calendars/:id/members/:userId: update a member's permission
app.patch("/calendars/:id/members/:userId", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const { permission } = req.body;

  if (Number.isNaN(calendarId) || Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (!["viewer", "editor"].includes(permission)) {
    return res.status(400).json({ error: "permission must be viewer or editor" });
  }

  try {
    const calendarResult = await pool.query(
      "SELECT * FROM calendars WHERE id = $1",
      [calendarId]
    );

    if (calendarResult.rows.length === 0) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const calendar = calendarResult.rows[0];

    if (calendar.user_id !== req.user.id) {
      return res.status(403).json({ error: "Only owner can update member roles" });
    }

    const updateResult = await pool.query(
      `
      UPDATE calendar_shares
      SET permission = $1
      WHERE calendar_id = $2 AND user_id = $3
      RETURNING *
      `,
      [permission, calendarId, targetUserId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Shared member not found" });
    }

    return res.status(200).json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /calendars/:id/members/:userId: remove member from calendar
app.delete("/calendars/:id/members/:userId", requireAuth, async (req, res) => {
  const calendarId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);

  if (Number.isNaN(calendarId) || Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const calendarResult = await pool.query(
      "SELECT * FROM calendars WHERE id = $1",
      [calendarId]
    );

    if (calendarResult.rows.length === 0) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const calendar = calendarResult.rows[0];

    if (calendar.user_id !== req.user.id) {
      return res.status(403).json({ error: "Only owner can remove members" });
    }

    const deleteResult = await pool.query(
      "DELETE FROM calendar_shares WHERE calendar_id = $1 AND user_id = $2 RETURNING *",
      [calendarId, targetUserId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Shared member not found" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET profile picture
app.get("/me/profile-picture", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT profile_picture FROM users WHERE id = $1",
    [req.user.id]
  );

  res.json({ profile_picture: result.rows[0].profile_picture });
});

// UPDATE profile picture
app.post("/me/profile-picture", requireAuth, async (req, res) => {
  const { profile_picture } = req.body;

  await pool.query(
    "UPDATE users SET profile_picture = $1 WHERE id = $2",
    [profile_picture, req.user.id]
  );

  res.json({ message: "Updated" });
});

// Start the server after Redis is ready for caching + cross-replica socket broadcasts.
async function startServer() {
  try {
    await setupRedis();
    server.listen(port, () => {
      console.log(`API + Socket.IO running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
