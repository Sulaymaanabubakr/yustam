// Cloudinary configuration from YUSTAM web app
export const CLOUDINARY_CLOUD_NAME = 'dpc16a0vd';
export const CLOUDINARY_UPLOAD_PRESET = 'yustam_unsigned';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

/**
 * Upload image to Cloudinary
 * @param {string} uri - Local file URI
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URL
 */
export const uploadImage = async (uri, options = {}) => {
  const { folder = 'yustam', onProgress } = options;

  try {
    const formData = new FormData();
    
    // Get file extension from URI
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    
    formData.append('file', {
      uri,
      type: `image/${fileType}`,
      name: `upload.${fileType}`,
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
};
