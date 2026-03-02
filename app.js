const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");
const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

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

// Handle Redis connection errors
redisClient.on("error", (err) => console.error("Redis Client Error", err));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

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

// POST /events: Create a new event
app.post("/events", async (req, res) => {
  const { calendar_id, title, description, start_time, end_time, location } = req.body;

  if (!calendar_id || !title || !start_time || !end_time) {
    return res.status(400).json({ error: "Required fields: calendar_id, title, start_time, end_time" });
  }

  const eventData = { calendar_id, title, description, start_time, end_time, location };

  try {
    // Insert the event into PostgreSQL ("events" table)
    const result = await pool.query(
      "INSERT INTO events (calendar_id, title, description, start_time, end_time, location) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [eventData.calendar_id, eventData.title, eventData.description, eventData.start_time, eventData.end_time, eventData.location]
    );
    const newId = result.rows[0].id;

    // Increment "eventCount" in Redis
    await redisClient.incr("eventCount");

    res.status(201).json({ id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /events: Retrieve all events
app.get("/events", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM events ORDER BY start_time ASC");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /events/:id: Retrieve an event by ID
app.get("/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /events/:id: Update an event by ID (supports partial update)
app.put("/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const existingData = result.rows[0];
    const updatedData = {
      title: req.body.title !== undefined ? req.body.title : existingData.title,
      description: req.body.description !== undefined ? req.body.description : existingData.description,
      start_time: req.body.start_time !== undefined ? req.body.start_time : existingData.start_time,
      end_time: req.body.end_time !== undefined ? req.body.end_time : existingData.end_time,
      location: req.body.location !== undefined ? req.body.location : existingData.location,
    };

    await pool.query(
      "UPDATE events SET title = $1, description = $2, start_time = $3, end_time = $4, location = $5 WHERE id = $6",
      [updatedData.title, updatedData.description, updatedData.start_time, updatedData.end_time, updatedData.location, id]
    );

    res.status(200).json({ id, data: updatedData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /events/:id: Delete an event by ID
app.delete("/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    await redisClient.decr("eventCount");
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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

// Start the server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});