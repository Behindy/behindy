import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";

interface ImageUploaderProps {
  onImageInsert: (imageUrl: string) => void;
}

export default function ImageUploader({ onImageInsert }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 형식 검증
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("5MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // 이미지 업로드 API 호출
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "이미지 업로드에 실패했습니다.");
      }

      const data = await response.json();
      onImageInsert(data.imageUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative mb-2">
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          {isUploading ? (
            <div className="animate-spin mr-1">
              <Upload size={16} />
            </div>
          ) : (
            <Camera size={16} className="mr-1" />
          )}
          이미지 삽입
        </button>
        
        {error && (
          <div className="flex items-center text-sm text-red-600">
            <X size={14} className="mr-1" />
            {error}
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}