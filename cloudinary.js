const CLOUDINARY_CLOUD_NAME = 'dpc16a0vd';
const CLOUDINARY_UPLOAD_PRESET = 'yustam_unsigned';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

/**
 * Uploads a file to Cloudinary using unsigned uploads.
 * @param {File|Blob|string} file - The file (or data URL) to upload.
 * @param {Object} [options]
 * @param {string} [options.folder] - Optional folder to store the asset in Cloudinary.
 * @param {string[]} [options.tags] - Optional tags to attach to the asset.
 * @param {(progress:number)=>void} [options.onProgress] - Progress callback (0-1).
 * @returns {Promise<{url:string, publicId:string, bytes:number, width:number, height:number, format:string}>}
 */
export function uploadToCloudinary(file, options = {}) {
  const { folder, tags, onProgress } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            format: response.format,
          });
        } catch (parseError) {
          reject(new Error('Cloudinary response parsing failed.'));
        }
      } else {
        reject(new Error(`Cloudinary upload failed with status ${xhr.status}.`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Cloudinary upload encountered a network error.'));
    };

    if (typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (folder) {
      formData.append('folder', folder);
    }
    if (Array.isArray(tags) && tags.length) {
      formData.append('tags', tags.join(','));
    }
    formData.append('timestamp', Math.floor(Date.now() / 1000));

    xhr.send(formData);
  });
}

/**
 * Convenience wrapper that returns only the secure URL.
 * @param {File|Blob|string} file
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function uploadImage(file, options = {}) {
  const result = await uploadToCloudinary(file, options);
  return result.url;
}

export const cloudinaryConfig = {
  cloudName: CLOUDINARY_CLOUD_NAME,
  uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  uploadUrl: CLOUDINARY_UPLOAD_URL,
};
