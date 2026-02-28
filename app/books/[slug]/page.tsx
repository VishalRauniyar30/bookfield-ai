import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

const BookPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    const { slug } = await params



    return (
        <div>BookPage</div>
    )
}

export default BookPage