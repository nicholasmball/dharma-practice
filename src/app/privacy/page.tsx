export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '32px' }}>
        Privacy Policy
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--foreground)' }}>
        <p style={{ color: 'var(--muted)' }}>
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>Overview</h2>
          <p style={{ lineHeight: 1.7 }}>
            Dharma Practice is a meditation tracking app. We respect your privacy and are committed to protecting your personal data. This policy explains what information we collect and how we use it.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>Data We Collect</h2>
          <ul style={{ lineHeight: 1.7, paddingLeft: '20px', listStyleType: 'disc' }}>
            <li><strong>Account information:</strong> Email address and password (encrypted)</li>
            <li><strong>Meditation sessions:</strong> Duration, practice type, date, and any notes you add</li>
            <li><strong>Journal entries:</strong> Your written reflections and tags</li>
            <li><strong>Conversations:</strong> Messages with the AI meditation teacher</li>
            <li><strong>Settings:</strong> Your app preferences (reminders, defaults)</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>How We Use Your Data</h2>
          <p style={{ lineHeight: 1.7 }}>
            Your data is used solely to provide the app's functionality: tracking your meditation practice, displaying statistics, and personalizing your experience. We do not use your data for advertising or marketing purposes.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>Data Storage</h2>
          <p style={{ lineHeight: 1.7 }}>
            Your data is stored securely using Supabase, a trusted database platform with enterprise-grade security. All data is encrypted in transit and at rest. Your password is hashed and never stored in plain text.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>Data Sharing</h2>
          <p style={{ lineHeight: 1.7 }}>
            We do not sell, trade, or share your personal data with third parties. Your meditation practice data is private and belongs to you.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>AI Teacher</h2>
          <p style={{ lineHeight: 1.7 }}>
            Conversations with the AI meditation teacher are processed using Anthropic's Claude API. Your practice history may be shared with the AI to provide personalized guidance. Anthropic does not use this data to train their models.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>Your Rights</h2>
          <ul style={{ lineHeight: 1.7, paddingLeft: '20px', listStyleType: 'disc' }}>
            <li><strong>Export:</strong> Download all your data from Settings</li>
            <li><strong>Delete:</strong> Permanently delete your account and all data from Settings</li>
            <li><strong>Access:</strong> View all your data within the app</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '12px' }}>Contact</h2>
          <p style={{ lineHeight: 1.7 }}>
            For privacy-related questions, contact us at:{' '}
            <a href="mailto:privacy@buddha-balla.com" style={{ color: 'var(--accent)' }}>
              privacy@buddha-balla.com
            </a>
          </p>
        </section>

        <section style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            This privacy policy may be updated occasionally. Continued use of the app after changes constitutes acceptance of the updated policy.
          </p>
        </section>
      </div>
    </main>
  )
}
