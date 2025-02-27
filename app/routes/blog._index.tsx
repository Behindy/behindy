import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "../utils/db.server";
import { formatDate } from "../utils/format";

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  const posts = await db.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      author: {
        select: {
          name: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
    },
  });

  const count = await db.post.count({
    where: { published: true },
  });

  return json({
    posts,
    pagination: {
      page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
  });
}

export default function BlogIndex() {
  const { posts, pagination } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="grid gap-8">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900">아직 작성된 글이 없습니다</h2>
            <p className="mt-1 text-gray-500">새로운 글을 작성해 보세요!</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="border-b pb-8">
              <div className="space-y-2">
                <Link to={`/blog/${post.slug}`}>
                  <h2 className="text-2xl font-bold hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <div className="flex text-sm text-gray-500 space-x-4">
                  <span>{post.author.name}</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                {post.description && (
                  <p className="text-gray-700">{post.description}</p>
                )}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.tags.map((tagRelation) => (
                      <Link
                        key={tagRelation.tag.id}
                        to={`/blog/tags/${tagRelation.tag.name}`}
                        className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                      >
                        {tagRelation.tag.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-2" aria-label="Pagination">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <Link
                  key={page}
                  to={`/blog?page=${page}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    page === pagination.page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {page}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </div>
  );
}