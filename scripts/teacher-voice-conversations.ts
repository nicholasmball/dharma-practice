// Multi-turn scripted conversations for the teacher-voice test runner.
// Every practitioner message is invented for this task — nothing here is
// taken or adapted from the private archive or the real database.
//
// The runner sends the FULL conversation so far on every turn, with the
// invented background attached on every turn (matching how the app now
// sends it — see src/app/(app)/teacher/page.tsx and
// src/app/api/chat/route.ts after this task's changes), and appends each
// model's own real reply as the assistant turn before the next user message
// — a genuine back-and-forth, not a scripted assistant.

export interface ScriptedConversation {
  id: string
  label: string
  /** The invented practitioner messages, in order. The model's replies are inserted between them at run time. */
  userTurns: string[]
}

export const SCRIPTED_CONVERSATIONS: ScriptedConversation[] = [
  {
    id: 'mind_wont_settle_followups',
    label: 'Q1 mind won\'t settle + 2 follow-ups',
    userTurns: [
      "My mind just won't settle when I sit. What am I doing wrong?",
      "Ok I tried noticing that today, but it still felt pretty scattered the whole time.",
      "Is that normal, or does something actually need to change?",
    ],
  },
  {
    id: 'bliss_rigpa_followups',
    label: 'blissful calm "was that rigpa?" + 2 follow-ups (incl. "so I\'ve got nowhere then?")',
    userTurns: [
      "In my sit yesterday everything went blissfully quiet and thought-free for a good ten minutes. It felt incredible - was that rigpa?",
      "Oh. I was pretty sure that was it, to be honest.",
      "So I've got nowhere then?",
    ],
  },
  {
    id: 'where_am_i_followup',
    label: 'Q4 where am I on the path + push for more detail',
    userTurns: [
      'Be honest with me — where would you say I am on the path?',
      "No, really — give me more detail, I can handle it.",
    ],
  },
  {
    id: 'six_turn_checkin',
    label: 'Six-turn practice check-in (voice-fade / repetition watch)',
    userTurns: [
      'Hi, I wanted to check in about how things are going with my practice.',
      "It's been a mixed week — work stress mostly.",
      'Yeah, the sits felt shorter and more scattered than usual.',
      "Today's sit was better though, I felt more settled than I have in a while.",
      'Do you think I should push for longer sits, or keep it short while things are busy?',
      "Thanks, that's helpful. One more thing — what should I focus on tomorrow?",
    ],
  },

  // ---- Pushback set (21 Sep 2026) ----------------------------------------
  //
  // The owner found a live Deep follow-up "still has a Claude feel" in a
  // conversation where he had corrected the teacher: the reply conceded and
  // praised the correction, lectured in clipped lines, signposted, and closed
  // on an abstract puzzle instead of asking about his experience. The earlier
  // sets almost never had the practitioner push back, so these do. All
  // invented; deliberately different topics from the owner's conversation.
  {
    id: 'pushback_precise_correction',
    label: 'Pushback — practitioner corrects the teacher\'s framing',
    userTurns: [
      "When I look for the one who is aware, I can't find anyone. Does that mean awareness stops?",
      "No, that's not what I meant. Awareness didn't stop at all. It was the watcher that wasn't there.",
      "So what do I do with that next time I sit?",
    ],
  },
  {
    id: 'pushback_disagree',
    label: 'Pushback — practitioner disagrees with the advice',
    userTurns: [
      'Should I be labelling thoughts as "thinking" when they come up?',
      "I'm not sure I agree. Labelling feels like adding another layer of thought on top of the thought.",
      'Hm. I still think I would rather just let them go without naming them.',
    ],
  },
  {
    id: 'pushback_too_conceptual',
    label: 'Pushback — "that\'s too conceptual"',
    userTurns: [
      'What is the difference between rigpa and ordinary mind?',
      "That's all a bit conceptual for me. I'm asking what it's actually like.",
    ],
  },
  {
    id: 'pushback_sharp_insight',
    label: 'Pushback — practitioner sharpens the teacher\'s point',
    userTurns: [
      'Today I noticed the sound of the rain and the hearing of it seemed to be the same thing.',
      "Not quite that the hearer vanished, like you said. There was hearing, but no one standing behind it doing the hearing.",
    ],
  },
]
