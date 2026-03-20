import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { useChat } from "../contexts/ChatContext";
import { Bell, MessageCircle } from "lucide-react";
import config from "../config";
const URL = config.API_URL;

const Home = () => {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({}); // Store comments by postId
  const [newComment, setNewComment] = useState({}); // Store new comment text by postId
  const [replyText, setReplyText] = useState({}); // Store reply text by commentId
  const [showComments, setShowComments] = useState({}); // Toggle comments visibility
  const [showReplyForm, setShowReplyForm] = useState({}); // Toggle reply form visibility
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeImages, setActiveImages] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [commentLoading, setCommentLoading] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [likeLoading, setLikeLoading] = useState({});
  const [commentLikeLoading, setCommentLikeLoading] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Add these new state variables after your existing useState declarations
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const postsPerPage = 10;

  // Following state
  const [followingStatus, setFollowingStatus] = useState({}); // Track follow status by userId
  const [followingUsers, setFollowingUsers] = useState(new Set()); // Set of user IDs being followed

  const token = localStorage.getItem("token");

  const { unreadCount } = useNotifications();
  const { totalUnreadCount } = useChat();

  // Initialize following status from user data
  useEffect(() => {
    const fetchCurrentUserFollowings = async () => {
      try {
        const res = await axios.get(`${URL}/api/users/getHomeFollowers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const followingIds = res.data.following.map((u) => u._id);
        const statusMap = {};
        followingIds.forEach((id) => (statusMap[id] = true));

        setFollowingUsers(new Set(followingIds));
        setFollowingStatus(statusMap);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };

    if (isLoggedIn) fetchCurrentUserFollowings();
  }, [isLoggedIn]);

  // Add these functions before your existing handleCreatePost function
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Validate file types and limits
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return isImage || (isVideo && file.type === "video/mp4");
    });

    if (validFiles.length !== files.length) {
      alert(
        "Some files were skipped. Only JPEG, PNG, WebP images and MP4 videos are allowed."
      );
    }

    const images = validFiles.filter((f) => f.type.startsWith("image/"));
    const videos = validFiles.filter((f) => f.type.startsWith("video/"));

    if (images.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }
    if (videos.length > 1) {
      alert("Only one video allowed");
      return;
    }

    setSelectedFiles(validFiles);

    // Create previews
    const newPreviews = validFiles
      .map((file) => {
        try {
          if (file && typeof file === "object" && file.type) {
            return {
              file,
              url: (window.URL || window.webkitURL).createObjectURL(file),
              type: file.type.startsWith("image/") ? "image" : "video",
            };
          } else {
            console.warn("Skipping invalid file:", file);
            return null;
          }
        } catch (err) {
          console.error("Error creating preview for:", file, err);
          return null;
        }
      })
      .filter(Boolean); // Remove null entries
    // console.log("Valid files:", validFiles);
    // console.log("typeof first file:", typeof validFiles[0]);
    // console.log("Instanceof File?", validFiles[0] instanceof File);
    setPreviews(newPreviews);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    // Clean up object URL safely
    try {
      const revoke = (window.URL || window.webkitURL)?.revokeObjectURL;
      if (typeof revoke === "function") {
        revoke(previews[index].url);
      } else {
        console.warn("revokeObjectURL not supported.");
      }
    } catch (err) {
      console.error("Failed to revoke object URL:", err);
    }

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  // Fetch posts from feed with pagination
  const fetchFeedPosts = async (page = 1, reset = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `${URL}/api/posts/feed?page=${page}&limit=${postsPerPage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const {
        posts: newPosts,
        totalPages: total,
        currentPage: current,
        hasMore,
      } = res.data;

      if (reset || page === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setCurrentPage(current);
      setTotalPages(total);
      setHasMore(hasMore);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load more posts
  const loadMorePosts = () => {
    if (hasMore && !loading) {
      fetchFeedPosts(currentPage + 1, false);
    }
  };

  const handleEditComment = async (postId, commentId) => {
    if (!editedCommentText.trim()) return;

    try {
      await axios.put(
        `${URL}/api/comments/${commentId}`,
        { text: editedCommentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh comments
      fetchComments(postId);
      setEditingCommentId(null);
      setEditedCommentText("");
    } catch (err) {
      console.error("Error editing comment:", err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      await axios.delete(`${URL}/api/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh comments
      fetchComments(postId);
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async (targetUserId) => {
    setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      const res = await axios.post(
        `${URL}/api/users/follow/${targetUserId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update follow status
      setFollowingStatus((prev) => ({
        ...prev,
        [targetUserId]: res.data.isFollowing,
      }));

      setFollowingUsers((prev) => {
        const newSet = new Set(prev);
        if (res.data.isFollowing) {
          newSet.add(targetUserId);
        } else {
          newSet.delete(targetUserId);
        }
        return newSet;
      });

      // Update follow status in posts
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.user._id === targetUserId
            ? { ...post, isFollowing: res.data.isFollowing }
            : post
        )
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    try {
      setCommentLoading((prev) => ({ ...prev, [postId]: true }));
      const res = await axios.get(`${URL}/api/comments/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Create a new post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!caption.trim() && selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("caption", caption);

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      await axios.post(`${URL}/api/posts/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Reset form
      setCaption("");
      setSelectedFiles([]);
      setPreviews([]);

      // Clean up preview URLs
      previews.forEach((preview) => {
        if ((window.URL || window.webkitURL)?.revokeObjectURL) {
          (window.URL || window.webkitURL).revokeObjectURL(preview.url);
        } else {
          console.warn("revokeObjectURL not supported in this environment.");
        }
      });

      // Refresh the feed
      fetchFeedPosts(1, true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // auto-hide after 3s
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle like/unlike
  const handleLikeToggle = async (postId) => {
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));

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
      console.error("Error liking/unliking post:", err);
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Create a comment
  const handleCreateComment = async (postId, parentId = null) => {
    const commentText = parentId ? replyText[parentId] : newComment[postId];
    if (!commentText?.trim()) return;

    try {
      await axios.post(
        `${URL}/api/comments/${postId}`,
        { text: commentText, parent: parentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset the input
      if (parentId) {
        setReplyText((prev) => ({ ...prev, [parentId]: "" }));
        setShowReplyForm((prev) => ({ ...prev, [parentId]: false }));
      } else {
        setNewComment((prev) => ({ ...prev, [postId]: "" }));
      }

      // Refresh comments
      fetchComments(postId);
    } catch (err) {
      console.error("Error creating comment:", err);
    }
  };

  // Toggle comment like
  const handleCommentLike = async (commentId, postId) => {
    setCommentLikeLoading((prev) => ({ ...prev, [commentId]: true }));

    try {
      // Optimistic update
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map((comment) => {
          if (comment._id === commentId) {
            const isLiked = comment.likes.includes(user._id);
            return {
              ...comment,
              likes: isLiked
                ? comment.likes.filter((id) => id !== user._id)
                : [...comment.likes, user._id],
            };
          }
          return comment;
        }),
      }));

      await axios.post(
        `${URL}/api/comments/like/${commentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Error liking comment:", err);
    } finally {
      setCommentLikeLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  // Toggle comments visibility
  const toggleComments = (postId) => {
    setShowComments((prev) => {
      const newState = { ...prev, [postId]: !prev[postId] };
      // Fetch comments when showing them for the first time
      if (newState[postId] && !comments[postId]) {
        fetchComments(postId);
      }
      return newState;
    });
  };

  // Render nested comments recursively
  const renderComments = (postComments, postId, parentId = null, depth = 0) => {
    const filteredComments = postComments.filter(
      (comment) =>
        comment.parent?._id === parentId || (!comment.parent && !parentId)
    );

    return filteredComments.map((comment) => (
      <div
        key={comment._id}
        className={`${depth > 0 ? "ml-6 border-l-2 border-blue-100 pl-4" : ""}`}
      >
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
          <div className="flex items-start gap-3">
            {/* ✅ Profile Picture or Initials - Clickable */}
            <div
              onClick={() => navigate(`/user/${comment.user.username}`)}
              className="cursor-pointer"
            >
              {comment.user.profilePicture ? (
                <img
                  src={comment.user.profilePicture}
                  alt="User"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {comment.user.name?.charAt(0)?.toUpperCase() ||
                    comment.user.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* ✅ Name and Username - Clickable */}
              <div
                onClick={() => navigate(`/user/${comment.user.username}`)}
                className="flex items-center gap-2 mb-1 cursor-pointer"
              >
                <p className="font-semibold text-gray-900 text-sm">
                  {comment.user.name}
                </p>
                <p className="text-gray-500 text-sm">
                  @{comment.user.username}
                </p>
              </div>

              {editingCommentId === comment._id ? (
                <div className="flex flex-col gap-2 mb-2">
                  <input
                    type="text"
                    value={editedCommentText}
                    onChange={(e) => setEditedCommentText(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditComment(postId, comment._id)}
                      className="px-3 py-1 cursor-pointer bg-green-600 text-white text-sm rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditedCommentText("");
                      }}
                      className="px-3 py-1 cursor-pointer bg-gray-300 text-gray-800 text-sm rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 text-sm leading-relaxed mb-2">
                  {comment.text}
                </p>
              )}

              <p className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  // hour: "2-digit",
                  // minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
            {comment.user._id === user.id && (
              <>
                <button
                  onClick={() => {
                    setEditingCommentId(comment._id);
                    setEditedCommentText(comment.text);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs transition-colors duration-200"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(postId, comment._id)}
                  className="inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs transition-colors duration-200"
                >
                  🗑️ Delete
                </button>
              </>
            )}

            <button
              onClick={() => handleCommentLike(comment._id, postId)}
              disabled={commentLikeLoading[comment._id]}
              className={`inline-flex cursor-pointer items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors duration-200 ${
                comment.likes.includes(user._id)
                  ? "text-red-600 bg-red-50 hover:bg-red-100"
                  : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-wait`}
            >
              {commentLikeLoading[comment._id] ? (
                <svg
                  className="animate-spin w-3 h-3 text-current"
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
              ) : (
                <svg
                  className="w-3 h-3"
                  fill={
                    comment.likes.includes(user._id) ? "currentColor" : "none"
                  }
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              )}
              {comment.likes.length}
            </button>

            <button
              onClick={() =>
                setShowReplyForm((prev) => ({
                  ...prev,
                  [comment._id]: !prev[comment._id],
                }))
              }
              className="inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs transition-colors duration-200"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Reply
            </button>
          </div>

          {/* Reply Form */}
          {showReplyForm[comment._id] && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyText[comment._id] || ""}
                  onChange={(e) =>
                    setReplyText((prev) => ({
                      ...prev,
                      [comment._id]: e.target.value,
                    }))
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  onClick={() => handleCreateComment(postId, comment._id)}
                  className="inline-flex cursor-pointer items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Render nested replies */}
        {renderComments(postComments, postId, comment._id, depth + 1)}
      </div>
    ));
  };

  useEffect(() => {
    if (isLoggedIn) fetchFeedPosts(1, true);
  }, [isLoggedIn]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, currentPage]);

  if (!isLoggedIn)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <p className="text-xl text-gray-700 font-medium">
            Please login to continue
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {showSuccess && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300">
          Post uploaded successfully!
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Title on the left */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Home Feed
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Stay connected with your network
            </p>
          </div>

          {/* Right side: Chat + Bell + Profile */}
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <Link to="/chat" className="relative">
              <MessageCircle className="w-6 h-6 text-gray-700" />
              {totalUnreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs
                         font-semibold w-5 h-5 flex items-center justify-center
                         rounded-full"
                >
                  {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                </span>
              )}
            </Link>

            <Link to="/notifications" className="relative">
              <Bell className="w-6 h-6 text-gray-700" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-red-600 text-white text-xs
                         font-semibold w-5 h-5 flex items-center justify-center
                         rounded-full"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => navigate("/profile")}
              className="inline-flex items-center cursor-pointer px-4 py-2 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </button>
          </div>
        </div>

        {/* Create Post Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="flex items-start gap-4">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="User"
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() ||
                    user.username?.charAt(0)?.toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <textarea
                  rows="4"
                  placeholder="What's on your mind?"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500"
                />
              </div>
            </div>

            {/* File Input */}
            <div className="flex items-center gap-4">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg cursor-pointer transition-colors duration-200"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Add Media
              </label>
              <span className="text-sm text-gray-500">
                Up to 5 images or 1 video (JPEG, PNG, WebP, MP4)
              </span>
            </div>

            {/* File Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {preview.type === "image" ? (
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={preview.url}
                        className="w-full h-32 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center sm:justify-end mt-4">
              <button
                type="submit"
                disabled={
                  (!caption.trim() && selectedFiles.length === 0) || isUploading
                }
                className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Share Post
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {loading && posts.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <svg
                className="animate-spin h-10 w-10 text-blue-600"
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
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                {/* Post Header */}
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  {/* ✅ Wrap profile image/avatar in a clickable div */}
                  <div
                    onClick={() => navigate(`/user/${post.user.username}`)}
                    className="cursor-pointer"
                  >
                    {post.user.profilePicture ? (
                      <img
                        src={post.user.profilePicture}
                        alt="User"
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold flex-shrink-0">
                        {post.user.name?.charAt(0)?.toUpperCase() ||
                          post.user.username?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* User Info and Follow Button Container */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        {/* User Names */}
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <div
                            onClick={() =>
                              navigate(`/user/${post.user.username}`)
                            }
                            className="cursor-pointer"
                          >
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {post.user.name}
                            </h3>
                            <span className="text-gray-500 text-xs sm:text-sm truncate">
                              @{post.user.username}
                            </span>
                          </div>
                        </div>

                        {/* Date - Hidden on mobile when follow button is present */}
                        <p
                          className={`text-xs sm:text-sm text-gray-500 ${
                            post.user._id !== user._id ? "hidden sm:block" : ""
                          }`}
                        >
                          {new Date(post.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              // hour: "2-digit",
                              // minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>

                      {/* Follow/Unfollow Button */}
                      {post.user._id !== user._id && (
                        <button
                          onClick={() => handleFollowToggle(post.user._id)}
                          disabled={followLoading[post.user._id]}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full cursor-pointer text-xs font-medium flex items-center gap-1 sm:gap-2 flex-shrink-0 whitespace-nowrap
            ${
              followingStatus[post.user._id]
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } disabled:opacity-60 disabled:cursor-wait`}
                        >
                          {followLoading[post.user._id] ? (
                            <svg
                              className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-current"
                              viewBox="0 0 24 24"
                              fill="none"
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
                          ) : followingStatus[post.user._id] ? (
                            <>
                              <span className="text-xs">✔️</span>
                              <span className="hidden sm:inline">
                                Following
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs">➕</span>
                              <span className="hidden sm:inline">Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Date - Shown on mobile when follow button is present */}
                    {post.user._id !== user._id && (
                      <p className="text-xs text-gray-500 sm:hidden">
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          // hour: "2-digit",
                          // minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="mb-6">
                  <p className="text-gray-900 text-lg leading-relaxed">
                    {post.caption}
                  </p>

                  {/* Render Images if present */}
                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {post.images.map((imgUrl, idx) => (
                        <img
                          key={idx}
                          src={imgUrl}
                          alt={`Post image ${idx + 1}`}
                          onClick={() => {
                            setActiveImages(post.images);
                            setActiveImageIndex(idx);
                            setShowImageModal(true);
                          }}
                          className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-80 transition"
                        />
                      ))}
                    </div>
                  )}

                  {/* Render Video if present */}
                  {post.video && (
                    <video
                      controls
                      src={post.video}
                      className="w-full rounded-lg max-h-[400px] object-contain border border-gray-300"
                    />
                  )}
                </div>

                {/* Post Actions */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 pb-4 border-b border-gray-200">
                  <button
                    onClick={() => handleLikeToggle(post._id)}
                    disabled={likeLoading[post._id]}
                    className={`inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm sm:text-base
    ${
      post.isLiked
        ? "text-red-600 bg-red-50 hover:bg-red-100"
        : "text-gray-600 bg-gray-100 hover:bg-gray-200"
    } disabled:opacity-60 disabled:cursor-wait`}
                  >
                    {likeLoading[post._id] ? (
                      <svg
                        className="animate-spin w-4 h-4 text-current"
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
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill={post.isLiked ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    )}
                    {post.likeCount} {post.likeCount === 1 ? "Like" : "Likes"}
                  </button>

                  <button
                    onClick={() => toggleComments(post._id)}
                    className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm sm:text-base font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-5 h-5"
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
                    {showComments[post._id] ? "Hide Comments" : "Show Comments"}
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post._id] && (
                  <div className="mt-6 space-y-4">
                    {/* Add Comment Form */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt="User"
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() ||
                            user.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}

                      <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newComment[post._id] || ""}
                          onChange={(e) =>
                            setNewComment((prev) => ({
                              ...prev,
                              [post._id]: e.target.value,
                            }))
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        />
                        <button
                          onClick={() => handleCreateComment(post._id)}
                          disabled={!newComment[post._id]?.trim()}
                          className="inline-flex cursor-pointer items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                          Comment
                        </button>
                      </div>
                    </div>

                    {/* Display Comments */}
                    <div className="space-y-3">
                      {commentLoading[post._id] ? (
                        <div className="flex justify-center py-6">
                          <svg
                            className="animate-spin h-6 w-6 text-blue-600"
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
                        </div>
                      ) : comments[post._id] &&
                        comments[post._id].length > 0 ? (
                        renderComments(comments[post._id], post._id)
                      ) : (
                        <div className="text-center py-8">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto mb-3"
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
                          <p className="text-gray-500 font-medium">
                            No comments yet
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Be the first to share your thoughts!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading indicator for infinite scroll */}
          {loading && posts.length > 0 && (
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

          {/* End of feed message */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-medium">
                You've reached the end! Showing all {posts.length} posts.
              </p>
            </div>
          )}
        </div>
      </div>
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <img
              src={activeImages[activeImageIndex]}
              alt="Full view"
              className="max-h-[80vh] w-auto rounded-xl"
            />
            <div className="flex justify-between mt-4 w-full px-6">
              <button
                disabled={activeImageIndex === 0}
                onClick={() => setActiveImageIndex((i) => i - 1)}
                className="text-white text-2xl disabled:opacity-30"
              >
                ⬅
              </button>
              <button
                disabled={activeImageIndex === activeImages.length - 1}
                onClick={() => setActiveImageIndex((i) => i + 1)}
                className="text-white text-2xl disabled:opacity-30"
              >
                ➡
              </button>
            </div>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-6 text-white text-xl"
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
