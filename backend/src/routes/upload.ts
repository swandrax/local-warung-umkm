import { Elysia, t } from 'elysia';
import { storageService } from '../services/storage';
import { authPlugin } from '../middleware/auth';

export const uploadRoutes = new Elysia({ prefix: '/upload' })
  .use(authPlugin)
  .post('/', async (ctx: any) => {
    const { user, body: { image }, set } = ctx;
    // Only logged in users can upload
    if (!user) {
      set.status = 401;
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to upload files' } };
    }

    // In a stricter app, only MITRA/ADMIN can upload images, but users might upload avatars.
    try {
      const url = await storageService.upload(image as Blob);
      return { success: true, data: { url } };
    } catch (e: any) {
      set.status = 400;
      return { success: false, error: { code: 'UPLOAD_FAILED', message: e.message } };
    }
  }, {
    body: t.Object({
      image: t.File()
    })
  })
  .post('/replace', async (ctx: any) => {
    const { user, body: { image, oldUrl }, set } = ctx;
    if (!user) {
      set.status = 401;
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to replace files' } };
    }

    try {
      const url = await storageService.replace(oldUrl || null, image as Blob);
      return { success: true, data: { url } };
    } catch (e: any) {
      set.status = 400;
      return { success: false, error: { code: 'REPLACE_FAILED', message: e.message } };
    }
  }, {
    body: t.Object({
      image: t.File(),
      oldUrl: t.Optional(t.String())
    })
  })
  .delete('/', async (ctx: any) => {
    const { user, body: { url }, set } = ctx;
    if (!user) {
      set.status = 401;
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to delete files' } };
    }

    const success = await storageService.delete(url);
    return { success, data: { deleted: success } };
  }, {
    body: t.Object({
      url: t.String()
    })
  });
