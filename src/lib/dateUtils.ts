// Get date range (yesterday + today + next 5 days)
export function getDateRange(): Date[] {
  // Get current date in Turkish timezone
  const now = new Date()
  const turkishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
  const today = new Date(turkishTime.getFullYear(), turkishTime.getMonth(), turkishTime.getDate())
  const dates = []
  
  // Yesterday
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  dates.push(yesterday)
  
  // Today
  dates.push(today)
  
  // Next 5 days
  for (let i = 1; i <= 5; i++) {
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + i)
    dates.push(futureDate)
  }
  
  return dates
}

// Format date to Turkish (e.g., "4 Temmuz Cuma")
export function formatDateTurkish(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long'
  })
}

// Format date to YYYY-MM-DD for database queries
export function formatDateForDB(date: Date): string {
  // Convert to Turkish timezone and format as YYYY-MM-DD
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
}

// Check if date is today
export function isToday(date: Date): boolean {
  const now = new Date()
  const turkishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
  const today = new Date(turkishTime.getFullYear(), turkishTime.getMonth(), turkishTime.getDate())
  return date.toDateString() === today.toDateString()
}

// Check if date is yesterday
export function isYesterday(date: Date): boolean {
  const now = new Date()
  const turkishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
  const yesterday = new Date(turkishTime.getFullYear(), turkishTime.getMonth(), turkishTime.getDate())
  yesterday.setDate(yesterday.getDate() - 1)
  return date.toDateString() === yesterday.toDateString()
}

// Get short day name (e.g., "Cuma")
export function getShortDayName(date: Date): string {
  return date.toLocaleDateString('tr-TR', { weekday: 'long' })
}

// Get day number (e.g., "4")
export function getDayNumber(date: Date): string {
  return date.getDate().toString()
} 