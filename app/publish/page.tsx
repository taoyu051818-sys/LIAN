"use client"

import { ArrowLeft, X, ImageIcon, Hash, Eye, EyeOff, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

const SUGGESTED_TAGS = [
  { id: "teammates", label: "找队友" },
  { id: "activities", label: "活动" },
  { id: "study", label: "学习" },
  { id: "life", label: "生活" },
  { id: "jobs", label: "求职" },
  { id: "vent", label: "树洞" },
]

// 模拟图片数据
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&h=200&fit=crop",
]

export default function PublishPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId))
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const addDemoImage = () => {
    if (images.length < 9) {
      setImages([...images, DEMO_IMAGES[0]])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const canPublish = title.trim() && content.trim() && images.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium">发布内容</span>
          <Button
            size="sm"
            className="rounded-full text-xs h-8 px-4"
            disabled={!canPublish}
          >
            发布
          </Button>
        </div>
      </header>

      <div className="p-4">
        {/* 图片上传区 */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {images.map((img, index) => (
              <div key={index} className="relative w-[72px] h-[72px] rounded-lg overflow-hidden">
                <Image src={img} alt="" fill className="object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-background" />
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <button
                onClick={addDemoImage}
                className="w-[72px] h-[72px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px]">{images.length}/9</span>
              </button>
            )}
          </div>
        </div>

        {/* 标题输入 */}
        <input
          type="text"
          placeholder="填写标题更容易被发现..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={30}
          className="w-full text-lg font-medium bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none mb-2"
        />
        <div className="text-right text-xs text-muted-foreground mb-3">
          {title.length}/30
        </div>

        {/* 正文输入 */}
        <textarea
          placeholder="分享你的想法、经历或问题..."
          className="w-full h-40 resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* 标签选择 */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">选择标签（最多3个）</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs transition-all",
                  selectedTags.includes(tag.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground active:bg-secondary/70"
                )}
              >
                #{tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* 匿名开关 */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <EyeOff className="w-4 h-4 text-primary" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm text-foreground">
                  {isAnonymous ? "匿名发布" : "实名发布"}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isAnonymous
                    ? "其他用户将无法看到你的身份信息"
                    : "其他用户可以看到你的头像和昵称"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex-shrink-0",
                isAnonymous ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* 提示 */}
        <div className="mt-6 p-3 bg-muted/50 rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
            发布内容请遵守社区规范，禁止发布违法、低俗、广告等内容。违规内容将被删除，严重者将被封禁账号。
          </p>
        </div>
      </div>
    </div>
  )
}
