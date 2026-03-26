const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function testFetch() {
    const examType = 'WAEC'
    const topics = null
    const difficulty = 'mixed'
    const year = null
    const count = 20

    let query = supabase
        .from('exam_questions')
        .select('*')

    if (examType && examType !== 'Mixed') query = query.eq('exam_type', examType)

    if (difficulty && difficulty !== 'mixed') query = query.eq('difficulty', difficulty)
    if (year) query = query.eq('year', year)

    query = query
        .not('option_a', 'is', null)
        .not('option_b', 'is', null)
        .not('option_c', 'is', null)
        .not('option_d', 'is', null)

    const { data, error } = await query
    console.log("Error:", error)
    console.log("Data length:", data?.length)
}

testFetch()
