import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { httpError } from '../../utils/httpError.js'

export async function register({ username, password }) {
    const existing = await prisma.user.findUnique({ where: {username} });
    if (existing) {
        throw httpError(409, 'USERNAME_TAKEN', 'Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { username, passwordHash},
    });

    return { id: user.id, username: user.username, role: user.role};
}

export async function login({ username, password}) {
    const user = await prisma.user.findUnique({ where: { username} });
    if (!user) {
        throw httpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        throw httpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const token = jwt.sign(
        { 
            sub: user.id,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '15m'
        }
    );

    return { token, user: {id: user.id, username: user.username, role: user.role} };
}