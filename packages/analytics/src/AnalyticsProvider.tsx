import {
    type BodlEventsPayload,
    type BodlService,
    type BraintreeAnalyticTrackerService,
    type CheckoutService,
    createBodlService,
    createBraintreeAnalyticTracker,
    createPayPalCommerceAnalyticTracker,
    createStepTracker,
    type Order,
    type PayPalCommerceAnalyticTrackerService,
    type StepTracker,
} from '@bigcommerce/checkout-sdk';
import React, { type ReactNode, useMemo } from 'react';

import AnalyticsContext, { type AnalyticsEvents } from './AnalyticsContext';
import createAnalyticsService from './createAnalyticsService';

interface AnalyticsProviderProps {
    checkoutService: CheckoutService;
    children?: ReactNode;
}

// Simple function to push to dataLayer with minimal type issues
// TODO: use
export function pushToDataLayer(eventName: string, eventData: Record<string, unknown> = {}): void {
    if (typeof window === 'undefined') {
        return;
    }

    const dataLayerName = 'dataLayer';
    const win = window as any;

    // Initialize dataLayer if it doesn't exist
    win[dataLayerName] = win[dataLayerName] || [];

    // Push event data to dataLayer
    win[dataLayerName].push({
        event: eventName,
        ...eventData,
    });
}

// Helper function to extract purchase analytics data from order information
function extractPurchaseAnalyticsData(order: Order) {
    // Combine physical and digital items
    const allItems = [...order.lineItems.physicalItems, ...order.lineItems.digitalItems];

    // Transform items to analytics format
    const items = allItems.map((item) => ({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        item_id: item.sku,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        item_name: item.name,
        quantity: item.quantity,
        price: item.salePrice,
    }));

    return {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        transaction_id: String(order.orderId),
        value: order.orderAmount,
        currency: order.currency?.code,
        items,
    };
}

const AnalyticsProvider = ({ checkoutService, children }: AnalyticsProviderProps) => {
    const getStepTracker = useMemo(
        () => createAnalyticsService<StepTracker>(createStepTracker, [checkoutService]),
        [checkoutService],
    );
    const getBodlService = useMemo(
        () => createAnalyticsService<BodlService>(createBodlService, [checkoutService.subscribe]),
        [checkoutService],
    );
    const getBraintreeAnalyticTracker = useMemo(
        () =>
            createAnalyticsService<BraintreeAnalyticTrackerService>(
                createBraintreeAnalyticTracker,
                [checkoutService],
            ),
        [checkoutService],
    );
    const getPayPalCommerceAnalyticTracker = useMemo(
        () =>
            createAnalyticsService<PayPalCommerceAnalyticTrackerService>(
                createPayPalCommerceAnalyticTracker,
                [checkoutService],
            ),
        [checkoutService],
    );

    const checkoutBegin = () => {
        getStepTracker().trackCheckoutStarted();
        getBodlService().checkoutBegin();
    };

    const trackStepCompleted = (currentStep: string) => {
        getStepTracker().trackStepCompleted(currentStep);
        getBodlService().stepCompleted(currentStep);
    };

    const trackStepViewed = (step: string) => {
        getStepTracker().trackStepViewed(step);
    };

    const orderPurchased = () => {
        getStepTracker().trackOrderComplete();
        getBodlService().orderPurchased();
    };

    const customerEmailEntry = (email: string) => {
        getBodlService().customerEmailEntry(email);
    };

    const customerSuggestionInit = (payload: BodlEventsPayload) => {
        getBodlService().customerSuggestionInit(payload);
    };

    const customerSuggestionExecute = () => {
        getBodlService().customerSuggestionExecute();
    };

    const customerPaymentMethodExecuted = (payload: BodlEventsPayload) => {
        getBodlService().customerPaymentMethodExecuted(payload);
        getBraintreeAnalyticTracker().customerPaymentMethodExecuted();
        getPayPalCommerceAnalyticTracker().customerPaymentMethodExecuted();
    };

    const showShippingMethods = () => {
        getBodlService().showShippingMethods();
    };

    const selectedPaymentMethod = (methodName: string, methodId: string) => {
        getBodlService().selectedPaymentMethod(methodName);
        getBraintreeAnalyticTracker().selectedPaymentMethod(methodId);
        getPayPalCommerceAnalyticTracker().selectedPaymentMethod(methodId);
    };

    const clickPayButton = (payload: BodlEventsPayload) => {
        getBodlService().clickPayButton(payload);
    };

    const paymentRejected = () => {
        getBodlService().paymentRejected();
    };

    const paymentComplete = () => {
        getBodlService().paymentComplete();
        getBraintreeAnalyticTracker().paymentComplete();
        getPayPalCommerceAnalyticTracker().paymentComplete();

        // Get order data and send purchase analytics
        try {
            const state = checkoutService.getState();
            const order = state.data.getOrder();

            if (order) {
                const purchaseData = extractPurchaseAnalyticsData(order);

                pushToDataLayer('purchase', purchaseData);
            }
        } catch (error) {
            // Silently handle any errors to avoid breaking the checkout flow
            // eslint-disable-next-line no-console
            console.warn('Failed to send purchase analytics:', error);
        }
    };

    const exitCheckout = () => {
        getBodlService().exitCheckout();
    };

    const walletButtonClick = (methodId: string) => {
        getBraintreeAnalyticTracker().walletButtonClick(methodId);
        getPayPalCommerceAnalyticTracker().walletButtonClick(methodId);
    };

    const analyticsTracker: AnalyticsEvents = {
        checkoutBegin,
        trackStepCompleted,
        trackStepViewed,
        orderPurchased,
        customerEmailEntry,
        customerSuggestionInit,
        customerSuggestionExecute,
        customerPaymentMethodExecuted,
        showShippingMethods,
        selectedPaymentMethod,
        clickPayButton,
        paymentRejected,
        paymentComplete,
        exitCheckout,
        walletButtonClick,
    };

    return (
        <AnalyticsContext.Provider value={{ analyticsTracker }}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export default AnalyticsProvider;
