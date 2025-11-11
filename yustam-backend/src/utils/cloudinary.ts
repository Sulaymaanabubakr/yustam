import streamifier from 'streamifier';
import { cloudinary } from '../config/cloudinary';

export const uploadBufferToCloudinary = async (buffer: Buffer, folder: string) => {
  return new Promise<{ url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error || !result) {
          return reject(error);
        }
        return resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};