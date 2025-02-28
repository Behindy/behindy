// app/utils/s3.server.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// 버킷 이름 가져오기
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

/**
 * 이미지를 WebP로 변환하고 S3에 업로드
 */
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
    // 기본 옵션 설정
    const quality = options.quality || 80;
    const maxWidth = options.maxWidth || 1200;
    const maxHeight = options.maxHeight || 1200;
    
    // 파일명 생성
    const uniqueId = `${userId.substring(0, 8)}_${uuidv4().substring(0, 8)}`;
    const fileName = `${uniqueId}.webp`;
    const filePath = `uploads/${fileName}`;
    
    // 이미지 최적화 및 WebP 변환
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality })
      .toBuffer();
    
    // 이미지 메타데이터 추출
    const metadata = await sharp(optimizedImageBuffer).metadata();
    
    // S3에 업로드
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: optimizedImageBuffer,
        ContentType: "image/webp",
        CacheControl: "max-age=31536000" // 1년간 캐싱
      })
    );
    
    // 업로드된, 접근 가능한 URL 생성
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

/**
 * S3에서 이미지 삭제
 */
export async function deleteImageFromS3(imageUrl: string) {
  try {
    // URL에서 키 추출
    const urlParts = imageUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2) {
      throw new Error("유효하지 않은 S3 URL입니다.");
    }
    
    const key = urlParts[1];
    
    // S3에서 삭제 - 올바른 Command 객체 사용
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