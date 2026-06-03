import { useEffect, useState } from 'react';

/**
 * Хук для анимации числа от 0 до target.
 * Запускается когда trigger = true (обычно при скролле в viewport).
 */
export function useCountUp(target: number, trigger: boolean, duration = 1500): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        let start: number | null = null;
        let rafId: number;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            // easeOutCubic для плавного замедления
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));

            if (progress < 1) {
                rafId = requestAnimationFrame(step);
            }
        };

        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, [trigger, target, duration]);

    return count;
}
