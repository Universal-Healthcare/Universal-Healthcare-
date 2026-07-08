import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "../config/env.js"
import { captureException } from "../observability/sentry.js"

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  // MinIO / local S3-compatible stores use path-style addressing and
  // often live behind a custom endpoint. Only apply when configured.
  ...(env.AWS_S3_ENDPOINT
    ? {
        endpoint: env.AWS_S3_ENDPOINT,
        forcePathStyle: true,
      }
    : {}),
})

export async function createAvatarUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    })

    return await getSignedUrl(s3, command, { expiresIn: 300 })
  } catch (err) {
    captureException(err, {
      where: "createAvatarUploadUrl",
      key,
      contentType,
      bucket: env.AWS_S3_BUCKET,
      endpoint: env.AWS_S3_ENDPOINT || "default",
    })
    throw err
  }
}
