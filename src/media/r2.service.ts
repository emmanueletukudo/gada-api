import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class R2Service {
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.R2_BUCKET_NAME!;

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async getPresignedUploadUrl(contentType: string) {
    const extension = contentType.split("/")[1] || "jpeg";
    const fileKey = `uploads/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
    });

   
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
    });

    return {
      uploadUrl,
      fileKey,
      publicUrl: `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`,
    };
  }
}
