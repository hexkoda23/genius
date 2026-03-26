const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ipqyewihbhdbcfscfosw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcXlld2loYmhkYmNmc2Nmb3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjYzMjIsImV4cCI6MjA4OTg0MjMyMn0.7YdTbKAzKTaAgvYIr2kTHAsDsK6WzJ-yd2JjIoglcPU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- Database Image Audit ---');

    try {
        const { count: totalTotal, error: err1 } = await supabase
            .from('exam_questions')
            .select('*', { count: 'exact', head: true });

        if (err1) throw err1;
        console.log('Total questions in DB:', totalTotal);

        const { count: countWithImage, error: err2 } = await supabase
            .from('exam_questions')
            .select('*', { count: 'exact', head: true })
            .not('image_url', 'is', null);

        if (err2) throw err2;
        console.log('Questions WITH image_url:', countWithImage);

        if (countWithImage > 0) {
            const { data, error: err3 } = await supabase
                .from('exam_questions')
                .select('id, question_text, image_url')
                .not('image_url', 'is', null)
                .limit(5);

            if (err3) throw err3;
            console.log('\nSample questions with images:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('\n❌ RESULT: All questions in your database have NULL as the image_url.');
        }
    } catch (e) {
        console.error('Audit failed:', e.message);
    }
}

checkData();
