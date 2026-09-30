// Unambiguous 6-character team code generator
// Excludes confusing characters: 0, O, 1, I, l
const CODE_CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateTeamCode(length = 6): string {
  let result = ''
  const charactersLength = CODE_CHARACTERS.length
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength)
    result += CODE_CHARACTERS.charAt(randomIndex)
  }
  return result
}
