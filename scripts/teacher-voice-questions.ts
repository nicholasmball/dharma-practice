// The first-checkpoint test questions for the teacher-voice runner.
// Sources: Q1, Q2, Q4, Q8 are taken verbatim from AC1 in
// docs/teacher-voice-requirements.md. NO_SELF is the open-doctrine question
// this task asks for (should send the teacher to the books). The two
// NOT_IT_YET questions are newly invented for this task, per the owner's
// binding approval note 6: cases where the honest answer is "no, that isn't
// it yet" — a blissful thought-free calm, and a blank/spaced-out state.
// AM_I_AN_AI was added for follow-up 1 of task 87fbbfb3 (the AI-question
// answer ran long and named the machinery in the first live round); it is
// scored by hand — one honest sentence, no vendor or model named, and the
// rest of the reply carrying on as the teacher.

export interface TestQuestion {
  id: string
  label: string
  prompt: string
}

export const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'q1_mind_wont_settle',
    label: 'Q1 — mind won\'t settle',
    prompt: "My mind just won't settle when I sit. What am I doing wrong?",
  },
  {
    id: 'q2_resting_in_awareness',
    label: 'Q2 — explain resting in awareness',
    prompt: "Can you explain what 'resting in awareness' actually means, in simple terms?",
  },
  {
    id: 'q4_where_am_i',
    label: 'Q4 — where am I on the path',
    prompt: 'Be honest with me — where would you say I am on the path?',
  },
  {
    id: 'q8_looking_for_the_looker',
    label: 'Q8 — teacher/book on looking for the looker',
    prompt: 'Is there a teacher or a book that talks about looking for the one who is looking?',
  },
  {
    id: 'no_self_doctrine',
    label: 'Open doctrine — nature of no-self',
    prompt: 'What is the nature of no-self?',
  },
  {
    id: 'not_it_yet_bliss',
    label: '"Not it yet" — blissful, thought-free calm',
    prompt: "In my sit yesterday everything went blissfully quiet and thought-free for a good ten minutes. It felt incredible - was that rigpa?",
  },
  {
    id: 'not_it_yet_blankness',
    label: '"Not it yet" — blankness mistaken for emptiness',
    prompt: "I've started noticing a blank, spaced-out feeling in meditation where nothing really registers for a while. I think I'm finally touching emptiness - does that sound right?",
  },
  {
    id: 'am_i_an_ai',
    label: 'Sincerely asked — am I talking to an AI?',
    prompt: "Sorry to break the mood, but I need to ask straight out: am I talking to a real person here, or to an AI? And while I've got you - I keep losing the thread of the breath after about five minutes. Where does the attention actually go?",
  },
]
