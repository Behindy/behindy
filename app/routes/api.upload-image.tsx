// app/routes/api/upload-image.tsx
import { ActionFunctionArgs, json } from "@remix-run/node";
import { requireAuth } from "../utils/auth.server";
import { uploadImageToS3 } from "../utils/s3.server";

export async function action({ request }: ActionFunctionArgs) {
  // 사용자 인증 확인
  const user = await requireAuth(request);
  
  // 요청 검증
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  try {
    // 폼 데이터 파싱
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }

    // 파일 유형 확인
    if (!imageFile.type.startsWith("image/")) {
      return json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    // 파일 크기 제한 (5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return json({ error: "5MB 이하의 이미지만 업로드할 수 있습니다." }, { status: 400 });
    }

    // 이미지 파일을 버퍼로 변환
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // S3에 업로드
    const result = await uploadImageToS3(
      buffer,
      imageFile.name,
      user.id,
      {
        quality: 80,
        maxWidth: 1200,
        maxHeight: 1200
      }
    );

    return json(result);
  } catch (error) {
    console.error("이미지 업로드 오류:", error);
    return json(
      { error: "이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}