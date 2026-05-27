export function getConvexErrorMessage(error: unknown, fallbackMessage = 'An error occurred. Please try again.') {
  if (!(error instanceof Error)) {
    return "Something went wrong";
  }

  const match = error.message.match(/Uncaught Error: (.*)/);

  return match?.[1] || error.message || fallbackMessage;
}
