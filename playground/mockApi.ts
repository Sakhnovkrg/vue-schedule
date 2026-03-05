export interface ApiWorkingRange {
  id: number
  doctor_id: number
  work_date: string
  start_time: string
  end_time: string
}

let nextId = 1
const store: ApiWorkingRange[] = []

const DELAY = { min: 100, max: 500 }

function delay(): Promise<void> {
  const ms = DELAY.min + Math.random() * (DELAY.max - DELAY.min)
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isSunday(workDate: string): boolean {
  return new Date(workDate + 'T00:00:00').getDay() === 0
}

export async function getRanges(
  doctorId: number,
  filterDate?: string
): Promise<ApiWorkingRange[]> {
  await delay()
  let result = store.filter(r => r.doctor_id === doctorId)
  if (filterDate) {
    result = result.filter(r => r.work_date === filterDate)
  }
  return result
}

export async function getRangesForWeek(
  doctorId: number,
  dates: string[]
): Promise<ApiWorkingRange[]> {
  await delay()
  const dateSet = new Set(dates)
  return store.filter(r => r.doctor_id === doctorId && dateSet.has(r.work_date))
}

export async function createRanges(
  ranges: Omit<ApiWorkingRange, 'id'>[]
): Promise<ApiWorkingRange[]> {
  await delay()
  if (ranges.some(r => isSunday(r.work_date))) {
    throw new Error('Sunday is a day off!')
  }
  const created: ApiWorkingRange[] = []
  for (const r of ranges) {
    const item: ApiWorkingRange = { ...r, id: nextId++ }
    store.push(item)
    created.push(item)
  }
  return created
}

export async function createRange(
  range: Omit<ApiWorkingRange, 'id'>
): Promise<ApiWorkingRange> {
  const [created] = await createRanges([range])
  return created
}

export async function updateRange(
  id: number,
  data: Partial<Omit<ApiWorkingRange, 'id'>>
): Promise<ApiWorkingRange | null> {
  await delay()
  if (data.work_date && isSunday(data.work_date)) {
    throw new Error('Sunday is a day off!')
  }
  const idx = store.findIndex(r => r.id === id)
  if (idx < 0) return null
  store[idx] = { ...store[idx], ...data }
  return store[idx]
}

export async function deleteRange(id: number): Promise<boolean> {
  await delay()
  const idx = store.findIndex(r => r.id === id)
  if (idx < 0) return false
  store.splice(idx, 1)
  return true
}

export async function deleteRanges(ids: number[]): Promise<number> {
  await delay()
  let deleted = 0
  for (const id of ids) {
    const idx = store.findIndex(r => r.id === id)
    if (idx >= 0) {
      store.splice(idx, 1)
      deleted++
    }
  }
  return deleted
}
