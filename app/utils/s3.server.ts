import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

export async function uploadImageToS3(
  imageBuffer: Buffer, 
  originalFileName: string,
  userId: string,
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
) {
  try {
    const quality = options.quality || 80;
    const maxWidth = options.maxWidth || 1200;
    const maxHeight = options.maxHeight || 1200;
    
    const uniqueId = `${userId.substring(0, 8)}_${uuidv4().substring(0, 8)}`;
    const fileName = `${uniqueId}.webp`;
    const filePath = `uploads/${fileName}`;
    
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality })
      .toBuffer();
    
    const metadata = await sharp(optimizedImageBuffer).metadata();
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: optimizedImageBuffer,
        ContentType: "image/webp",
        CacheControl: "max-age=31536000"
      })
    );
    
    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
    
    return {
      imageUrl,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: 'webp',
        size: `${Math.round(optimizedImageBuffer.length / 1024)}KB`
      }
    };
  } catch (error) {
    console.error("S3 업로드 오류:", error);
    throw error;
  }
}

export async function deleteImageFromS3(imageUrl: string) {
  try {
    const urlParts = imageUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2) {
      throw new Error("유효하지 않은 S3 URL입니다.");
    }
    
    const key = urlParts[1];
    
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      })
    );
    
    return true;
  } catch (error) {
    console.error("S3 삭제 오류:", error);
    throw error;
  }
}