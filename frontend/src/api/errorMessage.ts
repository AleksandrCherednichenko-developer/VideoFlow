import axios from "axios";

interface ApiErrorBody {
  error?: string;
  message?: string;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null;
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  if (error.response === undefined) {
    return "API is unavailable. Start the backend server and try again.";
  }

  const responseData = error.response.data;

  if (
    isApiErrorBody(responseData) &&
    typeof responseData.message === "string" &&
    responseData.message.length > 0
  ) {
    return responseData.message;
  }

  return fallbackMessage;
}
