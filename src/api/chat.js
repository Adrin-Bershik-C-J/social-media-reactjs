import axios from "axios";
import config from "../config";

const API = axios.create({
  baseURL: `${config.API_URL}/api/chats`,
});

/**
 * Get all conversations for the logged-in user
 */
export const getConversations = (token) =>
  API.get("/", {
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * Get paginated messages for a specific conversation
 */
export const getMessages = (conversationId, skip = 0, limit = 20, token) =>
  API.get(`/${conversationId}/messages`, {
    params: { skip, limit },
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * Send a message to a recipient
 */
export const sendMessage = (recipientId, text, token) =>
  API.post(
    "/send",
    { recipientId, text },
    { headers: { Authorization: `Bearer ${token}` } }
  );

/**
 * Mark all messages in a conversation as read
 */
export const markConversationRead = (conversationId, token) =>
  API.patch(
    `/${conversationId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
