/**
 * tests/matchHistory.test.js
 *
 * Unit tests for match-history response parsing, error handling, and empty states.
 */

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// Helper function that mirrors MatchHistory component's response parsing logic
function parseMatchHistoryResponse(status, statusText, responseBody) {
  if (status < 200 || status >= 300) {
    let errorMsg = `Server returned status ${status} (${statusText || "Error"})`;
    if (responseBody && typeof responseBody === "object" && responseBody.error) {
      errorMsg = responseBody.error;
    }
    throw new Error(errorMsg);
  }

  if (responseBody && Array.isArray(responseBody.matches)) {
    return responseBody.matches.map((m) => {
      const date = m.createdAt ? new Date(m.createdAt).toLocaleString() : "—";
      const isDraw = m.result === "draw";
      return {
        _id: m._id,
        roomCode: m.roomCode,
        player1: m.player1,
        player2: m.player2,
        winner: m.winner,
        result: m.result,
        totalMoves: m.totalMoves,
        createdAt: m.createdAt,
        formattedDate: date,
        isDraw,
        outcomeLabel: isDraw ? "Draw" : `Winner: ${m.winner}`,
      };
    });
  }

  throw new Error("Invalid response format: 'matches' array is missing.");
}

describe("Match History response parsing", () => {
  test("parses real backend response format correctly", () => {
    const backendData = {
      matches: [
        {
          _id: "6ae0c7aead9e0add13266367",
          roomCode: "XA3TQ4",
          player1: "Rohan",
          player2: "John",
          winner: "John",
          result: "win",
          totalMoves: 8,
          createdAt: "2026-10-27T15:47:58.103Z",
        },
        {
          _id: "6ae0c7aead9e0add13266368",
          roomCode: "BB88CC",
          player1: "Alice",
          player2: "Bob",
          winner: null,
          result: "draw",
          totalMoves: 42,
          createdAt: "2026-10-27T15:50:00.000Z",
        },
      ],
    };

    const parsed = parseMatchHistoryResponse(200, "OK", backendData);
    assert.equal(parsed.length, 2);

    // Record 1: Win
    assert.equal(parsed[0]._id, "6ae0c7aead9e0add13266367");
    assert.equal(parsed[0].roomCode, "XA3TQ4");
    assert.equal(parsed[0].player1, "Rohan");
    assert.equal(parsed[0].player2, "John");
    assert.equal(parsed[0].winner, "John");
    assert.equal(parsed[0].result, "win");
    assert.equal(parsed[0].totalMoves, 8);
    assert.equal(parsed[0].isDraw, false);
    assert.equal(parsed[0].outcomeLabel, "Winner: John");

    // Record 2: Draw
    assert.equal(parsed[1].roomCode, "BB88CC");
    assert.equal(parsed[1].result, "draw");
    assert.equal(parsed[1].isDraw, true);
    assert.equal(parsed[1].outcomeLabel, "Draw");
  });

  test("handles empty match history array with empty list", () => {
    const emptyData = { matches: [] };
    const parsed = parseMatchHistoryResponse(200, "OK", emptyData);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 0);
  });

  test("throws precise error when HTTP status is 500 with backend error message", () => {
    const errorBody = { error: "Failed to retrieve match history." };
    assert.throws(
      () => parseMatchHistoryResponse(500, "Internal Server Error", errorBody),
      (err) => err.message === "Failed to retrieve match history."
    );
  });

  test("throws precise error when HTTP status is 404 without false DB connection claim", () => {
    assert.throws(
      () => parseMatchHistoryResponse(404, "Not Found", null),
      (err) => err.message.includes("404") && !err.message.includes("MongoDB")
    );
  });

  test("throws error when response shape is missing 'matches' array", () => {
    assert.throws(
      () => parseMatchHistoryResponse(200, "OK", { data: [] }),
      (err) => err.message.includes("Invalid response format")
    );
  });
});
