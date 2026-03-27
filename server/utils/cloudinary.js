const { v2: cloudinary } = require("cloudinary");
const CMS_PUBLIC_ID = "portfolio-cms/content";

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

async function readJsonAsset(publicId = CMS_PUBLIC_ID) {
  const client = getCloudinary();
  if (!client) return null;

  try {
    const resource = await client.api.resource(publicId, { resource_type: "raw" });
    const response = await fetch(resource.secure_url);
    if (!response.ok) {
      throw new Error(`Unable to fetch Cloudinary asset: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (error?.http_code === 404 || String(error?.message || "").includes("not found")) {
      return null;
    }
    throw error;
  }
}

function uploadJsonAsset(data, publicId = CMS_PUBLIC_ID) {
  const client = getCloudinary();
  if (!client) {
    throw new Error("Cloudinary is not configured");
  }

  const buffer = Buffer.from(JSON.stringify(data, null, 2), "utf8");

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: "raw",
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

    stream.end(buffer);
  });
}

async function destroyAsset(publicId) {
  const client = getCloudinary();
  if (!client || !publicId) return;
  await client.uploader.destroy(publicId, { resource_type: "image" });
}

module.exports = {
  CMS_PUBLIC_ID,
  getCloudinaryConfig,
  uploadBuffer,
  readJsonAsset,
  uploadJsonAsset,
  destroyAsset,
};
