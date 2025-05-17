import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';

export const supabaseAuthMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader) {
        return c.text('Missing Authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
        return c.text('Token not found', 401);
    }

    const jwtSecret = c.env.SUPABASE_JWT_SECRET; // Make sure this is set in your env
    if (!jwtSecret) {
        console.error('SUPABASE_JWT_SECRET is not defined');
        return c.text('Server configuration error', 500);
    }

    try {
        if (!c.env.SUPABASE_PROJECT_REF) {
            console.error('SUPABASE_PROJECT_REF is not defined');
            return c.json({ error: 'Server configuration error' }, 500);
        }

        const decoded = await jwtVerify(
            token,
            new TextEncoder().encode(jwtSecret),
            {
                issuer: `https://${c.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1`,
                audience: 'authenticated',
            }
        );

        console.log('JWT Payload:', decoded.payload);
        c.set('user', decoded.payload);
        await next();
    } catch (error) {
        console.error('JWT Verification Error:', error);
        if (error instanceof Error) {
            if (error.message.includes('JWTExpired')) {
                return c.json({ error: 'Token expired' }, 401);
            }
            if (error.message.includes('JWTInvalid')) {
                return c.json({ error: 'Invalid token' }, 401);
            }
        }
        return c.json({ error: 'Authentication failed' }, 401);
    }
};
