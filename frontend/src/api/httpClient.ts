import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { clearSessionSnapshot, getAccessToken, setSessionSnapshot } from "./session";
import type { AuthSessionResponse } from "./authApi";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken !== null) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      originalRequest === undefined ||
      originalRequest._retry === true ||
      originalRequest.url?.includes("/auth/refresh") === true
    ) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const response = await axios.post<AuthSessionResponse>(
        `${API_BASE_URL}/auth/refresh`,
        undefined,
        {
          withCredentials: true,
        },
      );
      setSessionSnapshot(response.data.accessToken, response.data.user);
      const accessToken = getAccessToken();

      if (accessToken !== null) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      return httpClient(originalRequest);
    } catch (refreshError) {
      clearSessionSnapshot();
      throw refreshError;
    }
  },
);
