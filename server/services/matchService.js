/**
 * services/matchService.js
 *
 * Functions for persisting and retrieving completed match records in MongoDB.
 *
 * All functions check whether the database is available before performing
 * any operation, so the game server continues to work without a database.
 */

"use strict";

const { getDB } = require("../db");

const COLLECTION = "matches";
const HISTORY_LIMIT = 20; // default limit for getRecentMatches

/**
 * saveMatch(matchData)
 *
 * Persists a completed match record.
 * Returns the inserted document's _id on success, or null if the save failed
 * (e.g. database is not connected, validation error).
 *
 * Expected shape of matchData:
 * {
 *   roomCode: string,
 *   player1:  string,   // display name of red player
 *   player2:  string,   // display name of yellow player
 *   winner:   string | null,  // display name of winner, null for draw
 *   result:   "win" | "draw",
 *   totalMoves: number,
 *   createdAt: Date
 * }
 *
 * @param {Object} matchData
 * @returns {Promise<string|null>}
 */
async function saveMatch(matchData) {
  const database = getDB();
  if (!database) {
    console.warn("[matchService] No database connection. Match not saved:", matchData.roomCode);
    return null;
  }

  // Validate required fields before writing to the database
  const { roomCode, player1, player2, result, totalMoves } = matchData;
  if (!roomCode || !player1 || !player2 || !result || typeof totalMoves !== "number") {
    console.error("[matchService] Invalid match data — missing required fields. Match not saved.");
    return null;
  }

  if (result !== "win" && result !== "draw") {
    console.error("[matchService] Invalid result value:", result);
    return null;
  }

  try {
    const doc = {
      roomCode,
      player1,
      player2,
      winner: matchData.winner ?? null,
      result,
      totalMoves,
      createdAt: matchData.createdAt instanceof Date ? matchData.createdAt : new Date(),
    };

    const response = await database.collection(COLLECTION).insertOne(doc);
    console.log(`[matchService] Match saved. Room: ${roomCode}, _id: ${response.insertedId}`);
    return response.insertedId.toString();
  } catch (err) {
    console.error("[matchService] Error saving match:", err.message);
    return null;
  }
}

/**
 * getRecentMatches(limit)
 *
 * Retrieves the most recent completed matches, sorted newest first.
 * Returns an empty array if the database is unavailable or an error occurs.
 *
 * @param {number} [limit=20] - maximum number of records to return
 * @returns {Promise<Array>}
 */
async function getRecentMatches(limit = HISTORY_LIMIT) {
  const database = getDB();
  if (!database) {
    console.warn("[matchService] No database connection. Cannot retrieve match history.");
    return [];
  }

  try {
    const safeLimit = Math.max(1, Math.min(Number(limit) || HISTORY_LIMIT, 100));
    const matches = await database
      .collection(COLLECTION)
      .find({}, { projection: { _id: 1, roomCode: 1, player1: 1, player2: 1, winner: 1, result: 1, totalMoves: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .toArray();

    return matches.map((m) => ({ ...m, _id: m._id.toString() }));
  } catch (err) {
    console.error("[matchService] Error retrieving match history:", err.message);
    return [];
  }
}

module.exports = { saveMatch, getRecentMatches };
