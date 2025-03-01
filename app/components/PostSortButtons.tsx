import { Link } from "@remix-run/react";
import { useBlog } from "../context/BlogContext";

interface PostSortButtonsProps {
  baseUrl: string;
  className?: string;
}

export default function PostSortButtons({ baseUrl, className = "" }: PostSortButtonsProps) {
  const { sortOrder, getSortedUrl } = useBlog();
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Link
        to={getSortedUrl(baseUrl, "latest")}
        className={`px-3 py-2 rounded-md text-sm font-medium ${
          sortOrder !== "views" 
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        최신순
      </Link>
      <Link
        to={getSortedUrl(baseUrl, "views")}
        className={`px-3 py-2 rounded-md text-sm font-medium ${
          sortOrder === "views" 
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        조회수
      </Link>
    </div>
  );
}