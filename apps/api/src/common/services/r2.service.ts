import { Injectable } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

@Injectable()
export class R2Service {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET || "";
    this.publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || "";

    if (!this.bucket) {
      throw new Error("R2_BUCKET is not configured.");
    }

    if (!this.publicBaseUrl) {
      throw new Error(
        "R2_PUBLIC_BASE_URL is not configured. Use your public/custom R2 domain.",
      );
    }

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(file: Express.Multer.File) {
    return this.uploadBuffer({
      buffer: file.buffer,
      fileName: file.originalname || "file",
      contentType: file.mimetype || "application/octet-stream",
    });
  }

  async uploadBuffer(input: {
    buffer: Buffer;
    fileName: string;
    contentType?: string;
  }) {
    const safeName = this.sanitizeFileName(input.fileName || "file");
    const key = `${randomUUID()}-${safeName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType || "application/octet-stream",
        ContentDisposition: `inline; filename="${safeName}"`,
      }),
    );

    const url = `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;

    return {
      key,
      url,
    };
  }

  extractKeyFromUrl(fileUrl: string) {
    const value = String(fileUrl || "").trim();
    if (!value) return "";

    if (this.publicBaseUrl && value.startsWith(this.publicBaseUrl)) {
      return value
        .replace(this.publicBaseUrl.replace(/\/$/, ""), "")
        .replace(/^\/+/, "");
    }

    const bucketSegment = `/${this.bucket}/`;
    const bucketIndex = value.indexOf(bucketSegment);
    if (bucketIndex !== -1) {
      return value.slice(bucketIndex + bucketSegment.length);
    }

    try {
      const url = new URL(value);
      return url.pathname.replace(/^\/+/, "");
    } catch {
      return "";
    }
  }

  async deleteFileByUrl(fileUrl: string) {
    const key = this.extractKeyFromUrl(fileUrl);

    if (!key) return;

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async downloadFileByUrl(fileUrl: string): Promise<Buffer> {
    const key = this.extractKeyFromUrl(fileUrl);

    if (!key) {
      throw new Error("Could not extract R2 key from file URL.");
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error("Downloaded file body is empty.");
    }

    return this.streamToBuffer(response.Body);
  }

  private sanitizeFileName(fileName: string) {
    const value = String(fileName || "file")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    return value || "file";
  }

  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}