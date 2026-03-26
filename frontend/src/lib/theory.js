// src/lib/theory.js
// Supports: WAEC, NECO, BECE (theory_questions table)
//           NABTEB           (nabteb_questions table — separate table)

import { supabase } from './supabase'

// ── Which table to query ──────────────────────────────────────────────
function tableFor(examType) {
  return examType === 'NABTEB' ? 'nabteb_questions' : 'theory_questions'
}

// ── Theory questions (WAEC / NECO / BECE) ────────────────────────────
export async function getTheoryQuestions({ examType, topic, year, limit = 50, offset = 0 }) {
  // NABTEB lives in its own table
  if (examType === 'NABTEB') {
    return getNabtebQuestions({ topic, year, limit, offset })
  }

  let query = supabase
    .from('theory_questions')
    .select('id, exam_type, year, subject, topic, question_no, question_text, image_url, has_image, answer_images, created_at')
    .order('year',        { ascending: false })
    .order('question_no', { ascending: true  })
    .range(offset, offset + limit - 1)

  if (examType && examType !== 'All') query = query.eq('exam_type', examType)
  if (topic)                          query = query.ilike('topic', `%${topic}%`)
  if (year)                           query = query.eq('year', year)

  const { data, error } = await query
  return { data: data || [], error }
}

// ── NABTEB questions (separate table) ────────────────────────────────
export async function getNabtebQuestions({ topic, year, limit = 50, offset = 0 }) {
  let query = supabase
    .from('nabteb_questions')
    .select('id, exam_type, year, subject, topic, question_no, question_text, created_at')
    .order('year',        { ascending: false })
    .order('question_no', { ascending: true  })
    .range(offset, offset + limit - 1)

  if (topic) query = query.ilike('topic', `%${topic}%`)
  if (year)  query = query.eq('year', year)

  const { data, error } = await query
  // Normalise shape so QuestionCard works the same way
  const normalised = (data || []).map(q => ({
    ...q,
    image_url:     null,
    has_image:     false,
    answer_images: [],
  }))
  return { data: normalised, error }
}

// ── Count (for pagination) ────────────────────────────────────────────
export async function getTheoryCount({ examType, topic, year }) {
  const table = tableFor(examType === 'All' ? 'theory_questions' : examType)

  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (examType && examType !== 'All' && examType !== 'NABTEB')
    query = query.eq('exam_type', examType)
  if (topic) query = query.ilike('topic', `%${topic}%`)
  if (year)  query = query.eq('year', year)

  const { count } = await query
  return count || 0
}

// ── Marking scheme (AI only — never shown to student) ────────────────
export async function getMarkingScheme(questionId, examType) {
  const table = examType === 'NABTEB' ? 'nabteb_questions' : 'theory_questions'
  const { data } = await supabase
    .from(table)
    .select('marking_scheme')
    .eq('id', questionId)
    .single()
  return data?.marking_scheme || null
}

// ── Topics dropdown ───────────────────────────────────────────────────
export async function getTheoryTopics(examType) {
  const table = tableFor(examType)

  let query = supabase
    .from(table)
    .select('topic')
    .not('topic', 'is', null)

  if (examType && examType !== 'All' && examType !== 'NABTEB')
    query = query.eq('exam_type', examType)

  const { data } = await query
  return [...new Set((data || []).map(r => r.topic).filter(Boolean))].sort()
}

// ── Years dropdown ────────────────────────────────────────────────────
export async function getTheoryYears(examType) {
  const table = tableFor(examType)

  let query = supabase
    .from(table)
    .select('year')
    .not('year', 'is', null)

  if (examType && examType !== 'All' && examType !== 'NABTEB')
    query = query.eq('exam_type', examType)

  const { data } = await query
  return [...new Set((data || []).map(r => r.year).filter(Boolean))].sort((a, b) => b - a)
}

// ── Stats (for dashboard counts) ─────────────────────────────────────
export async function getTheoryStats() {
  const results = {}

  // WAEC, NECO, BECE — all in theory_questions
  await Promise.all(['WAEC', 'NECO', 'BECE'].map(async (exam) => {
    const { count: total } = await supabase
      .from('theory_questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_type', exam)

    const { data: yearData } = await supabase
      .from('theory_questions')
      .select('year')
      .eq('exam_type', exam)
      .not('year', 'is', null)

    const years = new Set((yearData || []).map(r => r.year)).size
    if (total > 0) results[exam] = { total, years }
  }))

  // NABTEB — separate table
  const { count: nabtebTotal } = await supabase
    .from('nabteb_questions')
    .select('*', { count: 'exact', head: true })

  const { data: nabtebYears } = await supabase
    .from('nabteb_questions')
    .select('year')
    .not('year', 'is', null)

  const nabtebYearCount = new Set((nabtebYears || []).map(r => r.year)).size
  if (nabtebTotal > 0) results['NABTEB'] = { total: nabtebTotal, years: nabtebYearCount }

  return results
}