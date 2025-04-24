import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/socket';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): Promise<UserPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as UserPayload);
      }
    });
  });
} 