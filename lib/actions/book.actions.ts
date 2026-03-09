'use server'

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"

import BookSegment from "@/database/models/book-segment.model"
import Book from "@/database/models/book.model"
import { connectDB } from "@/database/mongoose"
import { escapeRegex, generateSlug, serializeData } from "@/lib/utils"
import { CreateBook, TextSegment } from "@/types"

export const getAllBooks = async (search?: string) => {
    try {
        await connectDB()

        let query = {}

        if (search) {
            const escapedSearch = escapeRegex(search)
            const regex = new RegExp(escapedSearch, 'i')
            query = {
                $or: [
                    { title: { $regex: regex } },
                    { author: { $regex: regex } }
                ]
            }
        }

        const books = await Book.find(query).sort({ createdAt: -1 }).lean()

        return {
            success: true,
            data: serializeData(books)
        }
    } catch (error) {
        console.error('Error connecting to database', error)
        return {
            success: false, error: error
        }
    }
}

export const checkBookExists = async (title: string) => {
    try {
        await connectDB()

        const slug = generateSlug(title)

        const existingBook = await Book.findOne({ slug }).lean()

        if (existingBook) {
            return {
                exists: true,
                book: serializeData(existingBook)
            }
        }
        return {
            exists: false
        }
    } catch (e) {
        console.error('Error checking book exists', e);
        return {
            exists: false,
            error: e
        }
    }
}

export const createBook = async (data: CreateBook) => {
    try {
        await connectDB()

        const slug = generateSlug(data.title)

        const existingBook = await Book.findOne({ slug }).lean()

        if (existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        // const { userId } = await auth()

        // if (!userId || userId !== data.clerkId) {
        //     return {
        //         success: false,
        //         error: 'Unauthorized'
        //     }
        // }

        // const plan = await getUserPlan()
        // const limits = PLAN_LIMITS[plan]

        // const bookCount = await Book.countDocuments({ clerkId: userId })

        // if (bookCount >= limits.maxBooks) {
        //     revalidatePath('/')
        //     return {
        //         success: false,
        //         error: `You have reached the maximum number of books allowed for your ${plan} plan (${limits.maxBooks}). Please upgrade to add more books.`,
        //         isBillingError: true,
        //     }
        // }

        const book = await Book.create({
            ...data,
            slug,
            totalSegments: 0
        })

        revalidatePath('/')

        return {
            success: true,
            data: serializeData(book),
        }
    } catch (e) {
        console.error('Error creating a book', e);

        return {
            success: false,
            error: e,
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try {
        await connectDB()

        const book = await Book.findOne({ slug }).lean()

        if (!book) {
            return { success: false, error: 'Book not found' };
        }

        return {
            success: true,
            data: serializeData(book)
        }

    } catch (e) {
        console.error('Error fetching book by slug', e)
        return {
            success: false, error: e
        }
    }
}

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try {
        await connectDB()

        console.log('Saving book segments...')

        const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        }))

        await BookSegment.insertMany(segmentsToInsert)

        await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length })

        console.log('Book segments saved successfully.')

        return {
            success: true,
            data: { segmentsCreated: segments.length }
        }
    } catch (e) {
        console.error('Error saving book segments', e);
        await BookSegment.deleteMany({ bookId })
        await Book.findByIdAndDelete(bookId)

        console.log('Deleted book segments and book due to failure to save segments');
        return {
            success: false,
            error: e
        }
    }
}

// Searches book segments using MongoDB text search with regex fallback
export const searchBookSegments = async (bookId: string, query: string, limit: number = 5) => {
    try {
        await connectDB()

        console.log(`Searching for: "${query}" in book ${bookId}`)

        const bookObjId = new Types.ObjectId(bookId)

        // Try MongoDB text search first (requires text index)
        let segments: Record<string, unknown>[] = []

        try {
            segments = await BookSegment
                .find({
                    bookId: bookObjId,
                    $text: { $search: query }
                })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .lean()
        } catch (error) {
            segments = []
        }

        // Fallback: regex search matching ANY keyword
        if (segments.length === 0) {
            const keywords = query.split(/\s+/).filter((k) => k.length > 2)
            const pattern = keywords.map(escapeRegex).join('|')

            if (keywords.length === 0) {
                return {
                    success: true,
                    data: []
                }
            }

            segments = await BookSegment
                .find({
                    bookId: bookObjId,
                    content: { $regex: pattern, $options: 'i' }
                })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ segmentIndex: 1 })
                .limit(limit)
                .lean()
        }
        console.log(`Search complete. Found ${segments.length} results`)

        return {
            success: true,
            data: serializeData(segments),
        }
    } catch (error) {
        console.error('Error searching segments:', error);
        return {
            success: false,
            error: (error as Error).message,
            data: [],
        }
    }
}