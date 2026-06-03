import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    /** Порог видимости (0-1). По умолчанию 0.15 */
    threshold?: number;
    /** Отступ от viewport. По умолчанию '0px' */
    rootMargin?: string;
    /** Если true — срабатывает только один раз */
    once?: boolean;
}

/**
 * Хук для отслеживания, виден ли элемент в viewport.
 * Используется для scroll-triggered анимаций.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
    options: UseInViewOptions = {}
) {
    const { threshold = 0.15, rootMargin = '0px', once = true } = options;
    const ref = useRef<T>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    if (once) {
                        observer.unobserve(element);
                    }
                } else if (!once) {
                    setIsInView(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return { ref, isInView };
}
