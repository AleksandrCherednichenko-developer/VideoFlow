import { httpClient } from "./httpClient";

export interface AuthUser {
  id: string;
  email: string;
  timezone: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  timezone: string;
}

export async function login(request: LoginRequest): Promise<AuthSessionResponse> {
  const response = await httpClient.post<AuthSessionResponse>("/auth/login", request);
  return response.data;
}

export async function register(
  request: RegisterRequest,
): Promise<AuthSessionResponse> {
  const response = await httpClient.post<AuthSessionResponse>(
    "/auth/register",
    request,
  );
  return response.data;
}

export async function refreshSession(): Promise<AuthSessionResponse> {
  const response = await httpClient.post<AuthSessionResponse>("/auth/refresh");
  return response.data;
}

export async function logout(): Promise<void> {
  await httpClient.post("/auth/logout");
}
