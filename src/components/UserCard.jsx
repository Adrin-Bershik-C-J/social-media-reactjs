import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

const UserCard = ({ user }) => {
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();
  const { conversations, setActiveConversation } = useChat();

  const isOwnProfile = loggedInUser?.id === user._id;

  const handleStartChat = () => {
    try {
      const currentUserId = loggedInUser._id || loggedInUser.id;
      const participants = [currentUserId, user._id].sort();
      
      // Check if conversation already exists
      const existingConv = conversations.find(conv => {
        const convParticipants = conv.participants.map(p => p._id).sort();
        return convParticipants[0] === participants[0] && convParticipants[1] === participants[1];
      });

      if (existingConv) {
        setActiveConversation(existingConv);
      } else {
        // Create a temporary conversation object
        const tempConv = {
          _id: `temp-${Date.now()}`,
          participants: [
            { 
              _id: currentUserId, 
              name: loggedInUser.name, 
              username: loggedInUser.username, 
              profilePicture: loggedInUser.profilePicture 
            },
            { 
              _id: user._id, 
              name: user.name, 
              username: user.username, 
              profilePicture: user.profilePicture 
            }
          ],
          lastMessage: null,
          unreadCount: 0,
          isTemp: true
        };
        setActiveConversation(tempConv);
      }
      
      navigate("/chat");
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {user.profilePicture ? (
        <img
          src={user.profilePicture}
          alt="User"
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
          {user.name?.charAt(0)?.toUpperCase() ||
            user.username?.charAt(0)?.toUpperCase()}
        </div>
      )}
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{user.name}</p>
        <p className="text-gray-600">@{user.username}</p>
      </div>
      {!isOwnProfile && (
        <button
          onClick={handleStartChat}
          className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer"
        >
          Message
        </button>
      )}
    </div>
  );
};

export default UserCard;
