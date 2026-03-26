import { useEffect, useRef } from 'react'

export function useReveal() {
    const ref = useRef(null)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) el.classList.add('reveal') },
            { threshold: 0.15 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])
    return ref
}
