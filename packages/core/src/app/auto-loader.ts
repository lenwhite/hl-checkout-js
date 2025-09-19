import type { BrowserOptions } from '@sentry/browser';

import { loadFiles } from './loader';

export interface CustomCheckoutWindow extends Window {
    checkoutConfig: {
        containerId: string;
        orderId?: number;
        checkoutId?: string;
        publicPath?: string;
        sentryConfig?: BrowserOptions;
    };
    dataLayer?: unknown[];
}

function isCustomCheckoutWindow(window: Window): window is CustomCheckoutWindow {
    const customCheckoutWindow: CustomCheckoutWindow = window as CustomCheckoutWindow;

    return !!customCheckoutWindow.checkoutConfig;
}

(async function autoLoad() {
    const gtmContainerId = 'GTM-PG6644C';
    const dataLayerName = 'dataLayer';
    const win = window as any;
    
    win[dataLayerName] = win[dataLayerName] || [];
    
    win[dataLayerName].push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
    });
    
    const gtmScript = document.createElement('script');

    gtmScript.async = true;
    gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${gtmContainerId}`;
    
    const firstScript = document.getElementsByTagName('script')[0];

    if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(gtmScript, firstScript);
    }

    if (!isCustomCheckoutWindow(window)) {
        throw new Error('Checkout config is missing.');
    }

    const { renderOrderConfirmation, renderCheckout } = await loadFiles();

    const { orderId, checkoutId, ...appProps } = window.checkoutConfig;

    if (orderId) {
        renderOrderConfirmation({ ...appProps, orderId });
    } else if (checkoutId) {
        renderCheckout({ ...appProps, checkoutId });
    }
})();
