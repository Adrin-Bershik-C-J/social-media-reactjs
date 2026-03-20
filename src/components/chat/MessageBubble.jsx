import React from "react";

const MessageBubble = ({ message, isOwn }) => {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className="flex items-end gap-2 max-w-[70%]">
        {!isOwn && message.sender?.profilePicture && (
          <img
            src={message.sender.profilePicture}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        {!isOwn && !message.sender?.profilePicture && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {message.sender?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-gray-200 text-gray-900 rounded-bl-sm"
          }`}
        >
          <p className="text-sm break-words">{message.text}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
              {new Date(message.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isOwn && (
              <span className="text-xs text-blue-100">
                {message.read ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
