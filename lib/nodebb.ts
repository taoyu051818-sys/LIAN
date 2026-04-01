export function getNodeBBPublicUrl() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost"
    const protocol = window.location.protocol || "http:"
    return `${protocol}//${host}:4567`
  }

  return process.env.NEXT_PUBLIC_NODEBB_URL || "http://localhost:4567"
}

export interface NodeBBRecentTopic {
  tid: number
  mainPid?: number | string
  teaserPid?: number | string
  cid: number
  title: string
  slug: string
  tags?: Array<string | { value?: string }>
  thumbs?: Array<{ url?: string; path?: string }>
  user?: {
    username?: string
    displayname?: string
    picture?: string | null
    "icon:text"?: string
  }
  category?: {
    name?: string
  }
  teaser?: {
    pid?: number | string
    content?: string
    user?: {
      username?: string
      displayname?: string
    }
  }
  mainPost?: {
    content?: string
  }
  postcount?: number
  followercount?: number
  viewcount?: number
  frontendAnonymous?: boolean
}

export interface NodeBBTopicPost {
  pid: number
  uid: number
  content: string
  user?: {
    username?: string
    displayname?: string
    picture?: string | null
    "icon:text"?: string
  }
  timestampISO?: string
  upvotes?: number
  bookmarked?: boolean
  upvoted?: boolean
  replies?: {
    count?: number
  }
}

export interface NodeBBTopicDetail {
  tid: number
  cid: number
  title: string
  slug: string
  tags?: Array<string | { value?: string }>
  thumbs?: Array<{ url?: string; path?: string }>
  category?: {
    name?: string
  }
  posts?: NodeBBTopicPost[]
  postcount?: number
  viewcount?: number
  frontendAnonymous?: boolean
}

export interface FrontendPostCardData {
  id: string
  pid?: string
  title: string
  content: string
  image: string
  author: {
    name: string
    avatar: string
    school: string
    isAnonymous: boolean
  }
  tags: string[]
  likes: number
  comments: number
  participantCount?: number
}

export interface FrontendTopicDetailData {
  id: string
  pid?: string
  title: string
  contentHtml: string
  contentHtmlTextOnly?: string
  image: string
  images: string[]
  author: {
    name: string
    avatar: string
    school: string
    isAnonymous: boolean
  }
  tags: string[]
  likes: number
  comments: number
  participantCount: number
  isBookmarked?: boolean
  isLiked?: boolean
  replies: Array<{
    id: string
    contentHtml: string
    author: {
      name: string
      avatar: string
      isAnonymous: boolean
    }
    createdAt?: string
  }>
}

function toAbsoluteUrl(path?: string | null) {
  if (!path) {
    return ""
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  const baseUrl = getNodeBBPublicUrl()
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`
}

function stripHtml(html?: string) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function fallbackAvatar(name?: string) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?"
  return `https://placehold.co/96x96/f4f4f5/27272a?text=${encodeURIComponent(initial)}`
}

function pickFirstImageFromContent(content?: string) {
  if (!content) {
    return ""
  }

  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (htmlMatch?.[1]) {
    return toAbsoluteUrl(htmlMatch[1])
  }

  const markdownMatch = content.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/i)
  if (markdownMatch?.[1]) {
    return toAbsoluteUrl(markdownMatch[1])
  }

  const teaserImageMatch = content.match(/\[image:\s*([^\]]+)\]/i)
  if (teaserImageMatch?.[1]) {
    const raw = teaserImageMatch[1].replace(/&amp;/g, "&").trim()
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw
    }
    if (raw.startsWith("photo-")) {
      return `https://images.unsplash.com/${raw}`
    }
  }

  return ""
}

function pickTopicImage(topic: {
  thumbs?: Array<{ url?: string; path?: string }>
  teaser?: { content?: string }
  mainPost?: { content?: string }
  posts?: Array<{ content?: string }>
}) {
  const thumb = topic.thumbs?.[0]
  const thumbUrl = toAbsoluteUrl(thumb?.url || thumb?.path)
  if (thumbUrl) {
    return thumbUrl
  }

  const inlineImage =
    pickFirstImageFromContent(topic.mainPost?.content) ||
    pickFirstImageFromContent(topic.posts?.[0]?.content) ||
    pickFirstImageFromContent(topic.teaser?.content)

  return inlineImage || "/images/quanquan-default.svg"
}

function pickTopicImages(topic: {
  thumbs?: Array<{ url?: string; path?: string }>
  posts?: Array<{ content?: string }>
}) {
  const images: string[] = []

  ;(topic.thumbs || []).forEach((thumb) => {
    const src = toAbsoluteUrl(thumb?.url || thumb?.path)
    if (src && !images.includes(src)) {
      images.push(src)
    }
  })

  const html = topic.posts?.[0]?.content || ""
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null = re.exec(html)
  while (m) {
    const src = toAbsoluteUrl(m[1])
    if (src && !images.includes(src)) {
      images.push(src)
    }
    m = re.exec(html)
  }

  if (!images.length) {
    images.push(pickTopicImage(topic))
  }

  return images
}

function stripImagesFromHtml(html?: string) {
  if (!html) {
    return ""
  }

  return html
    .replace(/<p[^>]*>\s*<img[^>]*>\s*<\/p>/gi, "")
    .replace(/<img[^>]*>/gi, "")
}

function pickAuthorName(user?: { displayname?: string; username?: string }) {
  return user?.displayname || user?.username || "圈圈用户"
}

function normalizeTagValues(tags?: Array<string | { value?: string }>) {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => (typeof tag === "string" ? tag : tag?.value || ""))
    .map((tag) => String(tag).trim())
    .filter(Boolean)
}

export function mapRecentTopicToPost(topic: NodeBBRecentTopic): FrontendPostCardData {
  const authorName = pickAuthorName(topic.user)
  const summary = stripHtml(topic.teaser?.content || topic.title)
  const tags = normalizeTagValues(topic.tags)
  const pid = topic.mainPid ?? topic.teaserPid ?? topic.teaser?.pid

  return {
    id: String(topic.tid),
    pid: pid ? String(pid) : undefined,
    title: topic.title,
    content: summary,
    image: pickTopicImage(topic),
    author: {
      name: authorName,
      avatar: toAbsoluteUrl(topic.user?.picture) || fallbackAvatar(authorName),
      school: topic.category?.name || "圈圈",
      isAnonymous: !!topic.frontendAnonymous,
    },
    tags,
    likes: topic.followercount || 0,
    comments: Math.max((topic.postcount || 1) - 1, 0),
    participantCount: topic.postcount || 1,
  }
}

export function mapTopicDetail(topic: NodeBBTopicDetail): FrontendTopicDetailData {
  const mainPost = topic.posts?.[0]
  const authorName = pickAuthorName(mainPost?.user)
  const images = pickTopicImages(topic)
  const tags = normalizeTagValues(topic.tags)
  const replies = (topic.posts || [])
    .slice(1)
    .map((reply) => {
      const replyAuthor = pickAuthorName(reply.user)
      return {
        id: String(reply.pid),
        contentHtml: reply.content || "",
        author: {
          name: replyAuthor,
          avatar: toAbsoluteUrl(reply.user?.picture) || fallbackAvatar(replyAuthor),
          isAnonymous: !!topic.frontendAnonymous,
        },
        createdAt: reply.timestampISO,
      }
    })

  return {
    id: String(topic.tid),
    pid: mainPost?.pid ? String(mainPost.pid) : undefined,
    title: topic.title,
    contentHtml: mainPost?.content || "",
    contentHtmlTextOnly: stripImagesFromHtml(mainPost?.content || ""),
    image: images[0] || pickTopicImage(topic),
    images,
    author: {
      name: authorName,
      avatar: toAbsoluteUrl(mainPost?.user?.picture) || fallbackAvatar(authorName),
      school: topic.category?.name || "圈圈",
      isAnonymous: !!topic.frontendAnonymous,
    },
    tags,
    likes: mainPost?.upvotes || 0,
    comments: Math.max((topic.postcount || 1) - 1, 0),
    participantCount: topic.postcount || 1,
    isBookmarked: !!mainPost?.bookmarked,
    isLiked: !!mainPost?.upvoted,
    replies,
  }
}
