import { Router } from 'express';
import { postRegister, postLogin } from './auth.controller.js';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a dashboard user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Username already exists }
 *       422: { description: Validation error }
 */
router.post('/register', postRegister);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Invalid credentials }
 */
router.post('/login', postLogin);

export default router;
