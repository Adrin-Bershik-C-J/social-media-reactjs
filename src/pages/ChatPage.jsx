import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import axios from "axios";
import config from "../config";

const ChatPage = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { setActiveConversation, activeConversation, totalUnreadCount, sendMessage, conversations, fetchConversations } = useChat();
  const { user } = useAuth();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await axios.get(
        `${config.API_URL}/api/users/search?q=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const currentUserId = user._id || user.id;
      setSearchResults(res.data.filter(u => u._id !== currentUserId));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async (recipientId, recipientData) => {
    try {
      const currentUserId = user._id || user.id;
      const participants = [currentUserId, recipientId].sort();
      
      // Check if conversation already exists
      const existingConv = conversations.find(conv => {
        const convParticipants = conv.participants.map(p => p._id).sort();
        return convParticipants[0] === participants[0] && convParticipants[1] === participants[1];
      });

      if (existingConv) {
        // Existing conversation found - just open it
        setActiveConversation(existingConv);
      } else {
        // Create a temporary conversation object
        const tempConv = {
          _id: `temp-${Date.now()}`,
          participants: [
            { 
              _id: currentUserId, 
              name: user.name, 
              username: user.username, 
              profilePicture: user.profilePicture 
            },
            { 
              _id: recipientData._id, 
              name: recipientData.name, 
              username: recipientData.username, 
              profilePicture: recipientData.profilePicture 
            }
          ],
          lastMessage: null,
          unreadCount: 0,
          isTemp: true
        };
        setActiveConversation(tempConv);
      }
      
      setShowNewChatModal(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to start chat:", error);
      console.error("Error details:", error.message);
    }
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
        <button
          onClick={() => setShowNewChatModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Chat
        </button>
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

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">New Chat</h2>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-4 max-h-96 overflow-y-auto">
                {searching ? (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => handleStartChat(u._id, u)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                    >
                      {u.profilePicture ? (
                        <img src={u.profilePicture} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {u.name?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-sm text-gray-500">@{u.username}</p>
                      </div>
                    </div>
                  ))
                ) : searchQuery.trim() ? (
                  <p className="text-center text-gray-500 py-4">No users found</p>
                ) : (
                  <p className="text-center text-gray-500 py-4">Search for users to start chatting</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
