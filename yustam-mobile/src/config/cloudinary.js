import { mediaAPI } from '../services/api';

// Cloudinary configuration from YUSTAM web app
export const CLOUDINARY_CLOUD_NAME = 'dpc16a0vd';
export const CLOUDINARY_UPLOAD_PRESET = 'yustam_unsigned';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const AUDIO_EXTENSIONS = ['m4a', 'aac', 'mp3', 'wav', 'ogg', 'oga', 'webm'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'avi'];

const inferExtension = (uri, fallback = 'jpg') => {
  if (!uri || typeof uri !== 'string') {
    return fallback;
  }
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (!match) {
    return fallback;
  }
  const extension = match[1].toLowerCase();
  if ([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS].includes(extension)) {
    return extension;
  }
  return fallback;
};

const inferResourceType = (extension, requestedType = 'auto') => {
  if (requestedType && requestedType !== 'auto') {
    return requestedType;
  }
  if (VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.includes(extension)) {
    return 'video';
  }
  return 'image';
};

const deriveMimeFromExtension = (extension, resourceType) => {
  if (AUDIO_EXTENSIONS.includes(extension)) {
    if (extension === 'm4a') {
      return 'audio/mp4';
    }
    if (extension === 'aac') {
      return 'audio/aac';
    }
    if (extension === 'mp3') {
      return 'audio/mpeg';
    }
    if (extension === 'wav') {
      return 'audio/wav';
    }
    if (extension === 'ogg' || extension === 'oga') {
      return 'audio/ogg';
    }
    if (extension === 'webm') {
      return 'audio/webm';
    }
    return 'audio/mpeg';
  }

  if (resourceType === 'video') {
    if (extension === 'mov') {
      return 'video/quicktime';
    }
    if (extension === 'm4v') {
      return 'video/x-m4v';
    }
    return 'video/mp4';
  }
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'webp') {
    return 'image/webp';
  }
  if (extension === 'heic') {
    return 'image/heic';
  }
  return 'image/jpeg';
};

const safeStringValue = (value) => (value === undefined || value === null ? '' : String(value));

export const uploadMedia = async (uri, options = {}) => {
  const {
    folder = 'yustam',
    resourceType: requestedType = 'auto',
    watermark = false,
    vendorName = '',
    format,
    fileName,
    mimeType,
  } = options;

  try {
    const extension = inferExtension(uri, requestedType === 'video' ? 'mp4' : 'jpg');
    const resourceType = inferResourceType(extension, requestedType);

    const signature = await mediaAPI.createUploadSignature({
      folder,
      resourceType,
    });

    const uploadUrl = signature.uploadUrl;
    const fields = signature.fields || {};
    const resolvedMime = mimeType || deriveMimeFromExtension(extension, resourceType);
    const resolvedFileName = fileName || `${signature.publicId || `asset_${Date.now()}`}.${extension}`;

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: resolvedMime,
      name: resolvedFileName,
    });

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, safeStringValue(value));
      }
    });

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();

    let finalUrl = data.secure_url;
    let finalPublicId = data.public_id;
    let finalResourceType = data.resource_type || resourceType;
    let watermarkResult = null;

    if (watermark) {
      try {
        watermarkResult = await mediaAPI.applyWatermark({
          publicId: finalPublicId,
          resourceType: finalResourceType === 'video' ? 'video' : 'image',
          vendorName,
          format,
        });
        if (watermarkResult?.secureUrl) {
          finalUrl = watermarkResult.secureUrl;
          finalPublicId = watermarkResult.publicId || finalPublicId;
          if (watermarkResult.resourceType) {
            finalResourceType = watermarkResult.resourceType;
          }
        }
      } catch (error) {
        console.warn('Watermark application failed, falling back to original asset.', error);
      }
    }

    return {
      url: finalUrl,
      publicId: finalPublicId,
      width: watermarkResult?.width ?? data.width ?? null,
      height: watermarkResult?.height ?? data.height ?? null,
      duration: watermarkResult?.duration ?? data.duration ?? null,
      format: data.format ?? format ?? null,
      resourceType: finalResourceType,
      originalUrl: data.secure_url,
      originalPublicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload media. Please try again.');
  }
};

export const uploadImage = (uri, options = {}) =>
  uploadMedia(uri, { ...options, resourceType: 'image' });

export const uploadVideo = (uri, options = {}) =>
  uploadMedia(uri, { ...options, resourceType: 'video' });

export const uploadAudio = (uri, options = {}) =>
  uploadMedia(uri, {
    ...options,
    resourceType: 'video',
    mimeType: options?.mimeType || 'audio/m4a',
  });

export const cloudinaryConfig = {
  cloudName: CLOUDINARY_CLOUD_NAME,
  uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  uploadUrl: CLOUDINARY_UPLOAD_URL,
};
