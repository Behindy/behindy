import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData } from "@remix-run/react";
import { db } from "../utils/db.server";
import { formatDateTime } from "../utils/format";
import { authenticateUser, requireAuth } from "../utils/auth.server";
import invariant from "tiny-invariant";
import { marked } from "marked";
import { useState, useEffect } from "react";
interface User {
  id: string;
  name: string;
  profileImage?: string | null;
  email?: string;
  role?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date; 
  updatedAt?: string | Date; // 문자열 또는 Date 모두 허용
  authorId?: string;
  postId?: string;
  parentId?: string | null;
  author: {
    id: string;
    name: string;
    profileImage?: string | null;
  };
  replies?: Comment[];
}

interface ActionData {
  commentError?: string;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug;
  invariant(slug, "Slug is required");

  const user = await authenticateUser(request);
  
  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      tags: {
        include: {
          tag: true
        }
      },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!post || (!post.published && (!user || user.id !== post.authorId))) {
    throw new Response("Not Found", { status: 404 });
  }

  // 조회수 증가 (중복 방지를 위한 실제 구현은 세션 기반으로 해야함)
  await db.post.update({
    where: { id: post.id },
    data: { views: post.views + 1 },
  });

  // markdown 변환
  const htmlContent = marked(post.content);

  return json({
    post: {
      ...post,
      content: htmlContent,
    },
    isAuthor: user?.id === post.authorId,
    user,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const slug = params.slug;
  invariant(slug, "Slug is required");

  const post = await db.post.findUnique({
    where: { slug },
  });

  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("_intent");

  // 댓글 추가
  if (intent === "add-comment") {
    const content = formData.get("content");
    const parentId = formData.get("parentId");

    if (typeof content !== "string" || !content.trim()) {
      return json(
        { commentError: "댓글 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // 부모 댓글이 있으면 답글, 없으면 새 댓글
    await db.comment.create({
      data: {
        content,
        parentId: typeof parentId === "string" && parentId ? parentId : null,
        authorId: user.id,
        postId: post.id,
      },
    });

    // 현재 페이지로 리디렉션
    return redirect(`/blog/${slug}`);
  }
  
  // 댓글 삭제
  if (intent === "delete-comment") {
    const commentId = formData.get("commentId");
    
    if (typeof commentId !== "string") {
      return json(
        { commentError: "Invalid comment ID" },
        { status: 400 }
      );
    }
    
    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!comment) {
      return json(
        { commentError: "댓글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 댓글 작성자 또는 포스트 작성자만 삭제 가능
    if (comment.authorId !== user.id && post.authorId !== user.id) {
      return json(
        { commentError: "댓글을 삭제할 권한이 없습니다." },
        { status: 403 }
      );
    }
    
    // 댓글 삭제
    await db.comment.delete({
      where: { id: commentId },
    });
    
    return redirect(`/blog/${slug}`);
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
}

export default function BlogPost() {
  const { post, isAuthor, user } = useLoaderData<typeof loader>();
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  // URL 해시가 있는 경우 해당 댓글로 스크롤
  useEffect(() => {
    if (window.location.hash) {
      const commentId = window.location.hash.substring(1); // #을 제외한 ID
      setHighlightedCommentId(commentId);
      
      // 스크롤 애니메이션
      const element = document.getElementById(commentId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {!post.published && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
          <p className="text-yellow-800">
            이 글은 아직 발행되지 않았습니다. 작성자만 볼 수 있습니다.
          </p>
        </div>
      )}
      
      <article className="prose lg:prose-xl max-w-none">
        <header className="mb-8 not-prose">
          <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
          
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <div className="flex items-center space-x-2">
              <Link to={`/blog/author/${post.author.id}`} className="flex items-center hover:text-blue-600 transition-colors">
                {post.author.profileImage ? (
                  <img 
                    src={post.author.profileImage}
                    alt={post.author.name}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">{post.author.name.charAt(0)}</span>
                  </div>
                )}
                <span>{post.author.name}</span>
              </Link>
              <span>·</span>
              <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
              <span>·</span>
              <span>조회 {post.views}회</span>
            </div>
            
            {isAuthor && (
              <div className="flex space-x-2">
                <Link 
                  to={`/blog/${post.slug}/edit`}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  수정
                </Link>
              </div>
            )}
          </div>
          
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 my-4">
              {post.tags.map((tagRelation) => (
                <Link
                  key={tagRelation.tag.id}
                  to={`/blog/tags/${tagRelation.tag.name}`}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  {tagRelation.tag.name}
                </Link>
              ))}
            </div>
          )}
          
          <hr className="my-6" />
        </header>
        {// @ts-expect-error - 외부 라이브러리와 함께 사용할 때 발생하는 타입 문제
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        }
      </article>
      
      {/* 댓글 섹션 */}
      <section className="mt-12 not-prose">
        <h2 className="text-2xl font-bold mb-6">댓글 {post.comments.length}개</h2>
        
        <CommentForm postId={post.id} user={user} />
        
        <div className="mt-8 space-y-6">
          {post.comments.map((comment) => (
            <Comment 
              key={comment.id} 
              comment={comment} 
              postId={post.id}
              user={user}
              postAuthorId={post.author.id}
              isHighlighted={highlightedCommentId === `comment-${comment.id}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// 댓글 입력 폼
function CommentForm({ postId, parentId = null, user }: { postId: string; parentId?: string | null; user: User | null }) {
  const [content, setContent] = useState("");
  const actionData = useActionData<ActionData>();
  const isReply = !!parentId;
  
  if (!user) {
    return (
      <div className="bg-gray-50 p-4 rounded-md border">
        <p className="text-gray-700 mb-2">댓글을 작성하려면 로그인이 필요합니다.</p>
        <Link 
          to="/login"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          로그인하기
        </Link>
      </div>
    );
  }
  
  return (
    <Form method="post" className="mt-4">
      <input type="hidden" name="_intent" value="add-comment" />
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      
      <div className="flex items-start space-x-3">
        {user.profileImage ? (
          <img 
            src={user.profileImage}
            alt={user.name}
            className="w-8 h-8 rounded-full mt-1"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mt-1">
            <span className="text-gray-500 text-xs">{user.name.charAt(0)}</span>
          </div>
        )}
        
        <div className="flex-1">
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={isReply ? 2 : 3}
            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={isReply ? "답글을 작성하세요..." : "댓글을 작성하세요..."}
          />
          
          {actionData?.commentError && (
            <p className="text-red-600 text-sm mt-1">{actionData.commentError}</p>
          )}
          
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!content.trim()}
            >
              {isReply ? "답글 작성" : "댓글 작성"}
            </button>
          </div>
        </div>
      </div>
    </Form>
  );
}

// 댓글 컴포넌트
function Comment({ 
  comment, 
  postId, 
  user, 
  postAuthorId,
  isHighlighted = false
}: { 
  comment: Comment; 
  postId: string; 
  user: User | null;
  postAuthorId: string;
  isHighlighted?: boolean;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  
  // 사용자가 댓글의 작성자거나 포스트 작성자인 경우 삭제 가능
  const canDelete = user && (user.id === comment.author.id || user.id === postAuthorId);
  
  return (
    <div 
      id={`comment-${comment.id}`} 
      className={`border-b pb-6 ${isHighlighted ? 'bg-yellow-50 p-3 rounded-md border border-yellow-200' : ''}`}
    >
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          {comment.author.profileImage ? (
            <img 
              src={comment.author.profileImage}
              alt={comment.author.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xs">{comment.author.name.charAt(0)}</span>
            </div>
          )}
          <span className="font-medium">{comment.author.name}</span>
          <span className="text-sm text-gray-500">{formatDateTime(comment.createdAt)}</span>
        </div>
        
        {canDelete && (
          <Form method="post">
            <input type="hidden" name="_intent" value="delete-comment" />
            <input type="hidden" name="commentId" value={comment.id} />
            <button 
              type="submit"
              className="text-red-600 hover:text-red-800 text-sm"
              onClick={(e) => {
                if (!confirm("댓글을 삭제하시겠습니까?")) {
                  e.preventDefault();
                }
              }}
            >
              삭제
            </button>
          </Form>
        )}
      </div>
      
      <div className="mt-2">
        <p>{comment.content}</p>
      </div>
      
      <div className="mt-2">
        {user && (
          <button 
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showReplyForm ? "취소" : "답글"}
          </button>
        )}
      </div>
      
      {showReplyForm && (
        <div className="mt-3 ml-6">
          <CommentForm postId={postId} parentId={comment.id} user={user} />
        </div>
      )}
      
      {/* 답글 표시 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-6 space-y-4">
          {comment.replies && comment.replies.map((reply: Comment) => (
            <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {reply.author.profileImage ? (
                    <img 
                      src={reply.author.profileImage}
                      alt={reply.author.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{reply.author.name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="font-medium">{reply.author.name}</span>
                  <span className="text-xs text-gray-500">{formatDateTime(reply.createdAt)}</span>
                </div>
                
                {user && (user.id === reply.author.id || user.id === postAuthorId) && (
                  <Form method="post">
                    <input type="hidden" name="_intent" value="delete-comment" />
                    <input type="hidden" name="commentId" value={reply.id} />
                    <button 
                      type="submit"
                      className="text-red-600 hover:text-red-800 text-xs"
                      onClick={(e) => {
                        if (!confirm("답글을 삭제하시겠습니까?")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      삭제
                    </button>
                  </Form>
                )}
              </div>
              <p className="mt-1">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}