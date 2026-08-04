import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const exceptionFilter = (error: Error, ctx: Context) => {
    if (error instanceof HTTPException) {
        return ctx.json({ status: error.status, message: error.message }, error.status);
    }

    console.error(error);
    return ctx.json({ status: 500, message: 'Internal server error' }, 500);
};
