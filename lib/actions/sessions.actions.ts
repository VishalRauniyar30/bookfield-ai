'use server'


import VoiceSession from "@/database/models/voice-session.model"
import { connectDB } from "@/database/mongoose"
import { getCurrentBillingPeriodStart, PLAN_LIMITS } from "@/lib/subscription-constants"
import { EndSessionResult, StartSessionResult } from "@/types"

export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
    try {
        await connectDB()

        // Limits/Plan to see whether a session is allowed.
        // const plan = await getUserPlan()
        // const limits = PLAN_LIMITS[plan]
        // const billingPeriodStart = getCurrentBillingPeriodStart()

        // const sessionCount = await VoiceSession.countDocuments({
        //     clerkId,
        //     billingPeriodStart
        // })

        // if (sessionCount >= limits.maxDurationPerSession) {
        //     revalidatePath('/')

        //     return {
        //         success: false,
        //         error: `You have reached the monthly session limit for your ${plan} plan (${limits.maxSessionsPerMonth}). Please upgrade for more sessions.`,
        //         isBillingError: true,
        //     }
        // }
        const billingPeriodStart = getCurrentBillingPeriodStart()

        const session = await VoiceSession.findOneAndUpdate(
            { clerkId, billingPeriodStart },
            {
                $setOnInsert: {
                    clerkId,
                    bookId,
                    startedAt: new Date(),
                    billingPeriodStart,
                    durationSeconds: 0,
                }
            },
            { upsert: true, new: true }
        )

        return {
            success: true,
            sessionId: session._id.toString(),
        }

    } catch (e) {
        console.error('Error starting voice session', e)
        return { success: false, error: 'Failed to start voice session. Please try again later.' }
    }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {
    try {
        await connectDB()

        const result = await VoiceSession.findByIdAndUpdate(sessionId, {
            endedAt: new Date(),
            durationSeconds
        })

        if (!result) {
            return {
                success: false,
                error: 'Voice session not found'
            }
        }
        return {
            success: true
        }
    } catch (e) {
        console.error('Error ending voice session', e)
        return { success: false, error: 'Failed to end voice session. Please try again later.' }
    }
}