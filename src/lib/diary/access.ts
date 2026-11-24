// Who sees the Diary. Balla Bot only knows one person's calendar, so the tab
// is limited to the emails in DIARY_USER_EMAILS (comma list, compared trimmed
// and lower-cased, like AUTH_ALLOWED_EMAILS). Empty or unset means nobody.
export function isDiaryUser(
  email: string | null | undefined,
  listEnv: string | undefined = process.env.DIARY_USER_EMAILS
): boolean {
  if (!email || !listEnv) return false
  const wanted = email.trim().toLowerCase()
  return listEnv
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry.length > 0 && entry === wanted)
}
