// filepath: packages/shared/src/schemas/blog.schema.ts
import { z } from 'zod';
export const createBlogPostSchema = z.object({
    title: z.string().min(5, 'Tytuł musi mieć co najmniej 5 znaków'),
    content: z.string().min(1, 'Treść jest wymagana'),
    excerpt: z.string().min(10, 'Zajawka jest za krótka'),
    tags: z.array(z.string()).optional(),
    isPublished: z.boolean().default(false),
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(160).optional(),
    readingTime: z.number().int().positive().optional(),
});
export const updateBlogPostSchema = createBlogPostSchema.partial();
