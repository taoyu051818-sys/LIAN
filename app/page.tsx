"use client"

import { MasonryGrid } from "@/components/masonry-grid"
import { BottomNav } from "@/components/bottom-nav"
import type { PostData } from "@/components/post-card"
import { useRouter } from "next/navigation"

// 推荐卡片数据 - 混合类型（活动、问答、吐槽等）
const RECOMMENDED_POSTS: PostData[] = [
  {
    id: "1",
    title: "AI比赛找队友！有没有会机器学习的大佬一起组队",
    content: "最近想参加一个AI创新大赛，需要2-3个队友...",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=600&fit=crop",
    author: {
      name: "张三",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      school: "北京邮电大学",
      isAnonymous: false,
    },
    tags: ["找队友", "AI"],
    likes: 128,
    comments: 32,
    participantCount: 2,
    category: "activity",
  },
  {
    id: "2",
    title: "分享一下我的考研经验，从双非逆袭985",
    content: "大家好，我是22届考研上岸的学姐...",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=500&fit=crop",
    author: {
      name: "匿名",
      avatar: "",
      school: "清华大学",
      isAnonymous: true,
    },
    tags: ["学习", "考研"],
    likes: 892,
    comments: 156,
    category: "question",
  },
  {
    id: "3",
    title: "周末一起打羽毛球吗？五道口附近",
    content: "有没有爱好羽毛球的小伙伴...",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&h=550&fit=crop",
    author: {
      name: "运动达人",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      school: "北京大学",
      isAnonymous: false,
    },
    tags: ["活动", "运动"],
    likes: 67,
    comments: 23,
    participantCount: 3,
    category: "activity",
  },
  {
    id: "4",
    title: "求推荐实习！计算机方向，大三在读",
    content: "各位学长学姐好，想找一份暑期实习...",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=450&fit=crop",
    author: {
      name: "求职小白",
      avatar: "",
      school: "电子科技大学",
      isAnonymous: true,
    },
    tags: ["求职", "实习"],
    likes: 234,
    comments: 89,
    category: "question",
  },
  {
    id: "5",
    title: "今天的食堂饭菜好难吃啊，有人共鸣吗",
    content: "第三食堂的红烧肉真的越来越差了...",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop",
    author: {
      name: "干饭人",
      avatar: "",
      school: "复旦大学",
      isAnonymous: true,
    },
    tags: ["生活", "吐槽"],
    likes: 456,
    comments: 178,
    category: "vent",
  },
  {
    id: "6",
    title: "校园风景分享｜春天的樱花太美了",
    content: "分享一组今天拍的照片...",
    image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=600&fit=crop",
    author: {
      name: "摄影爱好者",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      school: "武汉大学",
      isAnonymous: false,
    },
    tags: ["生活", "摄影"],
    likes: 1024,
    comments: 89,
    category: "share",
  },
  {
    id: "7",
    title: "数学建模比赛经验分享，拿过国一",
    content: "给想参加数模的同学一些建议...",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=crop",
    author: {
      name: "数模大佬",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      school: "浙江大学",
      isAnonymous: false,
    },
    tags: ["学习", "比赛"],
    likes: 567,
    comments: 134,
    category: "question",
  },
  {
    id: "8",
    title: "有人一起学日语吗？想组个学习小组",
    content: "准备考N2，找几个一起学习的小伙伴...",
    image: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=550&fit=crop",
    author: {
      name: "日语小白",
      avatar: "",
      school: "上海交通大学",
      isAnonymous: true,
    },
    tags: ["学习", "语言"],
    likes: 89,
    comments: 45,
    participantCount: 1,
    category: "activity",
  },
]

export default function HomePage() {
  const router = useRouter()

  const handlePostClick = (id: string) => {
    router.push(`/post/${id}`)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 纯净顶部 - 什么都不要 */}
      <div className="h-3" />
      
      {/* 推荐卡片流 */}
      <MasonryGrid posts={RECOMMENDED_POSTS} onPostClick={handlePostClick} />
      
      {/* 底部导航 */}
      <BottomNav />
    </div>
  )
}
