declare global {
    interface Window {
        sentryOnLoad?: () => void;
        dataLayer?: unknown[];
    }
}

export {};