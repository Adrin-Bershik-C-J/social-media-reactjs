import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import UserCard from "../components/UserCard";
import {
  fetchMyPosts,
  fetchFollowers,
  fetchFollowing,
  updateProfile,
  deletePost,
  editPost,
  toggleLike,
} from "../api/profile";
import axios from "axios";
import config from "../config";
import Spinner from "../components/Spinner";
const URL = config.API_URL;

const Profile = () => {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const [myPosts, setMyPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [activeTab, setActiveTab] = useState("Posts");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Pagination state for posts
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditBio(user.bio || "");
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    try {
      const res = await updateProfile({ name: editName, bio: editBio }, token);
      localStorage.setItem("user", JSON.stringify(res.data));
      setEditingProfile(false);
      window.location.reload();
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handleProfilePicUpload = async (file) => {
    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const res = await axios.put(
        `${URL}/api/users/upload-profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await refreshUser(); // update context
    } catch (err) {
      console.error("Error uploading profile picture:", err);
    }
  };

  const loadMyPosts = async (page = 1, reset = false) => {
    if (loadingPosts) return;

    setLoadingPosts(true);
    try {
      const res = await axios.get(
        `${URL}/api/posts/?page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { posts, hasMore, totalPosts: total } = res.data;

      if (reset || page === 1) {
        setMyPosts(posts || res.data);
      } else {
        setMyPosts((prev) => [...prev, ...(posts || [])]);
      }

      setCurrentPage(page);
      setHasMorePosts(hasMore);
      setTotalPosts(total || posts?.length || 0);
    } catch (err) {
      console.error("Error loading posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadMorePosts = () => {
    if (hasMorePosts && !loadingPosts) {
      loadMyPosts(currentPage + 1, false);
    }
  };

  const loadFollowers = async () => {
    setLoadingFollowers(true);
    const res = await fetchFollowers(token);
    setFollowers(res.data);
    setLoadingFollowers(false);
  };

  const loadFollowing = async () => {
    setLoadingFollowing(true);
    const res = await fetchFollowing(token);
    setFollowing(res.data);
    setLoadingFollowing(false);
  };

  const handleDelete = async (id) => {
    await deletePost(id, token);
    loadMyPosts(1, true);
  };

  const handleEdit = async (id) => {
    await editPost(id, editedCaption, token);
    setEditingPostId(null);
    setEditedCaption("");
    loadMyPosts(1, true);
  };

  const handleLikeToggle = async (postId) => {
    try {
      const res = await toggleLike(postId, token);
      setMyPosts((prevPosts) =>
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
      console.error("Error toggling like:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMyPosts(1, true);
      loadFollowers();
      loadFollowing();
    }
  }, [isLoggedIn]);

  // Infinite scroll effect for Posts tab
  useEffect(() => {
    if (activeTab !== "Posts") return;

    const handleScroll = () => {
      if (loadingPosts || !hasMorePosts) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingPosts, hasMorePosts, currentPage, activeTab]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <p className="text-lg font-semibold text-gray-700">
            Please login to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Profile
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your account and posts
          </p>
        </div>

        <button
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
          className="px-4 py-2 cursor-pointer text-sm sm:text-base border border-red-300 text-red-700 bg-white hover:bg-red-50 font-medium rounded-lg flex items-center gap-2 transition-colors duration-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        {editingProfile ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleProfilePicUpload(e.target.files[0])}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition duration-150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>

            <div className="flex gap-4 mt-4">
              <button
                onClick={handleProfileUpdate}
                className="px-6 py-2.5 cursor-pointer bg-blue-600 text-white font-medium text-sm rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition duration-150"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="px-6 py-2.5 cursor-pointer bg-gray-100 text-gray-800 font-medium text-sm rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 transition duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 sm:gap-6 mb-6">
            {/* Left Side: Profile Picture + Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user.name?.charAt(0)?.toUpperCase() ||
                      user.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {user.name}
                  </h2>
                  <p className="text-gray-600 text-sm">@{user.username}</p>
                </div>
              </div>

              {user.bio && (
                <p className="whitespace-pre-line text-gray-700 leading-relaxed mb-4 max-w-2xl text-sm sm:text-base">
                  {user.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold text-xl text-gray-900">
                    {totalPosts}
                  </div>
                  <div className="text-gray-600">Posts</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-xl text-gray-900">
                    {followers.length}
                  </div>
                  <div className="text-gray-600">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-xl text-gray-900">
                    {following.length}
                  </div>
                  <div className="text-gray-600">Following</div>
                </div>
              </div>
            </div>

            {/* Right Side: Edit Button */}
            <button
              onClick={() => setEditingProfile(true)}
              className="inline-flex cursor-pointer items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm sm:text-base font-medium rounded-lg self-start sm:self-auto"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex">
            {["Posts", "Followers", "Following"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-center font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "Posts" && (
            <div className="space-y-4">
              {loadingPosts && myPosts.length === 0 ? (
                <Spinner />
              ) : myPosts.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg">No posts yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Share your first post to get started
                  </p>
                </div>
              ) : (
                <>
                  {myPosts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onLike={() => handleLikeToggle(post._id)}
                      onEdit={() => {
                        setEditingPostId(post._id);
                        setEditedCaption(post.caption);
                      }}
                      onDelete={() => handleDelete(post._id)}
                      isEditing={editingPostId === post._id}
                      editedCaption={editedCaption}
                      setEditedCaption={setEditedCaption}
                      saveEdit={() => handleEdit(post._id)}
                      cancelEdit={() => setEditingPostId(null)}
                    />
                  ))}

                  {/* Loading indicator for infinite scroll */}
                  {loadingPosts && myPosts.length > 0 && (
                    <div className="flex justify-center items-center py-8">
                      <svg
                        className="animate-spin h-8 w-8 text-blue-600"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* End of posts message */}
                  {!hasMorePosts && myPosts.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 font-medium">
                        You've reached the end! Showing all {myPosts.length} posts.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "Followers" && (
            <>
              {loadingFollowers ? (
                <Spinner />
              ) : followers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No followers yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {followers.map((f) => (
                    <UserCard key={f._id} user={f} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "Following" && (
            <>
              {loadingFollowing ? (
                <Spinner />
              ) : following.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No following users yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {following.map((f) => (
                    <UserCard key={f._id} user={f} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
