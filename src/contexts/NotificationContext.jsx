import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { io } from "socket.io-client";
import config from "../config";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [socket, setSocket] = useState(null);
  const { user, isLoggedIn } = useAuth();

  const token = localStorage.getItem("token");

  // Disconnect socket function
  const disconnectSocket = useCallback(() => {
    if (socket) {
      console.log("Manually disconnecting socket...");
      socket.emit("user:disconnect");
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  // Initialize socket connection
  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      // Disconnect socket if user logs out
      if (socket) {
        socket.emit("user:disconnect");
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io(config.API_URL, {
      query: { userId: user.id },
      auth: { token },
    });

    setSocket(socketInstance);

    // Listen for new notifications
    socketInstance.on("notification:new", (newNotification) => {
      // Add to notifications list
      setNotifications((prev) => [newNotification, ...prev]);

      // Update unread count
      setUnreadCount((prev) => prev + 1);

      // Optional: Show browser notification
      if (Notification.permission === "granted") {
        new Notification("New notification", {
          body: `${newNotification.sender?.name} ${renderNotificationBody(
            newNotification.type
          )}`,
          icon: newNotification.sender?.profilePicture,
        });
      }
    });

    // Handle browser close/refresh
    const handleBeforeUnload = () => {
      socketInstance.emit("user:disconnect");
      socketInstance.disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount or logout
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socketInstance.emit("user:disconnect");
      socketInstance.disconnect();
    };
  }, [isLoggedIn, user?.id, token]);

  // Request notification permission
  useEffect(() => {
    if (isLoggedIn && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  const fetchNotifications = useCallback(
    async (reset = false) => {
      if (!isLoggedIn || !token) return;

      try {
        const skip = reset ? 0 : notifications.length;
        const response = await axios.get(
          `${config.API_URL}/api/notifications?skip=${skip}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const {
          notifications: newNotifications,
          unreadCount: serverUnreadCount,
        } = response.data;

        if (reset) {
          setNotifications(newNotifications);
          setUnreadCount(serverUnreadCount);
        } else {
          setNotifications((prev) => [...prev, ...newNotifications]);
        }

        setHasMore(newNotifications.length === 20);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    },
    [isLoggedIn, token, notifications.length]
  );

  const markAllRead = useCallback(async () => {
    if (!isLoggedIn || !token) return;

    try {
      await axios.patch(
        `${config.API_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [isLoggedIn, token]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!isLoggedIn || !token) return;

      try {
        await axios.patch(
          `${config.API_URL}/api/notifications/${notificationId}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );

        // Decrease unread count if notification was unread
        setUnreadCount((prev) => {
          const notification = notifications.find(
            (n) => n._id === notificationId
          );
          return notification && !notification.read
            ? Math.max(0, prev - 1)
            : prev;
        });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [isLoggedIn, token, notifications]
  );

  // Fetch initial notifications when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchNotifications(true);
    }
  }, [isLoggedIn, user]);

  const value = {
    notifications,
    unreadCount,
    hasMore,
    fetchNotifications,
    markAllRead,
    markAsRead,
    socket,
    disconnectSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Helper function to render notification body for browser notifications
const renderNotificationBody = (type) => {
  switch (type) {
    case "new_post":
      return "posted something new.";
    case "like_post":
      return "liked your post.";
    case "comment_post":
      return "commented on your post.";
    case "reply_comment":
      return "replied to your comment.";
    case "like_comment":
      return "liked your comment.";
    case "follow":
      return "started following you.";
    default:
      return "sent you a notification.";
  }
};
