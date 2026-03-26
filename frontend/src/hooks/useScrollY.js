import { useEffect, useState } from 'react'

export function useScrollY() {
    const [y, setY] = useState(0)
    useEffect(() => {
        const handler = () => setY(window.scrollY)
        window.addEventListener('scroll', handler, { passive: true })
        return () => window.removeEventListener('scroll', handler)
    }, [])
    return y
}
