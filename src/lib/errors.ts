import { ApiError } from './api'

/** Turn anything thrown into something worth showing a user. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.isOffline
      ? 'Could not reach the server. Check that the backend is running on port 8000.'
      : error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong.'
}
