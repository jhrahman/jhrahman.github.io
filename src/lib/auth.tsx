import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { verifyToken, type GitHubUser, GitHubApiError } from './github';
import { safeGetItem, safeSetItem, safeRemoveItem } from './storage';

const TOKEN_KEY = 'blog_gh_token';
const REVEAL_KEY = 'blog_publish_revealed';
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const IDLE_WARNING_MS = 28 * 60 * 1000;

const TAP_COUNT_TO_REVEAL = 5;
const TAP_WINDOW_MS = 2500;

interface AuthState {
    user: GitHubUser | null;
    isOwner: boolean;
    tokenExpiry: string | null;
    idleWarning: boolean;
    publishAccessRevealed: boolean;
    registerGearTap: () => void;
    signIn: (token: string) => Promise<{ ok: true } | { ok: false; error: string }>;
    signOut: () => void;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<GitHubUser | null>(null);
    const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
    const [idleWarning, setIdleWarning] = useState(false);
    const [publishAccessRevealed, setPublishAccessRevealed] = useState(
        () => safeGetItem(REVEAL_KEY, sessionStorage) === '1'
    );
    const idleTimer = useRef<ReturnType<typeof setTimeout>>();
    const warnTimer = useRef<ReturnType<typeof setTimeout>>();
    const tapTimes = useRef<number[]>([]);

    const registerGearTap = useCallback(() => {
        const now = Date.now();
        tapTimes.current = [...tapTimes.current, now].filter((t) => now - t < TAP_WINDOW_MS);
        if (tapTimes.current.length >= TAP_COUNT_TO_REVEAL) {
            tapTimes.current = [];
            setPublishAccessRevealed(true);
            safeSetItem(REVEAL_KEY, '1', sessionStorage);
        }
    }, []);

    const clearTimers = () => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (warnTimer.current) clearTimeout(warnTimer.current);
    };

    const signOut = useCallback(() => {
        clearTimers();
        safeRemoveItem(TOKEN_KEY, sessionStorage);
        setUser(null);
        setTokenExpiry(null);
        setIdleWarning(false);
    }, []);

    const resetIdleTimer = useCallback(() => {
        clearTimers();
        setIdleWarning(false);
        warnTimer.current = setTimeout(() => setIdleWarning(true), IDLE_WARNING_MS);
        idleTimer.current = setTimeout(signOut, IDLE_LIMIT_MS);
    }, [signOut]);

    useEffect(() => {
        if (!user) return;
        resetIdleTimer();
        const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const onActivity = () => resetIdleTimer();
        events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
        return () => {
            clearTimers();
            events.forEach((e) => window.removeEventListener(e, onActivity));
        };
    }, [user]);

    useEffect(() => {
        const existing = safeGetItem(TOKEN_KEY, sessionStorage);
        if (!existing) return;
        verifyToken(existing)
            .then(({ user, tokenExpiry }) => {
                setUser(user);
                setTokenExpiry(tokenExpiry);
            })
            .catch(() => {
                safeRemoveItem(TOKEN_KEY, sessionStorage);
            });
    }, []);

    const signIn = useCallback(async (token: string) => {
        try {
            const { user, tokenExpiry } = await verifyToken(token);
            safeSetItem(TOKEN_KEY, token, sessionStorage);
            setUser(user);
            setTokenExpiry(tokenExpiry);
            return { ok: true as const };
        } catch (err) {
            const message = err instanceof GitHubApiError
                ? err.message
                : 'Could not reach GitHub. Check your connection and try again.';
            return { ok: false as const, error: message };
        }
    }, []);

    const getToken = useCallback(() => safeGetItem(TOKEN_KEY, sessionStorage), []);

    const value: AuthState = {
        user,
        isOwner: user !== null,
        tokenExpiry,
        idleWarning,
        publishAccessRevealed,
        registerGearTap,
        signIn,
        signOut,
        getToken,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
