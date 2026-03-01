export function cn(...inputs) {
    return inputs
        .flatMap(input => {
            if (!input) return [];
            if (typeof input === 'string') return [input];
            if (Array.isArray(input)) return input.map(cn);
            if (typeof input === 'object') {
                return Object.entries(input)
                    .filter(([_, value]) => Boolean(value))
                    .map(([key, _]) => key);
            }
            return [];
        })
        .join(' ');
}
