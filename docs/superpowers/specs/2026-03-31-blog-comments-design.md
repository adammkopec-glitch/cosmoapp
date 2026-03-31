# Blog Comments System — Design Spec

**Date:** 2026-03-31
**Branch:** feat/quiz-admin
**Status:** Approved (v2 — post-review fixes)

---

## Overview

Add a commenting system to the blog. Comments are publicly visible (no login required to read), but posting, replying, and reacting requires authentication. Admins can moderate: hide, mark as spam, or delete any comment.

---

## Features

- Threaded comments (unlimited nesting via adjacency list / `parentId`)
- Facebook-style reactions: ❤️ 😂 😮 😢 😡 👍 — one reaction per user per comment (toggle: same emoji removes it, different emoji replaces it)
- Photo attachments: 1 image per comment, Sharp resize, saved to `/uploads/comments/`
- Public read access; login required to post/react
- In-app notification (type `BLOG_COMMENT_REPLY`) when someone replies to your comment (not for reactions)
- Admin moderation: hide, mark as spam, delete

---

## Database Schema

### `BlogComment`

```prisma
model BlogComment {
  id        String   @id @default(cuid())
  postId    String
  post      BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("BlogCommentAuthor", fields: [authorId], references: [id], onDelete: Restrict)
  parentId  String?
  parent    BlogComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  replies   BlogComment[] @relation("CommentReplies")
  content   String   // max 2000 chars, validated at controller level
  imagePath String?
  isHidden  Boolean  @default(false)
  isSpam    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reactions BlogCommentReaction[]

  @@index([postId])
  @@index([parentId])
}
```

**`onDelete: Restrict` on `author`**: prevents user account deletion while they have comments. This is consistent with protecting content integrity (same pattern used for `BlogPost.author`).

**`onDelete: NoAction` on `parent`**: required by PostgreSQL for self-referencing tables to avoid circular cascade issues; child comments are deleted via `onDelete: Cascade` from the post.

### `BlogCommentReaction`

```prisma
model BlogCommentReaction {
  id        String      @id @default(cuid())
  commentId String
  comment   BlogComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation("BlogCommentReactions", fields: [userId], references: [id], onDelete: Cascade)
  emoji     String      // validated against allowed set: ❤️ 😂 😮 😢 😡 👍
  createdAt DateTime    @default(now())

  @@unique([commentId, userId])
  @@index([commentId])
}
```

**`onDelete: Cascade` on `user`**: reactions are personal data — deleted with the user account.

### `BlogPost` addition

```prisma
comments BlogComment[]
```

### `User` additions

```prisma
blogComments         BlogComment[]         @relation("BlogCommentAuthor")
blogCommentReactions BlogCommentReaction[] @relation("BlogCommentReactions")
```

### `NotificationType` enum addition

```prisma
BLOG_COMMENT_REPLY
```

Added alongside existing: `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CANCELLED`, etc.

### Migration name

`add_blog_comments`

---

## Backend

### Module: `apps/server/src/modules/blog-comments/`

Files: `blog-comments.controller.ts`, `blog-comments.router.ts`, `blog-comments.service.ts`

### Route mounting

The comments router is mounted at **`/api/blog-comments`** (separate prefix) in `app.ts`, to avoid ambiguous route matching with the existing `blogRouter` already at `/api/blog`. This keeps `blog-comments` as a fully independent module.

```ts
// app.ts
import blogCommentsRouter from './modules/blog-comments/blog-comments.router';
app.use('/api/blog-comments', blogCommentsRouter);
```

### `optionalAuth` helper

The `optionalAuth` helper currently defined inline in `blog.router.ts` is extracted to `apps/server/src/middleware/auth.middleware.ts` as a named export, so both `blog.router.ts` and `blog-comments.router.ts` can import it without duplication.

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/blog-comments/:slug` | optionalAuth | Return processed comment list for the post |
| `POST` | `/blog-comments/:slug` | authenticated | Create comment; body: `{ content, parentId? }` + optional `image` file (multipart) |
| `DELETE` | `/blog-comments/:id` | authenticated (own or admin) | Delete comment, cascade replies/reactions, delete image file |
| `PATCH` | `/blog-comments/:id/moderate` | admin | Set `isHidden` and/or `isSpam` |
| `POST` | `/blog-comments/:id/react` | authenticated | Toggle reaction; body: `{ emoji }` |

**Note:** Both GET and POST use `:slug` to identify the post. The service resolves `slug → postId` internally. The frontend only needs the slug (already available from the URL param).

### Input validation (Zod)

Inline Zod schemas in the controller (not in `@cosmo/shared` — comments types are backend-local like quiz/notifications):

```ts
const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().cuid().optional(),
});

const reactSchema = z.object({
  emoji: z.enum(['❤️', '😂', '😮', '😢', '😡', '👍']),
});

const moderateSchema = z.object({
  isHidden: z.boolean().optional(),
  isSpam: z.boolean().optional(),
});
```

### Service logic

**`getComments(slug)`**
- Finds post by slug, returns all `BlogComment` where `postId = post.id AND isSpam = false`.
- Includes: `author { name, avatarPath }`, `reactions { emoji, userId }`.
- **Hidden comments**: `content` and `imagePath` are set to `null` before returning; `isHidden: true` flag is preserved so the frontend can show "Komentarz ukryty przez administratora".
- Returns flat array; client builds tree.

**`createComment(userId, slug, data, imageFile?)`**
- Validates post exists and `isPublished = true`.
- Processes image via Sharp if provided → saves to `/uploads/comments/<uuid>.webp`.
- Creates `BlogComment`.
- If `parentId` provided and `parent.authorId !== userId`: creates `Notification` (type `BLOG_COMMENT_REPLY`) for parent author:
  > `"[name] odpowiedział(a) na Twój komentarz w artykule „[title]""`

**`deleteComment(userId, commentId, isAdmin)`**
- If not admin: verifies `comment.authorId === userId`, throws `AppError(403)` otherwise.
- If `comment.imagePath` exists: calls `fs.unlink` to remove the file from disk (non-blocking; errors logged but not thrown).
- Deletes comment (Prisma cascade handles replies and reactions).

**`moderateComment(commentId, data)`**
- Admin only. Updates `isHidden` and/or `isSpam`.

**`reactToComment(userId, commentId, emoji)`**
- Finds existing reaction for `(commentId, userId)`.
- Same emoji → delete (unreact).
- Different emoji → update emoji field.
- No existing reaction → create.

### Response shape

All endpoints follow the existing `{ status: 'success', data: { ... } }` envelope:

```ts
// GET /blog-comments/:slug
{ status: 'success', data: { comments: BlogComment[] } }

// POST /blog-comments/:slug
{ status: 'success', data: { comment: BlogComment } }

// DELETE /blog-comments/:id
{ status: 'success', data: null }

// PATCH /blog-comments/:id/moderate
{ status: 'success', data: { comment: BlogComment } }

// POST /blog-comments/:id/react
{ status: 'success', data: { reaction: BlogCommentReaction | null } }
// reaction is null when the reaction was removed (toggle off)
```

### Image upload

Comment creation uses `upload.single('image')` (existing multer + Sharp config). Saves to `/uploads/comments/`. `imagePath` stored as `/uploads/comments/<filename>`.

---

## Frontend

### New API functions (`apps/web/src/api/blog.api.ts`)

```ts
getComments:     (slug: string) => GET /blog-comments/:slug
addComment:      (slug, { content, parentId?, image? }) => POST /blog-comments/:slug  (FormData)
deleteComment:   (id) => DELETE /blog-comments/:id
moderateComment: (id, { isHidden?, isSpam? }) => PATCH /blog-comments/:id/moderate
reactToComment:  (id, emoji) => POST /blog-comments/:id/react
```

### New components (`apps/web/src/components/blog/`)

**`BlogCommentsSection`**
- Mounted at bottom of `BlogPost.tsx`, below article content.
- Fetches comments via React Query key `['blog-comments', slug]`.
- Renders `CommentForm` (or login prompt if unauthenticated) + `CommentTree`.

**`CommentTree`**
- Takes flat array of comments, builds nested tree in-memory (group by `parentId`).
- Renders top-level comments; each `CommentItem` recursively renders its replies.
- No hard cap on nesting depth (visual indent capped at ~6 levels to avoid overflow).

**`CommentItem`**
- Shows: author avatar, name, date, content, image (if present), reaction bar, "Odpowiedz" button.
- Hidden comments (`isHidden: true`, `content: null`): shows greyed-out "Komentarz ukryty przez administratora" — no content or image shown.
- Own comment or admin: delete icon.
- Admin only: hide/spam toggle icons.
- "Odpowiedz" opens inline `CommentForm` with `parentId` preset.

**`CommentForm`**
- Textarea (max 2000 chars shown via counter) + optional image upload (accept `image/*`, single file).
- If user not authenticated: renders banner "Zaloguj się lub zarejestruj, aby dodać komentarz" with links to `/auth/login` and `/register`.
- On submit: calls `addComment`, on success invalidates `['blog-comments', slug]`.

**`ReactionPicker`**
- Shown on hover over reaction count area below comment.
- 6 emoji buttons: ❤️ 😂 😮 😢 😡 👍.
- Current user's active reaction is highlighted.
- Clicking calls `reactToComment`; invalidates `['blog-comments', slug]`.
- Reaction counts grouped by emoji shown inline.

### Admin moderation

**Route addition in `apps/web/src/router.tsx`:**
```tsx
<Route path="/admin/blog/:id/comments" element={<AdminBlogComments />} />
```
(inside existing `AdminLayout` group)

**New page `apps/web/src/pages/admin/AdminBlogComments.tsx`:**
- Lists all comments for a post (including hidden/spam).
- Per-comment controls: Hide/Show toggle, Spam/Unspam toggle, Delete button.

**In `apps/web/src/pages/admin/Blog.tsx`:**
- Add "Komentarze" link per post row → `/admin/blog/:id/comments`.

---

## Notification

New `NotificationType` enum value: `BLOG_COMMENT_REPLY` (consistent with existing `JOURNAL_COMMENT` pattern).

Message format:
> `[Imię] odpowiedział(a) na Twój komentarz w artykule „[tytuł]"`

Notification created only when:
- Comment has a `parentId` (is a reply)
- Reply author differs from parent comment author

---

## Access Control Summary

| Action | Guest | User | Admin |
|--------|-------|------|-------|
| View comments | ✅ | ✅ | ✅ |
| View hidden comment content | ❌ | ❌ | ✅ (via admin page) |
| Post comment | ❌ | ✅ | ✅ |
| Delete own comment | ❌ | ✅ | ✅ |
| Delete any comment | ❌ | ❌ | ✅ |
| React | ❌ | ✅ | ✅ |
| Moderate (hide/spam) | ❌ | ❌ | ✅ |

---

## Out of Scope

- Email notifications (only in-app)
- Comment editing after posting
- Reactions on reactions
- Comment pagination (load all at once; acceptable for blog scale)
- Real-time comment updates via Socket.IO
