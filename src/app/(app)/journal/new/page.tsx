import JournalForm from '../JournalForm'

export default function NewJournalEntryPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '32px' }}>
        New Journal Entry
      </h1>
      <JournalForm />
    </div>
  )
}
