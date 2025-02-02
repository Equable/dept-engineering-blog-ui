/* eslint-disable no-console */
import { GetStaticPaths, GetStaticProps } from 'next'
import { useRouter } from 'next/router'

import {
  GhostPostOrPage,
  GhostPostsOrPages,
  GhostSettings,
  getAllPages,
  getAllPostSlugs,
  getAllPosts,
  getAllSettings,
  getPageBySlug,
  getPostBySlug,
  getPostsByTag,
  getTagBySlug
} from '@lib/ghost'
import { resolveUrl } from '@utils/routing'
import { collections } from '@lib/collections'
import { processEnv } from '@lib/processEnv'

import { ISeoImage, seoImage } from '@meta/seoImage'
import { BodyClass } from '@helpers/BodyClass'
import { Post } from '@components/Post'
import { Page } from '@components/Page'

/**
 *
 * Renders a single post or page and loads all content.
 *
 */

interface CmsDataCore {
  post: GhostPostOrPage
  page: GhostPostOrPage
  settings: GhostSettings
  seoImage: ISeoImage
  previewPosts?: GhostPostsOrPages
  prevPost?: GhostPostOrPage
  nextPost?: GhostPostOrPage
  bodyClass: string
}

interface CmsData extends CmsDataCore {
  isPost: boolean
}

export interface PostOrPageProps {
  cmsData: CmsData
}

const PostOrPageIndex = ({ cmsData }: PostOrPageProps) => {
  const router = useRouter()
  if (router.isFallback) return <div>Loading...</div>

  const { isPost } = cmsData
  if (isPost) {
    return <Post {...{ cmsData }} />
  } else {
    return <Page cmsData={cmsData} />
  }
}

export default PostOrPageIndex

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!(params && params.slug && Array.isArray(params.slug))) {
    throw Error('getStaticProps: wrong parameters.')
  }
  const [slug] = params.slug.reverse()

  console.time('Post - getStaticProps')

  const settings = await getAllSettings()

  let post: GhostPostOrPage | null = null
  let page: GhostPostOrPage | null = null

  post = await getPostBySlug(slug)
  const isPost = !!post
  if (!isPost) {
    page = await getPageBySlug(slug)
  } else if (post?.primary_tag) {
    const primaryTag = await getTagBySlug(post?.primary_tag.slug)
    post.primary_tag = primaryTag
  }

  if (!post && !page) {
    return {
      notFound: true
    }
  }

  let previewPosts: GhostPostsOrPages | never[] = []
  let prevPost: GhostPostOrPage | null = null
  let nextPost: GhostPostOrPage | null = null

  if (isPost && post?.id && post?.slug) {
    const tagSlug = post?.primary_tag?.slug
    previewPosts =
      (tagSlug && (await getPostsByTag(tagSlug, 3, post?.id))) || []

    const postSlugs = await getAllPostSlugs()
    const index = postSlugs.indexOf(post?.slug)
    const prevSlug = index > 0 ? postSlugs[index - 1] : null
    const nextSlug = index < postSlugs.length - 1 ? postSlugs[index + 1] : null

    prevPost = (prevSlug && (await getPostBySlug(prevSlug))) || null
    nextPost = (nextSlug && (await getPostBySlug(nextSlug))) || null
  }

  const { siteUrl } = settings.processEnv
  const imageUrl = (post || page)?.feature_image || undefined
  const image = await seoImage({ siteUrl, imageUrl })

  const tags = (page && page.tags) || undefined

  console.timeEnd('Post - getStaticProps')

  return {
    props: {
      cmsData: {
        settings,
        post,
        page,
        isPost,
        seoImage: image,
        previewPosts,
        prevPost,
        nextPost,
        bodyClass: BodyClass({ isPost, page: page || undefined, tags })
      }
    },
    ...(processEnv.isr.enable && { revalidate: processEnv.isr.revalidate }) // re-generate at most once every revalidate second
  }
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { enable, maxNumberOfPosts, maxNumberOfPages } = processEnv.isr
  const limitForPosts = (enable && { limit: maxNumberOfPosts }) || undefined
  const limitForPages = (enable && { limit: maxNumberOfPages }) || undefined
  const posts = await getAllPosts(limitForPosts)
  const pages = await getAllPages(limitForPages)
  const settings = await getAllSettings()
  const { url: cmsUrl } = settings

  const postRoutes = (posts as GhostPostsOrPages).map((post) => {
    const collectionPath = collections.getCollectionByNode(post)
    const { slug, url } = post
    return resolveUrl({ cmsUrl, collectionPath, slug, url })
  })

  const pageRoutes = (pages as GhostPostsOrPages).map(({ slug, url }) =>
    resolveUrl({ cmsUrl, slug, url })
  )
  const paths = [...postRoutes, ...pageRoutes]

  return {
    paths,
    fallback: enable && 'blocking'
  }
}
