"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, Eye, EyeOff, Hash, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SuggestedTag = {
  id: string
  label: string
}

type UploadedImage = {
  publicId: string
  url: string
  width?: number
  height?: number
}

const SUGGESTED_TAGS: SuggestedTag[] = [
  { id: "teammates", label: "找队友" },
  { id: "activities", label: "活动" },
  { id: "study", label: "学习" },
  { id: "life", label: "生活" },
  { id: "jobs", label: "求职" },
  { id: "vent", label: "吐槽" },
]

export default function PublishPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [images, setImages] = useState<UploadedImage[]>([])
  const [selectedCid, setSelectedCid] = useState<number>(2)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadComposeContext() {
      try {
        const response = await fetch("/api/nodebb/compose", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        if (!active) {
          return
        }

        setSelectedCid(data.defaultCid || 2)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load compose context")
        }
      }
    }

    loadComposeContext()

    return () => {
      active = false
    }
  }, [])

  const canPublish = useMemo(() => {
    return title.trim().length > 0 && content.trim().length > 0 && !uploading && !publishing
  }, [content, publishing, title, uploading])

  const toggleTag = (tagId: string) => {
    setSelectedTags((current) => {
      if (current.includes(tagId)) {
        return current.filter((tag) => tag !== tagId)
      }

      if (current.length >= 3) {
        return current
      }

      return [...current, tagId]
    })
  }

  const openPicker = () => {
    if (!uploading && images.length < 9) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""

    if (!files.length) {
      return
    }

    setError("")
    setUploading(true)

    try {
      for (const file of files.slice(0, 9 - images.length)) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/cloudinary/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`)
        }

        const data = await response.json()
        setImages((current) => [
          ...current,
          {
            publicId: data.publicId,
            url: data.secureUrl,
            width: data.width,
            height: data.height,
          },
        ])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async (index: number) => {
    const target = images[index]
    if (!target) {
      return
    }

    setError("")
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))

    try {
      await fetch("/api/cloudinary/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicId: target.publicId,
        }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image delete failed")
    }
  }

  const handlePublish = async () => {
    if (!canPublish) {
      return
    }

    setPublishing(true)
    setError("")

    try {
      const response = await fetch("/api/nodebb/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          cid: selectedCid,
          tags: selectedTags,
          images,
          anonymous: isAnonymous,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Publish failed: ${response.status}`)
      }

      const data = await response.json()
      router.push(`/post/${data.tid}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/" className="rounded-full p-2 -ml-2 transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-medium">发布内容</span>
          <Button
            size="sm"
            className="h-8 rounded-full px-4 text-xs"
            disabled={!canPublish}
            onClick={handlePublish}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "发布"}
          </Button>
        </div>
      </header>

      <div className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <input type="hidden" value={selectedCid} readOnly />

        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={image.publicId} className="relative h-[72px] w-[72px] overflow-hidden rounded-lg">
                <Image src={image.url} alt="" fill className="object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/60"
                >
                  <X className="h-3 w-3 text-background" />
                </button>
              </div>
            ))}

            {images.length < 9 && (
              <button
                onClick={openPicker}
                className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                type="button"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                <span className="text-[10px]">{images.length}/9</span>
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          placeholder="填写标题更容易被发现..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={30}
          className="mb-2 w-full bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mb-3 text-right text-xs text-muted-foreground">{title.length}/30</div>

        <textarea
          placeholder="分享你的想法、经历或问题..."
          className="h-40 w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">选择标签（最多 3 个）</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs transition-all",
                  selectedTags.includes(tag.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground active:bg-secondary/70"
                )}
                type="button"
              >
                #{tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <EyeOff className="h-4 w-4 text-primary" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm text-foreground">{isAnonymous ? "匿名发布" : "实名发布"}</span>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  匿名状态由后端持久化，所有设备和用户看到一致
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAnonymous((current) => !current)}
              className={cn(
                "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                isAnonymous ? "bg-primary" : "bg-muted"
              )}
              type="button"
            >
              <div
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}

