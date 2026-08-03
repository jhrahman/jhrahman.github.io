import { useId, useMemo } from 'react';

interface AvatarProps {
    name: string | null;
    anonymous: boolean;
}

// Cheap deterministic string hash (djb2) - not cryptographic, just needs to
// spread similar names apart and stay stable across renders/sessions.
function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
}

interface Blob {
    cx: number;
    cy: number;
    r: number;
    hue: number;
    opacity: number;
}

interface Identicon {
    hueA: number;
    hueB: number;
    blobs: Blob[];
}

// Derives a small abstract gradient-and-blobs pattern from a name, the same
// way every time - no photo, no gender signal, just a consistent "face" for
// a given commenter. Deliberately not a library dependency: this is ~20
// lines and keeps the bundle and license surface untouched.
function buildIdenticon(seed: string): Identicon {
    const hash = hashString(seed);
    const hueA = hash % 360;
    const hueB = (hueA + 45 + ((hash >> 3) % 90)) % 360;
    const hueOffsets = [0, 200, 130];
    const blobs: Blob[] = hueOffsets.map((offset, i) => {
        const bits = hash >> (i * 6);
        return {
            cx: 12 + (bits % 18),
            cy: 10 + ((bits >> 2) % 20),
            r: 9 + ((bits >> 4) % 9),
            hue: (hueA + offset + (bits % 40)) % 360,
            opacity: 0.5 + ((bits >> 6) % 35) / 100,
        };
    });
    return { hueA, hueB, blobs };
}

const Avatar = ({ name, anonymous }: AvatarProps) => {
    const gradientId = useId();
    // Hooks must run unconditionally, so this is always computed even when
    // the anonymous branch below ends up not using it.
    const { hueA, hueB, blobs } = useMemo(() => buildIdenticon(name ?? ''), [name]);

    // Anonymous, or a name-less/empty comment (tombstones pass null too) -
    // no identity to derive a pattern from, so use a plain icon instead.
    if (anonymous || !name) {
        return (
            <div className="comment-avatar comment-avatar--anonymous" aria-hidden="true">
                <i className="fas fa-user-secret" />
            </div>
        );
    }

    return (
        <div className="comment-avatar" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="100%" height="100%" role="presentation">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={`hsl(${hueA} 70% 55%)`} />
                        <stop offset="100%" stopColor={`hsl(${hueB} 70% 42%)`} />
                    </linearGradient>
                </defs>
                <rect width="40" height="40" fill={`url(#${gradientId})`} />
                {blobs.map((b, i) => (
                    <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={`hsl(${b.hue} 85% 68%)`} opacity={b.opacity} />
                ))}
            </svg>
        </div>
    );
};

export default Avatar;
