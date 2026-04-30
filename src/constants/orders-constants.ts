export const orderStates = {
    pending: 1,
    on_hold: 2,
    processing: 3,
    shipping: 4,
    completed: 5,
    cancelled: 6,
    rejected: 7,
};

export const getOrderStateName = (stateId?: string) => {
    if (!stateId || Number.isNaN(Number.parseInt(stateId))) return null;
    const numericStateId = Number.parseInt(stateId);
    for (const name in orderStates) {
        if (orderStates[name as keyof typeof orderStates] === numericStateId) {
            return name;
        }
    }
    return null;
};

export const payment_methods = {
    sinpe: 'sinpe',
    credit_card: 'credit_card',
};

export const stripePaymentIntents = {
    succeeded: 'succeeded',
    processing: 'processing',
    requires_payment_method: 'requires_payment_method',
    requires_action: 'requires_action',
    canceled: 'canceled',
};

export const unknownState = 'Unknown';
