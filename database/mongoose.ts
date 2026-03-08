import mongoose from "mongoose"

const MONGODB_URL = process.env.MONGODB_URL

if (!MONGODB_URL) {
    throw new Error('Please define the MONGODB_URI environment variable')
}

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null
        promise: Promise<typeof mongoose> | null
    }
}

let cached = global.mongooseCache || (global.mongooseCache = { conn: null, promise: null })

export const connectDB = async () => {
    if (cached.conn) return cached.conn

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URL, { bufferCommands: false })
    }

    try {
        cached.conn = await cached.promise
    } catch (error) {
        cached.promise = null
        console.error('MongoDB connection error. Please make sure MongoDB is running. ' + error)
        throw error
    }

    console.info('connected to MongoDB')
    return cached.conn
}