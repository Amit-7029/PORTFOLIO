const { v2: cloudinary } = require("cloudinary");

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return {
    configured: Boolean(cloudName && apiKey && apiSecret),
    cloudName,
    apiKey,
    apiSecret,
  };
}

function getCloudinary() {
  const config = getCloudinaryConfig();
  if (!config.configured) return null;

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  return cloudinary;
}

function uploadBuffer(file, folder = "portfolio-media") {
  const client = getCloudinary();
  if (!client) {
    throw new Error("Cloudinary is not configured");
  }

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    stream.end(file.buffer);
  });
}

async function destroyAsset(publicId) {
  const client = getCloudinary();
  if (!client || !publicId) return;
  await client.uploader.destroy(publicId, { resource_type: "image" });
}

module.exports = {
  getCloudinaryConfig,
  uploadBuffer,
  destroyAsset,
};
