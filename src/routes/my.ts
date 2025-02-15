import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { supabaseAuthMiddleware } from "../middleware/supabaseAuth";
import { z } from "zod";
import { SupabaseUser } from "../types";

const route = new OpenAPIHono();
route.use('/me', supabaseAuthMiddleware);
route.openapi(
    createRoute({
        method: 'get',
        path: '/me',
        tags: ['Auth'],
        summary: 'Protected Route',
        description: 'This route requires Supabase Authentication.',
        request: {
            headers: z.object({
                authorization: z.string().describe('Bearer token for authentication'),
            }),
        },
        responses: {
            200: {
                description: 'Authenticated User Information',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            user: z.object({
                                id: z.string(),
                                email: z.string().nullable(),
                            }),
                        }),
                    },
                },
            },
            401: {
                description: 'Unauthorized',
                content: {
                    'application/json': {
                        schema: z.object({
                            error: z.string(),
                        }),
                    },
                },
            },
        },
    }),
    async (c) => {
        const user = c.get('user') as SupabaseUser;
        console.log(user)
        return c.json({
            message: 'You are authenticated!',
            user: {
                sub: user.sub,
                email: user.email || null,
            },
        });
    }
);
export default route;