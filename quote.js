(() => {
    'use strict';
    const form = document.querySelector('#quote-form');
    if (!form) return;
    const files = form.querySelector('#quote-files');
    const status = form.querySelector('#quote-status');
    const submit = form.querySelector('[type="submit"]');
    const guidance = form.querySelector('#quote-guidance');
    const quantity = form.querySelector('#quote-quantity');
    const types = {
        file: { title: 'Druk z gotowego pliku', hint: 'Dołącz model STL, 3MF lub OBJ albo podaj link poniżej. Napisz, do czego element będzie używany.' },
        repair: { title: 'Odtworzenie uszkodzonej części', hint: 'Pokaż część z kilku stron i miejsce montażu. Dodaj wymiary, szczególnie otworów i mocowań. Jeśli czegoś nie wiesz, napisz — ustalimy, co trzeba zmierzyć.' },
        design: { title: 'Projekt nowego elementu', hint: 'Opisz, co element ma robić i do czego pasować. Przyda się szkic, zdjęcie miejsca montażu lub orientacyjne wymiary.' }
    };
    let sending = false;
    function selectedType() { return form.querySelector('[name="Rodzaj zlecenia"]:checked')?.value; }
    function updateGuidance() { guidance.textContent = types[selectedType()]?.hint || 'Wybierz rodzaj zlecenia, aby zobaczyć, co warto przygotować.'; }
    function updateQuantity() { form.querySelector('#quote-batch').hidden = Number(quantity.value) < 2; }
    function validateFiles() {
        const list = Array.from(files.files || []);
        const size = list.reduce((sum, file) => sum + file.size, 0);
        let error = '';
        if (list.length > 5) error = 'Możesz dołączyć maksymalnie 5 plików. Pozostałe udostępnij linkiem.';
        else if (size > 10000000) error = 'Załączniki mają razem ponad 10 MB. Wybierz mniejsze pliki albo podaj link.';
        else if (list.some(file => !/\.(jpe?g|png|webp|heic|pdf|stl|3mf|obj|step|stp|zip)$/i.test(file.name))) error = 'Wybierz zdjęcie, PDF, plik 3D lub ZIP w jednym z formatów podanych pod polem.';
        files.setCustomValidity(error);
        form.querySelector('#quote-file-status').textContent = error || (list.length ? `Wybrano ${list.length} plików (${(size / 1000000).toFixed(1)} MB).` : 'Nie wybrano plików. Możesz też podać link poniżej.');
        return !error;
    }
    function hidden(name, value) {
        let input = form.querySelector(`[name="${name}"]`);
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden'; input.name = name;
            form.appendChild(input);
        }
        input.value = value;
    }
    form.querySelectorAll('[name="Rodzaj zlecenia"]').forEach(radio => radio.addEventListener('change', updateGuidance));
    quantity.addEventListener('input', updateQuantity);
    files.addEventListener('change', validateFiles);
    document.querySelectorAll('[data-quote-type]').forEach(link => link.addEventListener('click', () => {
        if (sending) return;
        const radio = form.querySelector(`[value="${link.dataset.quoteType}"]`);
        if (radio) { radio.checked = true; updateGuidance(); }
    }));
    // Use native navigation through the provider POST and redirect, avoiding fetch
    // CORS/redirect failures. Keep the fieldset enabled so no fields are dropped.
    form.addEventListener('formdata', event => {
        const data = event.formData;
        // FormSubmit silently filters some custom text fields. Send the complete
        // Polish enquiry in its standard message field; keep routing values short.
        const fields = ['Opis i zastosowanie', 'Wymiary i dopasowanie', 'Materiał', 'Oczekiwany termin', 'Link do plików'];
        const details = fields.map(name => [name, String(data.get(name) || '').trim()]);
        data.set('message', [`Rodzaj zlecenia: ${types[selectedType()].title}`, `Liczba sztuk: ${quantity.value}`, `Numer zapytania: ${data.get('request_id')}`, ...details.filter(([, value]) => value).map(([name, value]) => `${name}: ${value}`)].join('\n\n'));
        [...fields, 'Rodzaj zlecenia', 'Liczba sztuk'].forEach(name => data.delete(name));
        data.set('request_type', selectedType());
        data.set('quantity', quantity.value);
        data.delete('files');
        Array.from(files.files || []).forEach((file, index) => data.append(index === 0 ? 'attachment' : `attachment${index + 1}`, file, file.name));
    });
    form.addEventListener('submit', event => {
        if (sending) { event.preventDefault(); return; }
        validateFiles();
        for (const id of ['quote-description', 'quote-email']) {
            const input = form.querySelector('#' + id);
            input.value = input.value.trim();
        }
        if (!form.reportValidity() || form.querySelector('[name="_honey"]').value) { event.preventDefault(); return; }
        const requestId = crypto.randomUUID();
        const receipt = new URL('zapytanie-przyjete.html', location.href);
        receipt.searchParams.set('request', requestId);
        hidden('_subject', `3D Make - ${selectedType()} - ${quantity.value} szt. - ${requestId}`);
        hidden('request_id', requestId);
        hidden('_template', 'table'); hidden('_captcha', 'true'); hidden('_next', receipt.href);
        hidden('_autoresponse', `3D Make — potwierdzenie zapytania ${requestId}. Dziękuję za opis i przesłane materiały. Odpowiem z wyceną lub pytaniami o szczegóły. To nie jest zamówienie. W sprawie uzupełnień napisz na dgarbicz@gmail.com i podaj numer zapytania.`);
        // Only a random ID, never form contents, is kept for receipt analytics.
        try { sessionStorage.setItem('3dmake.quote.pending', requestId); } catch { /* Storage is optional. */ }
        sending = true;
        form.setAttribute('aria-busy', 'true');
        submit.disabled = true;
        submit.textContent = 'Wysyłanie…';
        status.textContent = 'Przejdź przez sprawdzenie antyspamowe i poczekaj na stronę potwierdzenia. Jeśli pojawi się błąd połączenia, wróć przyciskiem Wstecz; przed ponowną wysyłką możesz napisać na dgarbicz@gmail.com.';
        status.dataset.state = 'pending'; status.hidden = false;
        // No artificial timeout or automatic retries.
    });
    window.addEventListener('pageshow', () => {
        sending = false; submit.disabled = false;
        submit.textContent = 'Wyślij zapytanie do wyceny';
        form.removeAttribute('aria-busy'); status.hidden = true;
    });
    updateGuidance(); updateQuantity();
    form.hidden = false;
})();
