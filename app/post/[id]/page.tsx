"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  Bookmark,
  Camera,
  ChevronLeft,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { mapTopicDetail, type FrontendTopicDetailData } from "@/lib/nodebb"

interface PostDetailPageProps {
  params: Promise<{
    id: string
  }>
}

function DetailHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-12 items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Details</span>
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  )
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<FrontendTopicDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [activeImage, setActiveImage] = useState(0)
  const [showCommentComposer, setShowCommentComposer] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentImages, setCommentImages] = useState<File[]>([])
  const [locationLabel, setLocationLabel] = useState("")
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [likeSubmitting, setLikeSubmitting] = useState(false)
  const [likeError, setLikeError] = useState("")
  const [bookmarkOn, setBookmarkOn] = useState(false)
  const [bookmarkSubmitting, setBookmarkSubmitting] = useState(false)
  const [bookmarkError, setBookmarkError] = useState("")
  const [shareHint, setShareHint] = useState("")
  const [discussionHint, setDiscussionHint] = useState("")
  const imageStripRef = useRef<HTMLDivElement | null>(null)
  const commentInputRef = useRef<HTMLInputElement | null>(null)
  const commentImageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let active = true

    async function loadTopic() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch(`/api/nodebb/topic/${id}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        const mapped = mapTopicDetail(data)

        if (active) {
          setPost(mapped)
          setLikeCount(mapped.likes)
          setLiked(!!mapped.isLiked)
          setBookmarkOn(!!mapped.isBookmarked)
          setActiveImage(0)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load topic")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadTopic()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!showCommentComposer) {
      return
    }

    const timer = setTimeout(() => {
      commentInputRef.current?.focus()
    }, 80)

    return () => clearTimeout(timer)
  }, [showCommentComposer])

  const handleLike = async () => {
    if (!post?.pid || likeSubmitting) {
      return
    }

    const nextLiked = !liked
    const prevLiked = liked
    const prevCount = likeCount
    setLikeError("")
    setLikeSubmitting(true)
    setLiked(nextLiked)
    setLikeCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)))

    try {
      const response = await fetch(`/api/nodebb/posts/${post.pid}/like`, {
        method: nextLiked ? "PUT" : "DELETE",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `HTTP ${response.status}`)
      }
    } catch (err) {
      setLiked(prevLiked)
      setLikeCount(prevCount)
      setLikeError(err instanceof Error ? err.message : "Failed to update like")
    } finally {
      setLikeSubmitting(false)
    }
  }

  const handleImageStripScroll = () => {
    if (!imageStripRef.current || !post) {
      return
    }

    const el = imageStripRef.current
    const width = el.clientWidth || 1
    const index = Math.round(el.scrollLeft / width)
    const bounded = Math.max(0, Math.min(index, post.images.length - 1))
    setActiveImage(bounded)
  }

  const jumpToImage = (index: number) => {
    if (!imageStripRef.current) {
      return
    }

    const width = imageStripRef.current.clientWidth
    imageStripRef.current.scrollTo({
      left: width * index,
      behavior: "smooth",
    })
    setActiveImage(index)
  }

  const openCommentComposer = () => {
    setShowCommentComposer(true)
  }

  const handlePickCommentImage = () => {
    commentImageInputRef.current?.click()
  }

  const onCommentImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setCommentImages((prev) => [...prev, ...files].slice(0, 6))
    event.target.value = ""
  }

  const toggleLocation = () => {
    setLocationLabel((value) => (value ? "" : "Campus"))
  }

  const handleBookmark = async () => {
    if (!post?.pid || bookmarkSubmitting) {
      return
    }

    const nextValue = !bookmarkOn
    const prevValue = bookmarkOn
    setBookmarkError("")
    setBookmarkSubmitting(true)
    setBookmarkOn(nextValue)

    try {
      const response = await fetch(`/api/nodebb/posts/${post.pid}/bookmark`, {
        method: nextValue ? "PUT" : "DELETE",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `HTTP ${response.status}`)
      }
    } catch (err) {
      setBookmarkOn(prevValue)
      setBookmarkError(err instanceof Error ? err.message : "Failed to update bookmark")
    } finally {
      setBookmarkSubmitting(false)
    }
  }

  const handleShare = () => {
    setShareHint("Share 功能预留中，后续接入。")
  }

  const handleEnterDiscussion = () => {
    setDiscussionHint("讨论功能预留中，后续接入。")
  }

  const handleSendComment = async () => {
    const content = commentText.trim()
    if (!content || commentSubmitting) {
      return
    }

    try {
      setCommentSubmitting(true)
      setCommentError("")

      const replyRes = await fetch(`/api/nodebb/topic/${id}/reply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ content }),
      })

      if (!replyRes.ok) {
        const payload = (await replyRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `HTTP ${replyRes.status}`)
      }

      const topicRes = await fetch(`/api/nodebb/topic/${id}`, {
        cache: "no-store",
      })

      if (topicRes.ok) {
        const data = await topicRes.json()
        const mapped = mapTopicDetail(data)
        setPost(mapped)
      }

      setCommentText("")
      setCommentImages([])
      setLocationLabel("")
      setShowCommentComposer(false)
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to send comment")
    } finally {
      setCommentSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <DetailHeader onBack={() => router.back()} />
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading topic...</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <DetailHeader onBack={() => router.back()} />
        <div className="px-4 py-10 text-center text-sm text-destructive">
          {error || "Topic not found"}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <DetailHeader onBack={() => router.back()} />

      <div className="space-y-4 px-4 py-4">
        <div className="relative overflow-hidden rounded-lg bg-muted">
          <div
            ref={imageStripRef}
            className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
            onScroll={handleImageStripScroll}
          >
            {post.images.map((src, index) => (
              <div key={`${src}-${index}`} className="relative aspect-[3/4] w-full flex-shrink-0 snap-center">
                <Image src={src} alt={post.title} fill priority={index === 0} className="object-cover" />
              </div>
            ))}
          </div>

          {post.images.length > 1 && (
            <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {post.images.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                    index === activeImage ? "w-5 bg-white" : "w-1.5 bg-white/55"
                  }`}
                  onClick={() => jumpToImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-tight text-foreground">{post.title}</h1>

        <div className="flex items-center gap-3 border-b border-border py-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {post.author.isAnonymous ? "Anonymous" : post.author.name}
            </p>
            <p className="text-xs text-muted-foreground">{post.author.school}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">
            Total <span className="font-semibold">{post.participantCount}</span> posts
          </span>
        </div>

        {!!post.tags.length && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div
          className="prose prose-sm max-w-none leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: post.contentHtmlTextOnly || post.contentHtml }}
        />

        <div className="flex items-center gap-4 border-y border-border py-3 text-sm text-muted-foreground">
          <span>{likeCount} likes</span>
          <span>{post.comments} comments</span>
        </div>
        {likeError ? (
          <p className="text-xs text-destructive">{likeError}</p>
        ) : null}
        {bookmarkError ? (
          <p className="text-xs text-destructive">{bookmarkError}</p>
        ) : null}
        {shareHint ? (
          <p className="text-xs text-muted-foreground">{shareHint}</p>
        ) : null}

        <div className="grid grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg"
            onClick={handleLike}
            disabled={likeSubmitting || !post.pid}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />
            <span className="text-xs">{liked ? "Liked" : "Like"}</span>
          </Button>
          <Button variant="outline" className="h-10 gap-2 rounded-lg" onClick={openCommentComposer}>
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">Comment</span>
          </Button>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg"
            onClick={handleBookmark}
            disabled={bookmarkSubmitting || !post.pid}
          >
            <Bookmark className={`h-4 w-4 ${bookmarkOn ? "fill-primary text-primary" : ""}`} />
            <span className="text-xs">{bookmarkOn ? "Saved" : "Save"}</span>
          </Button>
          <Button variant="outline" className="h-10 gap-2 rounded-lg" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>

        <section className="space-y-3 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-foreground">Comments ({post.replies.length})</h2>
          {post.replies.length ? (
            <div className="space-y-3">
              {post.replies.map((reply) => (
                <article key={reply.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image src={reply.author.avatar} alt={reply.author.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {reply.author.isAnonymous ? "Anonymous" : reply.author.name}
                      </p>
                      {reply.createdAt ? (
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(reply.createdAt).toLocaleString("zh-CN")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: reply.contentHtml }}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No comments yet. Be the first to comment.</p>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        {!showCommentComposer ? (
          <div className="space-y-2">
            {discussionHint ? (
              <p className="text-xs text-muted-foreground">{discussionHint}</p>
            ) : null}
            <Button
              onClick={handleEnterDiscussion}
              className="h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Enter discussion
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {commentError ? (
              <p className="text-xs text-destructive">{commentError}</p>
            ) : null}
            {commentImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {commentImages.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePickCommentImage}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleLocation}
                className={`flex h-10 items-center justify-center gap-1 rounded-full border px-3 text-xs ${
                  locationLabel ? "border-primary text-primary" : "border-border"
                }`}
              >
                <MapPin className="h-4 w-4" />
                {locationLabel || "Location"}
              </button>
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Write a comment..."
                className="h-10 flex-1 rounded-full border border-border bg-background px-3 text-sm outline-none"
                disabled={commentSubmitting}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={handleSendComment}
                disabled={!commentText.trim() || commentSubmitting}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <input
              ref={commentImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onCommentImageChange}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}
