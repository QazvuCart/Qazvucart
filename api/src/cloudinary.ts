import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { HttpError } from './http-error.js';

export const ALLOWED_FORMATS = ['jpg', 'png', 'webp'];
export const MAX_BYTES = 8 * 1024 * 1024;
export const imageFolder = env.CLOUDINARY_FOLDER;

// Uploads are UNSIGNED: the browser posts straight to Cloudinary with an unsigned upload preset.
// The API key + secret are optional and only used for the extra safety net below (checking what was
// really uploaded, and deleting removed images). Without them the API trusts the browser's upload response.
const hasCloud = !!env.CLOUDINARY_CLOUD_NAME;
const hasAdminApi = hasCloud && !!(env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
if (hasAdminApi) cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });

/** What the admin browser needs to upload directly to Cloudinary with an unsigned preset. */
export function uploadConfig() {
  if (!hasCloud || !env.CLOUDINARY_UPLOAD_PRESET) throw new HttpError(503, 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.');
  return { cloudName: env.CLOUDINARY_CLOUD_NAME!, uploadPreset: env.CLOUDINARY_UPLOAD_PRESET, folder: imageFolder, allowed_formats: ALLOWED_FORMATS.join(','), maxBytes: MAX_BYTES };
}

export interface Asset { secureUrl: string; width: number; height: number; format: string }
/** The browser's Cloudinary upload response. Only trusted (after strict checks) when the Admin API is not configured. */
export interface AssetHint { secureUrl: string; width: number; height: number; format: string }

function checkHint(publicId: string, hint?: AssetHint): Asset {
  const okUrl = hint && hint.secureUrl.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`) && hint.secureUrl.includes(publicId);
  if (!hint || !okUrl || !ALLOWED_FORMATS.includes(hint.format)) throw new HttpError(400, 'Invalid image');
  return { secureUrl: hint.secureUrl, width: hint.width, height: hint.height, format: hint.format };
}

/**
 * With the Admin API configured, ask Cloudinary what was really uploaded. If that lookup fails (wrong key/secret for
 * this cloud, delivery type, timing), the real reason is logged and the browser's upload response is used instead
 * after strict checks, so a working unsigned upload is never blocked by the optional safety net.
 */
export async function verifyAsset(publicId: string, hint?: AssetHint): Promise<Asset> {
  if (!hasCloud) throw new HttpError(503, 'Cloudinary is not configured.');
  if (!publicId.startsWith(imageFolder + '/')) throw new HttpError(400, 'Invalid image');
  if (!hasAdminApi) return checkHint(publicId, hint);
  let r;
  try { r = await cloudinary.api.resource(publicId, { resource_type: 'image' }); }
  catch (e) {
    const err = e as { error?: { message?: string; http_code?: number }; message?: string };
    console.error(`Cloudinary Admin API lookup failed for "${publicId}" (${err.error?.http_code ?? '?'}): ${err.error?.message ?? err.message ?? 'unknown'}. ` +
      'Check CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET belong to the same account. Using the browser upload response instead.');
    return checkHint(publicId, hint);
  }
  if (!ALLOWED_FORMATS.includes(r.format) || r.bytes > MAX_BYTES) {
    await cloudinary.uploader.destroy(publicId).catch(() => undefined);
    throw new HttpError(400, 'Image must be JPG, PNG or WebP and at most 8 MB');
  }
  return { secureUrl: r.secure_url, width: r.width, height: r.height, format: r.format };
}

export async function destroyAssets(publicIds: string[]) {
  if (!hasAdminApi) return; // unsigned uploads cannot be deleted from the browser or without the API secret
  for (const id of publicIds) {
    try { await cloudinary.uploader.destroy(id, { resource_type: 'image', invalidate: true }); }
    catch (e) { console.error('Cloudinary cleanup failed:', e instanceof Error ? e.message : 'unknown'); }
  }
}
