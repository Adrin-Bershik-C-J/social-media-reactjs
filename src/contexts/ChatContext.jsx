import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageAPI,
  markConversationRead,
} from "../api/chat";

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: userId }
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const { user, isLoggedIn } = useAuth();
  const { socket } = useNotifications(); // Reuse the same socket from NotificationContext
  const token = localStorage.getItem("token");

  // Listen for socket events
  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    // New message received
    socket.on("chat:message", ({ message, conversation }) => {
      // Update conversations list
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conversation._id);
        if (exists) {
          return prev
            .map((c) =>
              c._id === conversation._id
                ? {
                    ...c,
                    lastMessage: message,
                    updatedAt: conversation.updatedAt,
                    unreadCount:
                      message.sender._id !== user.id
                        ? (c.unreadCount || 0) + 1
                        : c.unreadCount || 0,
                  }
                : c
            )
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          return [{ ...conversation, unreadCount: 1 }, ...prev];
        }
      });

      // If the message is for the active conversation, add it to messages
      if (activeConversation?._id === message.conversation) {
        setMessages((prev) => [...prev, message]);
      }

      // Update total unread count
      if (message.sender._id !== user.id) {
        setTotalUnreadCount((prev) => prev + 1);
      }
    });

    // Messages marked as read
    socket.on("chat:read", ({ conversationId }) => {
      // Update messages in active conversation
      if (activeConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, read: true }))
        );
      }
    });

    // Typing indicator
    socket.on("chat:typing", ({ conversationId, userId, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return { ...prev, [conversationId]: userId };
        } else {
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        }
      });
    });

    // Online/offline presence
    socket.on("user:online", ({ userId }) => {
      console.log("User came online:", userId);
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on("user:offline", ({ userId }) => {
      console.log("User went offline:", userId);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    // Receive initial list of online users
    socket.on("users:online", ({ userIds }) => {
      console.log("Received online users list:", userIds);
      setOnlineUsers(new Set(userIds));
    });

    return () => {
      socket.off("chat:message");
      socket.off("chat:read");
      socket.off("chat:typing");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("users:online");
    };
  }, [socket, isLoggedIn, activeConversation, user?.id]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isLoggedIn || !token) return;

    try {
      const response = await getConversations(token);
      setConversations(response.data);

      // Calculate total unread count
      const total = response.data.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setTotalUnreadCount(total);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, [isLoggedIn, token]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(
    async (conversationId, skip = 0) => {
      if (!isLoggedIn || !token) return;

      try {
        const response = await getMessages(conversationId, skip, 20, token);
        if (skip === 0) {
          setMessages(response.data);
        } else {
          setMessages((prev) => [...response.data, ...prev]);
        }
        return response.data;
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        return [];
      }
    },
    [isLoggedIn, token]
  );

  // Send a message
  const sendMessage = useCallback(
    async (recipientId, text) => {
      if (!isLoggedIn || !token || !text.trim()) return;

      try {
        const response = await sendMessageAPI(recipientId, text, token);
        const { message, conversation } = response.data;

        // Update conversations list
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conversation._id);
          if (exists) {
            return prev
              .map((c) =>
                c._id === conversation._id
                  ? { ...c, lastMessage: message, updatedAt: conversation.updatedAt }
                  : c
              )
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          } else {
            return [conversation, ...prev];
          }
        });

        // Add to messages if this is the active conversation
        if (activeConversation?._id === conversation._id) {
          setMessages((prev) => [...prev, message]);
        }

        return { message, conversation };
      } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
      }
    },
    [isLoggedIn, token, activeConversation]
  );

  // Mark conversation as read
  const markAsRead = useCallback(
    async (conversationId) => {
      if (!isLoggedIn || !token) return;

      try {
        await markConversationRead(conversationId, token);

        // Update local state
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversationId ? { ...c, unreadCount: 0 } : c
          )
        );

        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender._id !== user.id ? { ...msg, read: true } : msg
          )
        );

        // Update total unread count
        const conv = conversations.find((c) => c._id === conversationId);
        if (conv?.unreadCount) {
          setTotalUnreadCount((prev) => Math.max(0, prev - conv.unreadCount));
        }
      } catch (error) {
        console.error("Failed to mark conversation as read:", error);
      }
    },
    [isLoggedIn, token, conversations, user?.id]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (recipientId, conversationId, isTyping) => {
      if (!socket) return;
      socket.emit("chat:typing", { recipientId, conversationId, isTyping });
    },
    [socket]
  );

  // Fetch conversations on mount
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchConversations();
    }
  }, [isLoggedIn, user]);

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    onlineUsers,
    typingUsers,
    totalUnreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    sendTypingIndicator,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
