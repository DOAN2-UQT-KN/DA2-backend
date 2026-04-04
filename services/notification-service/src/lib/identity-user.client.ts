type IdentitySuccessEnvelope = {
  success?: boolean;
  data?: { email?: string };
};

/**
 * Resolves the user's email from identity-service (same user id / JWT subject).
 */
export async function fetchUserEmailById(userId: string): Promise<string> {
  const base = process.env.IDENTITY_SERVICE_URL?.trim();
  const apiKey = process.env.INTERNAL_IDENTITY_API_KEY?.trim();

  if (!base) {
    throw new Error("IDENTITY_SERVICE_URL is not configured");
  }
  if (!apiKey) {
    throw new Error("INTERNAL_IDENTITY_API_KEY is not configured");
  }

  const url = `${base.replace(/\/$/, "")}/internal/v1/users/${encodeURIComponent(userId)}/email`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "x-internal-api-key": apiKey },
  });

  const json = (await response.json()) as IdentitySuccessEnvelope;
  const email = json.data?.email?.trim();

  if (!response.ok || !email) {
    throw new Error(
      response.status === 404
        ? "User not found or has no email"
        : `Failed to resolve user email (${response.status})`,
    );
  }

  return email;
}
