import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { HttpError } from './http-error.js';

export const ALLOWED_FORMATS = ['jpg', 'png', 'webp'];
export const MAX_BYTES = 8 * 1024 * 1024;
export const imageFolder = env.CLOUDINARY_FOLDER;

const ready = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
if (ready) cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });

const need = () => { if (!ready) throw new HttpError(503, 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'); };

/** Server-signed upload: the browser uploads straight to Cloudinary, but only with a signature only a logged-in admin can get. */
export function signUpload() {
  need();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { allowed_formats: ALLOWED_FORMATS.join(','), folder: imageFolder, timestamp };
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!, apiKey: env.CLOUDINARY_API_KEY!, ...params,
    signature: cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!),
    maxBytes: MAX_BYTES,
  };
}

export interface Asset { secureUrl: string; width: number; height: number; format: string }

/** Never trust image metadata from the browser: ask Cloudinary what was really uploaded. */
export async function verifyAsset(publicId: string): Promise<Asset> {
  need();
  if (!publicId.startsWith(imageFolder + '/')) throw new HttpError(400, 'Invalid image');
  let r;
  try { r = await cloudinary.api.resource(publicId, { resource_type: 'image' }); }
  catch { throw new HttpError(400, 'Uploaded image was not found'); }
  if (!ALLOWED_FORMATS.includes(r.format) || r.bytes > MAX_BYTES) {
    await cloudinary.uploader.destroy(publicId).catch(() => undefined);
    throw new HttpError(400, 'Image must be JPG, PNG or WebP and at most 8 MB');
  }
  return { secureUrl: r.secure_url, width: r.width, height: r.height, format: r.format };
}

export async function destroyAssets(publicIds: string[]) {
  if (!ready) return;
  for (const id of publicIds) {
    try { await cloudinary.uploader.destroy(id, { resource_type: 'image', invalidate: true }); }
    catch (e) { console.error('Cloudinary cleanup failed:', e instanceof Error ? e.message : 'unknown'); }
  }
}
