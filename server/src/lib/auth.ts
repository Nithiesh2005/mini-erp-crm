import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, 10);

export const comparePassword = (
  plain: string,
  hash: string
): Promise<boolean> => bcrypt.compare(plain, hash);

export interface JwtPayload {
  id: string;
  role: Role;
  email: string;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_SECRET) as JwtPayload;
