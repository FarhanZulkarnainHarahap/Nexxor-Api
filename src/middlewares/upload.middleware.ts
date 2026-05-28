import multer from "multer";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new Error("Only jpeg, jpg, png, and webp images are allowed"));
      return;
    }

    callback(null, true);
  },
});
