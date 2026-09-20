// The first-checkpoint test questions for the teacher-voice runner.
// Sources: Q1, Q2, Q4, Q8 are taken verbatim from AC1 in
// docs/teacher-voice-requirements.md. NO_SELF is the open-doctrine question
// this task asks for (should send the teacher to the books). The two
// NOT_IT_YET questions are newly invented for this task, per the owner's
// binding approval note 6: cases where the honest answer is "no, that isn't
// it yet" — a blissful thought-free calm, and a blank/spaced-out state.

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
]
