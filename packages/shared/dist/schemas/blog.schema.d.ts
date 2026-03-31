import { z } from 'zod';
export declare const createBlogPostSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    excerpt: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isPublished: z.ZodDefault<z.ZodBoolean>;
    metaTitle: z.ZodOptional<z.ZodString>;
    metaDescription: z.ZodOptional<z.ZodString>;
    readingTime: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    excerpt: string;
    isPublished: boolean;
    tags?: string[] | undefined;
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
    readingTime?: number | undefined;
}, {
    title: string;
    content: string;
    excerpt: string;
    tags?: string[] | undefined;
    isPublished?: boolean | undefined;
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
    readingTime?: number | undefined;
}>;
export declare const updateBlogPostSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    excerpt: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    isPublished: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    metaTitle: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    metaDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    readingTime: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    excerpt?: string | undefined;
    tags?: string[] | undefined;
    isPublished?: boolean | undefined;
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
    readingTime?: number | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    excerpt?: string | undefined;
    tags?: string[] | undefined;
    isPublished?: boolean | undefined;
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
    readingTime?: number | undefined;
}>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
