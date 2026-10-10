import cloudinary from "./Cloudinary.js"
import streamifier from "streamifier"
import multer from "multer";

export const cloudinaryUpload = (fileBuffer) => {
    if (!fileBuffer) return Promise.reject("No file buffer provided");

    const promise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "SoftRiseHubImages" },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
    return promise;
};
const storage = multer.memoryStorage();
export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: limit to 5MB
});