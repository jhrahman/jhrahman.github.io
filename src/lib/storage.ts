export const safeGetItem = (key: string, store: Storage = localStorage): string | null => {
    try {
        return store.getItem(key);
    } catch {
        return null;
    }
};

export const safeSetItem = (key: string, value: string, store: Storage = localStorage): void => {
    try {
        store.setItem(key, value);
    } catch {
    }
};

export const safeRemoveItem = (key: string, store: Storage = localStorage): void => {
    try {
        store.removeItem(key);
    } catch {
    }
};
