import axios from 'axios'
import { API_BASE_URL, supabase } from '../lib/supabase'

export const API_BASE = API_BASE_URL
const API = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})

// ── Automatically attach the logged-in user's token to every request ─
API.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // Don't block the request if session check fails
  }
  return config
})

// ── If the server says "not logged in", sign out and go to login page ─
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
// ── SOLVE ──────────────────────────────────────
export const solveExpression = (expression, mode = 'solve') =>
  API.post('/solve/', { expression, mode })
export const explainSolution = (expression, result) =>
  API.post('/solve/explain', { expression, result })
export const solveFromImage = (image_base64, image_type, extra_instruction = null) =>
  API.post('/solve/image', { image_base64, image_type, extra_instruction })
// ── TEACH ──────────────────────────────────────
export const askTutor = (question, topic, level, conversation_history = [], user_id = null) =>
  API.post('/teach/ask', { question, topic, level, conversation_history, user_id })
export const getTopicOverview = (topic, level) =>
  API.post('/teach/overview', { topic, level })
export const getTopics = () =>
  API.get('/teach/topics')
export const generateQuestion = (topic, level, difficulty, questionNumber, previousQuestions = [], examContext = '') =>
  API.post('/solve/practice/question', {
    topic, level, difficulty,
    question_number:    questionNumber,
    previous_questions: previousQuestions,
    exam_context:       examContext,
  })
export const gradeAnswer = (topic, question, correctAnswer, studentAnswer) =>
  API.post('/solve/practice/grade', {
    topic, question, correct_answer: correctAnswer, student_answer: studentAnswer
  })
export const askExamQuestion = (question, examType, year, topic) =>
  API.post('/exams/ask', { question, exam_type: examType, year, topic })
export const listExamPapers = () =>
  API.get('/exams/papers')
export const ingestExamPaper = (pdfBase64, title, examType, year) =>
  API.post('/exams/ingest', {
    pdf_base64: pdfBase64,
    title,
    exam_type: examType,
    year,
  })
export const parseQuestions = (markdownContent, examType, year) =>
  API.post('/cbt/parse', { markdown_content: markdownContent, exam_type: examType, year })
export const explainCBTAnswer = (question) =>
  API.post('/cbt/explain', question)
export const generateCBTReport = (questions, score, total, timeSecs, examType, topic) =>
  API.post('/cbt/report-summary', {
    questions, score, total,
    time_taken_secs: timeSecs,
    exam_type: examType,
    topic,
  })
// ── TRACKING ───────────────────────────────────────────────
export const getUserProfile = (userId) =>
  API.get(`/tracking/profile/${userId}`)
export const updateUserProfile = (userId, data) =>
  API.put(`/tracking/profile/${userId}`, data)
export const getOverallStats = (userId) =>
  API.get(`/tracking/stats/${userId}`)
export const getTopicPerformance = (userId) =>
  API.get(`/tracking/topics/${userId}`)
// ── DAILY CHALLENGE & MCQ ───────────────────────────────
export const getDailyChallenge = (examType = 'JAMB') =>
  API.get('/cbt/daily-challenge', { params: { exam_type: examType } })
export const generateMCQ = (topic, difficulty = 'medium', level = 'secondary') =>
  API.post('/cbt/generate-mcq', { topic, difficulty, level })

// ── PRACTICE LEARNING QUALITY ──────────────────────────────────
export const getWorkedExample = (topic, level, difficulty) =>
  API.post('/solve/practice/worked-example', { topic, level, difficulty })

export const getRetryQuestion = (topic, level, originalQuestion, studentWrongAnswer) =>
  API.post('/solve/practice/retry-question', {
    topic, level,
    original_question:    originalQuestion,
    student_wrong_answer: studentWrongAnswer,
  })

// ── SOCIAL v2 ──────────────────────────────────────────────────────────────
export const generateBattleQuestions = (topic, level, difficulty) =>
  API.post('/solve/battle/questions', { topic, level, difficulty })

export const gradeBattleAnswer = (topic, question, correctAnswer, studentAnswer) =>
  API.post('/solve/battle/grade', { topic, question, correct_answer: correctAnswer, student_answer: studentAnswer })

export const reviewStudentQuestion = (topic, level, questionText, answerText, hint = '') =>
  API.post('/solve/question-bank/review', { topic, level, question_text: questionText, answer_text: answerText, hint })

// ── TEACHER/PARENT TOOLS ───────────────────────────────────────────────────
export const downloadProgressReport = async (payload) => {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}/solve/report/pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Report generation failed')
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `MathGenius_Report_${(payload.student_name || 'Student').replace(/ /g,'_')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PAST QUESTIONS ──────────────────────────────────────────────────
export const searchPastQuestions = (filters) =>
  API.post('/past-questions/search', filters)

export const getPastQuestion = (id) =>
  API.get(`/past-questions/${id}`)

export const getPastQuestionTopics = () =>
  API.get('/past-questions/topics')

export const getPastQuestionMeta = () =>
  API.get('/past-questions/meta')

export const getRandomPastQuestion = (params = {}) =>
  API.get('/past-questions/random/one', { params })

// ── STUDY PLAN ──────────────────────────────────────────────────────
export const getStudyPlan = (userId) =>
  API.get(`/study-plan/${userId}`)

export const generateStudyPlan = (userId, examTarget, examDate, daysUntil) =>
  API.post('/study-plan/generate', {
    user_id:     userId,
    exam_target: examTarget,
    exam_date:   examDate   || null,
    days_until:  daysUntil  || null,
  }, { responseType: 'stream' })

// Fetch weak topics directly from Supabase (bypasses backend)
export const getTopicProgress = (userId) =>
  supabase
    .from('topic_progress')
    .select('topic, mastery_level, avg_score, sessions_done')
    .eq('user_id', userId)
    .order('avg_score', { ascending: true })

// ── TESTIMONIALS ─────────────────────────────────────────────────────────────
/** Fetch publicly visible (approved) testimonials for the landing page */
export const getApprovedTestimonials = () =>
  supabase
    .from('testimonials')
    .select('id, full_name, school, rating, body, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(6)
