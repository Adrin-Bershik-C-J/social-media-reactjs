// src/api/profile.js
import axios from "axios";
import config from "../config";
const URL = config.API_URL;

const API = axios.create({
  baseURL: `${URL}/api`,
});

export const fetchMyPosts = (token) =>
  API.get("/posts/", { headers: { Authorization: `Bearer ${token}` } });

export const fetchFollowers = (token, page = 1, limit = 10) =>
  API.get(`/users/followers?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchFollowing = (token, page = 1, limit = 10) =>
  API.get(`/users/following?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateProfile = (data, token) =>
  API.put("/users/update", data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const deletePost = (id, token) =>
  API.delete(`/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } });

export const editPost = (id, caption, token) =>
  API.put(
    `/posts/edit/${id}`,
    { caption },
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const toggleLike = (postId, token) =>
  API.post(
    `/posts/${postId}/like`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
