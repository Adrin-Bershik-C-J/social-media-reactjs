import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChat } from "../contexts/ChatContext";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";

const ChatPage = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { setActiveConversation, activeConversation, totalUnreadCount } = useChat();

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/home")}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          {totalUnreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-1">
              {totalUnreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left panel - Conversations (hidden on mobile when chat is active) */}
        <div className={`w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 overflow-hidden ${
          activeConversation ? "hidden md:block" : "block"
        }`}>
          <ConversationList onSelectConversation={handleSelectConversation} />
        </div>

        {/* Right panel - Chat window (full width on mobile when active) */}
        <div className={`w-full md:w-2/3 lg:w-3/4 bg-gray-50 ${
          activeConversation ? "block" : "hidden md:block"
        }`}>
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
