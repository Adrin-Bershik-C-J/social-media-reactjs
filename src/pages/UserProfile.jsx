import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import config from "../config";
import PostCard from "../components/PostCard";

const URL = config.API_URL;

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: loggedInUser, isLoggedIn } = useAuth();
  const { sendMessage, conversations, setActiveConversation } = useChat();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedCaption, setEditedCaption] = useState("");

  const token = localStorage.getItem("token");
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);

        const res = await axios.get(`${URL}/api/users/user/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data.user) throw new Error("User not found in response");

        setUserData(res.data.user);
        setPosts(res.data.posts);
        setIsFollowing(res.data.isFollowing); // use backend value ✅
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchUserDetails();
  }, [username, loggedInUser?.id]);

  const handleFollowToggle = async () => {
    if (!loggedInUser || !userData) return;
    setFollowLoading(true);
    try {
      const res = await axios.post(
        `${URL}/api/users/follow/${userData._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { isFollowing: newStatus, followersCount } = res.data;

      setIsFollowing(newStatus);

      // 🔄 Update followers count locally
      setUserData((prev) => ({
        ...prev,
        followers: Array.from({ length: followersCount }),
      }));
    } catch (err) {
      console.error("Error following user:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      // Find or create a conversation without sending a message
      const currentUserId = loggedInUser._id || loggedInUser.id;
      const participants = [currentUserId, userData._id].sort();
      
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
              _id: userData._id, 
              name: userData.name, 
              username: userData.username, 
              profilePicture: userData.profilePicture 
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
      console.error("Error details:", error.message);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await axios.post(
        `${URL}/api/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likeCount: res.data.likeCount,
                isLiked: res.data.isLiked,
              }
            : post
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleEdit = async (postId, newCaption) => {
    try {
      await axios.put(
        `${URL}/api/posts/edit/${postId}`,
        { caption: newCaption },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, caption: newCaption } : p))
      );
    } catch (err) {
      console.error("Error editing post:", err);
    }
  };

  if (loading)
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-8 animate-pulse">
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-6">
          <div className="w-20 h-20 bg-gray-300 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="w-1/3 h-5 bg-gray-300 rounded" />
            <div className="w-1/4 h-4 bg-gray-200 rounded" />
            <div className="w-3/4 h-4 bg-gray-200 rounded" />
            <div className="flex gap-4 mt-2">
              <div className="w-20 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-4 bg-gray-200 rounded" />
            </div>
            <div className="w-24 h-8 bg-gray-300 rounded-full mt-3" />
          </div>
        </div>

        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-4 shadow animate-pulse"
            >
              <div className="w-1/2 h-4 bg-gray-300 rounded mb-2" />
              <div className="w-full h-40 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );

  if (!userData)
    return (
      <div className="min-h-screen flex items-center justify-center">
        User not found.
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-xl shadow-md p-6 flex gap-6">
        {userData.profilePicture ? (
          <img
            src={userData.profilePicture}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {userData.name?.charAt(0)?.toUpperCase() ||
              userData.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
          <p className="text-gray-600">@{userData.username}</p>
          {userData.bio && (
            <p className="whitespace-pre-line text-gray-700 leading-relaxed mb-4 max-w-2xl text-sm sm:text-base">
              {userData.bio}
            </p>
          )}

          <div className="mt-3 text-sm text-gray-500 flex gap-4">
            <span>{userData.followers.length} Followers</span>
            <span>{userData.following.length} Following</span>
          </div>

          {loggedInUser?.id !== userData._id && isLoggedIn && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-4 py-2 cursor-pointer rounded-full text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${
                isFollowing
                  ? "bg-gray-200 text-gray-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }
              disabled:opacity-60 disabled:cursor-wait`}
              >
                {followLoading ? (
                  <svg
                    className="animate-spin h-4 w-4 text-current mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                    />
                  </svg>
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </button>
              <button
                onClick={handleStartChat}
                className="px-4 py-2 cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors duration-200"
              >
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              isEditing={editingPostId === post._id}
              editedCaption={editedCaption}
              setEditedCaption={setEditedCaption}
              saveEdit={() => {
                handleEdit(post._id, editedCaption);
                setEditingPostId(null);
              }}
              cancelEdit={() => setEditingPostId(null)}
              onEdit={() => {
                setEditingPostId(post._id);
                setEditedCaption(post.caption);
              }}
              onLike={() => handleLike(post._id)}
              onDelete={() => handleDelete(post._id)}
              isOwner={loggedInUser?.id === userData._id}
            />
          ))
        ) : (
          <p className="text-center text-gray-500">No posts yet.</p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
