import React from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";

const ConversationList = ({ onSelectConversation }) => {
  const { conversations, activeConversation, onlineUsers } = useChat();
  const { user } = useAuth();

  const getOtherUser = (participants) => {
    return participants.find((p) => p._id !== user.id);
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg
          className="w-16 h-16 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Start chatting with someone!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {conversations.map((conv) => {
        const otherUser = getOtherUser(conv.participants);
        const isActive = activeConversation?._id === conv._id;
        const isOnline = onlineUsers.has(otherUser?._id);

        return (
          <div
            key={conv._id}
            onClick={() => onSelectConversation(conv)}
            className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-200 hover:bg-gray-50 transition ${
              isActive ? "bg-blue-50" : ""
            }`}
          >
            <div className="relative">
              {otherUser?.profilePicture ? (
                <img
                  src={otherUser.profilePicture}
                  alt={otherUser.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                  {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900 truncate">
                  {otherUser?.name || otherUser?.username}
                </p>
                {conv.lastMessage && (
                  <span className="text-xs text-gray-500">
                    {new Date(conv.lastMessage.createdAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 truncate">
                  {conv.lastMessage?.text || "No messages yet"}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
