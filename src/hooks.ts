import { useEffect, useState } from 'react'
export function useStoredState<T>(key:string, initial:T){const [value,setValue]=useState<T>(()=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):initial}catch{return initial}});useEffect(()=>localStorage.setItem(key,JSON.stringify(value)),[key,value]);return [value,setValue] as const}
