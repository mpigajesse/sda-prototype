import { useState } from 'react'

function readFromStorage<T>(key: string, initialValue: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return initialValue
    return JSON.parse(raw) as T
  } catch {
    return initialValue
  }
}

function writeToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage quota exceeded or private browsing — fail silently
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readFromStorage(key, initialValue)
  )

  const setValue = (value: T): void => {
    setStoredValue(value)
    writeToStorage(key, value)
  }

  return [storedValue, setValue]
}
