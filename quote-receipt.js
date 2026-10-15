(() => {
    'use strict';
    const id = new URL(location.href).searchParams.get('request');
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id || '')) return;
    document.querySelector('#receipt-title').textContent = 'Zapytanie przyjęte do wysłania';
    document.querySelector('#receipt-number').textContent = id;
    document.querySelector('#receipt-success').hidden = false;
    document.querySelector('#receipt-missing').hidden = true;
    // A matching local attempt prevents direct opens/reloads counting as leads.
    // This is a provider acceptance notice, not proof of mailbox delivery.
    try {
        if (sessionStorage.getItem('3dmake.quote.pending') === id) {
            sessionStorage.removeItem('3dmake.quote.pending');
            window.siteAnalytics?.quoteSubmitted?.();
        }
    } catch { /* Storage is optional. */ }
})();
