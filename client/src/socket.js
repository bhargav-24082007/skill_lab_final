import { io } from "socket.io-client";

let rawUrl = import.meta.env.VITE_SERVER_URL;

// If VITE_SERVER_URL is provided, clean trailing slash
if (rawUrl && typeof rawUrl === "string") {
  rawUrl = rawUrl.trim().replace(/\/+$/, "");
}

// Default fallback for local testing
const defaultServerUrl =
  typeof window !== "undefined" && window.location.hostname
    ? `http://${window.location.hostname}:3000`
    : "http://localhost:3000";

export const SERVER_URL = rawUrl || defaultServerUrl;

console.log("[Socket] Target backend URL:", SERVER_URL);

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  timeout: 10000,
});
