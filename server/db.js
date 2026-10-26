/**
 * db.js
 *
 * MongoDB connection module.
 * Exposes `connectDB()` to open the connection and `getDB()` to retrieve
 * the database instance from anywhere in the application.
 *
 * Keeps all MongoDB credentials inside this single file so the rest of
 * the codebase never imports the URI or the MongoClient directly.
 */

"use strict";

const { MongoClient } = require("mongodb");

let client = null;
let db = null;

/**
 * connectDB()
 *
 * Opens a connection to MongoDB using MONGODB_URI from the environment.
 * If MONGODB_URI is absent, logs a warning and returns without throwing,
 * so the game server can run in local play-without-database mode.
 *
 * @returns {Promise<void>}
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      "[DB] MONGODB_URI is not set. " +
        "Match history will NOT be saved. " +
        "Set MONGODB_URI in your .env file to enable persistence."
    );
    return;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(); // uses the database name from the URI
    console.log("[DB] Connected to MongoDB.");
  } catch (err) {
    console.error("[DB] Failed to connect to MongoDB:", err.message);
    console.warn("[DB] The game server will continue without database support.");
    client = null;
    db = null;
  }
}

/**
 * getDB()
 *
 * Returns the active database instance, or null if no connection is open.
 * Callers must check for null before performing any database operations.
 *
 * @returns {import("mongodb").Db | null}
 */
function getDB() {
  return db;
}

/**
 * closeDB()
 *
 * Gracefully closes the MongoDB connection.
 * Call this during server shutdown.
 *
 * @returns {Promise<void>}
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("[DB] MongoDB connection closed.");
  }
}

module.exports = { connectDB, getDB, closeDB };
