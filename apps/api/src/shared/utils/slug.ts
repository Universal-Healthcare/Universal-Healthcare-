export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function generateUniqueSlug(
  displayName: string,
  findBySlug: (slug: string) => Promise<unknown>
): Promise<string> {
  const base = toSlug(displayName)
  let candidate = base
  let suffix = 2

  while (await findBySlug(candidate)) {
    candidate = `${base}-${suffix}`
    suffix++
  }

  return candidate
}
