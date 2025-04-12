import { Predicate } from './types'

export const partition = <T>(arr: T[], predicate: Predicate<T>) => {
  const left: T[] = []
  const right: T[] = []
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i]
    ;(predicate(t) ? left : right).push(t)
  }
  return [left, right]
}
