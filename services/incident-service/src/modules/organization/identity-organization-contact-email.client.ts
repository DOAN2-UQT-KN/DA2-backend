import axios, { AxiosInstance } from "axios";

function getClient(): AxiosInstance {
  const baseURL = process.env.IDENTITY_SERVICE_URL?.trim();
  const key = process.env.INTERNAL_IDENTITY_API_KEY?.trim();
  if (!baseURL || !key) {
    throw new Error(
      "IDENTITY_SERVICE_URL and INTERNAL_IDENTITY_API_KEY must be configured for organization contact email verification",
    );
  }
  return axios.create({
    baseURL: baseURL.replace(/\/$/, ""),
    timeout: 10_000,
    headers: { "x-internal-api-key": key },
  });
}

interface SuccessEnvelope<T> {
  success?: boolean;
  data?: T;
}

/** Response keys are snake_case (identity-service case transform on outbound JSON). */
type IssueTokenResponseData = { token?: string };

type VerifyTokenResponseData = {
  organization_id?: string;
  contact_email?: string;
};

export async function issueOrganizationContactEmailToken(params: {
  organizationId: string;
  contactEmail: string;
  ownerUserId: string;
}): Promise<string> {
  const client = getClient();
  const { data } = await client.post<SuccessEnvelope<IssueTokenResponseData>>(
    "/internal/v1/organization-contact-email/tokens",
    {
      organizationId: params.organizationId,
      contactEmail: params.contactEmail,
      ownerUserId: params.ownerUserId,
    },
  );
  const token = data?.data?.token?.trim();
  if (!data?.success || !token) {
    throw new Error("Identity service did not return a contact verification token");
  }
  return token;
}

export async function verifyAndConsumeOrganizationContactEmailToken(
  plainToken: string,
): Promise<{ organizationId: string; contactEmail: string }> {
  const client = getClient();
  const { data } = await client.post<SuccessEnvelope<VerifyTokenResponseData>>(
    "/internal/v1/organization-contact-email/tokens/verify",
    { token: plainToken },
  );
  const orgId = data?.data?.organization_id?.trim();
  const email = data?.data?.contact_email?.trim().toLowerCase();
  if (!data?.success || !orgId || !email) {
    throw new Error("Invalid or expired organization contact verification token");
  }
  return { organizationId: orgId, contactEmail: email };
}
