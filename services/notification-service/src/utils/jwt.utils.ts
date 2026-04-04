import jwt, { Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "fallback-secret-key";

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
}

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
  return decoded;
};
