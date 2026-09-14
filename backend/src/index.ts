import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { userRoutes } from './routes/users';
import { mitraRoutes } from './routes/mitra';
import { productRoutes } from './routes/products';
import { partnershipRoutes } from './routes/partnerships';
import { uploadRoutes } from './routes/upload';
import { publicRoutes } from './routes/public';
import { analyticsRoutes } from './routes/analytics';
import { adminRoutes } from './routes/admin';

const app = new Elysia()
  .use(staticPlugin({
    assets: 'uploads',
    prefix: '/uploads'
  }))
  .use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true,
  }))
  .group('/api', (app) =>
    app
      .use(authRoutes)
      .use(profileRoutes)
      .use(userRoutes)
      .use(mitraRoutes)
      .use(productRoutes)
      .use(partnershipRoutes)
      .use(uploadRoutes)
      .use(publicRoutes)
      .use(analyticsRoutes)
      .use(adminRoutes)
  )
  .onError(({ code, error, set }) => {
    console.error('Server error:', error);
    if (code === 'VALIDATION') {
      set.status = 400;
      return { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } };
    }
    set.status = 500;
    return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal server error occurred' } };
  })
  .listen(3000);

console.log(`Backend is running at ${app.server?.hostname}:${app.server?.port}`);
