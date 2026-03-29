import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const UserCard = ({ user }) => {
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();

  const isOwnProfile = loggedInUser?.id === user._id;
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
          onClick={() => navigate("/chat")}
          className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-full text-sm font-medium transition-colors duration-200"
        >
          Message
        </button>
      )}
    </div>
  );
};

export default UserCard;
