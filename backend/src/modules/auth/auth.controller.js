import { register, login } from './auth.service.js';
import { httpError } from '../../utils/httpError.js';

export async function postRegister(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        throw httpError(422, 'VALIDATION_ERROR', 'username and password are required');
    }

    const user = await register({ username, password})
    res.status(201).json({data: user, request_id: req.id})
}

export async function postLogin(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        throw httpError(422, 'VALIDATION_ERROR', 'username and password are required');
    }

    const result = await login({ username, password });
    res.status(200).json({data: result, request_id: req.id});
}