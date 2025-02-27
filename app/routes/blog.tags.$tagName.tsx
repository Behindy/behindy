import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "../utils/db.server";
import { formatDate } from "../utils/format";
import invariant from "tiny-invariant";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { tagName } = params;
  invariant(tagName, "Tag name is required");

  const tag = await db.tag.findUnique({
    where: { name: tagName },
  });

  if (!tag) {
    throw new Response("Tag not found", { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  const posts = await db.post.findMany({
    where: {
      published: true,
      tags: {
        some: {
          tag: {
            name: tagName
          }
        },
      },
    },
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
          tag:{
            select:{
              id: true,
              name: true,
            }
          }
        },
      },
    },
  });

  const count = await db.post.count({
    where: {
      published: true,
      tags: {
        some: {
          tag:{
              name: tagName,
          }
        },
      },
    },
  });

  return json({
    tag,
    posts,
    pagination: {
      page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
  });
}

export default function TagPosts() {
  const { tag, posts, pagination } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">
          <span className="text-blue-600">#{tag.name}</span> 태그의 포스트
        </h2>
        <p className="text-gray-600 mt-2">
          총 {pagination.totalItems}개의 포스트가 있습니다.
        </p>
      </div>

      <div className="grid gap-8">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900">이 태그의 포스트가 없습니다</h2>
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
                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.tags.map((tagRelation) => (
                      <Link
                        key={tagRelation.tag.id}
                        to={`/blog/tags/${tagRelation.tag.name}`}
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-md ${
                          tagRelation.tag.name === tag.name
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
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
                  to={`/blog/tags/${tag.name}?page=${page}`}
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