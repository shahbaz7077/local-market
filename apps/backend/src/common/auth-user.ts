import type { Request } from 'express';
import type { Role } from '../db/schema.js';

export interface AuthUser {
  id: string;
  role: Role;
}

export type AuthedRequest = Request & { user?: AuthUser };