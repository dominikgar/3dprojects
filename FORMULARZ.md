# Formularz wyceny 3D Make

Odbiorca: dgarbicz@gmail.com. Darmowa usługa FormSubmit została aktywowana dla https://3dmake.pl/. Nie jest potrzebny abonament, własny serwer ani klucz API. Odpowiedź na otrzymaną wiadomość kieruje się do e-maila podanego przez klienta.

## Obsługa zapytań

Temat zawiera rodzaj zlecenia i liczbę sztuk. Treść jest tabelą z zastosowaniem, wymiarami, materiałem, terminem i linkiem, jeśli zostały podane. Pliki są rzeczywistymi załącznikami poczty. Formularz przyjmuje do 5 plików o łącznym rozmiarze do 10 MB; większe można przekazać linkiem. Serwer dostawcy także egzekwuje limit rozmiaru. Warto sprawdzać folder Spam i kategorie Gmail.

Klient otrzymuje osobną stronę potwierdzenia z numerem zapytania oraz automatyczny e-mail przez `_autoresponse`. Numer występuje również w e-mailu do administratora, więc można sprawdzić zgłoszenie bez ponownej wysyłki. CAPTCHA jest włączona: należy ją ukończyć przed przyjęciem formularza. Potwierdzenie oznacza przyjęcie przez usługę, a nie zawarcie zamówienia ani dowód dostarczenia do Gmail. Cena gotowego druku od 30 zł nie obejmuje projektu, prób ani dostawy. Prace zaczynają się po uzgodnieniu ceny i zakresu.

## Wysyłka przez przeglądarkę (naprawa 15.10.2026)

Formularz przesyła natywny multipart POST do aktywowanego standardowego endpointu FormSubmit. Nie używa `fetch`, `/ajax/` ani łańcucha przekierowań odczytywanego przez JavaScript. Zdarzenie `formdata` nadaje każdemu plikowi osobne pole `attachment`, `attachment2` itd., zachowując jego nazwę. Pola tekstowe pozostają włączone podczas POST. Przycisk wysyłki blokuje podwójne kliknięcia. `_captcha=true` włącza standardowe sprawdzenie antyspamowe dostawcy; ukryte pole `_honey` dodatkowo blokuje boty. Testy 15.10 wykazały, że przy `_captcha=false` niektóre opisy wywołują ogólne Thanks bez przekierowania i bez potwierdzonego doręczenia. Dokumentacja dostawcy ostrzega o ograniczeniach przy wyłączonej CAPTCHA.

Polskie szczegóły zapytania są scalane w standardowym polu `message`, z zachowaniem opisów, wymiarów, materiału, terminu i linku. Osobno przesyłane są krótkie wartości `request_type`, `quantity`, `request_id`. Testy porównawcze wykazały pozorne Thanks również z włączoną CAPTCHA dla niestandardowego pola `Rodzaj zlecenia=Odtworzenie uszkodzonej części`, a przejście do CAPTCHA dla standardowego `message` z polskim opisem i krótką wartością `request_type=repair`. Nie zakładamy, że samo włączenie CAPTCHA rozwiązuje problem filtrowania.

Po przyjęciu POST dostawca przekierowuje przeglądarkę do `zapytanie-przyjete.html?request=UUID`. Numer występuje także w temacie i treści wiadomości. Strona potwierdza przyjęcie do wysyłki, a nie dostarczenie do skrzynki ani zawarcie zamówienia. W URL nie ma danych klienta; strona ma noindex i no-referrer. Bez numeru pokazuje neutralny komunikat. Samo otwarcie lub odświeżenie potwierdzenia nie generuje leadu: event wymaga pasującego numeru ostatniej próby w sessionStorage i zużywa go tylko raz. Zgoda na GA4 nadal jest wymagana.

Nie przerywamy wysyłki po 45 sekundach ani nie ponawiamy automatycznie. Błędy serwera są widoczne jako jego odpowiedź; przy błędzie sieci klient może wrócić przyciskiem Wstecz. `pageshow` odblokowuje przycisk przy powrocie. Przywrócenie pól/plików zależy od pamięci historii przeglądarki; nie gwarantujemy zachowania plików po odświeżeniu. W sessionStorage przechowujemy tylko losowy numer ostatniej próby do jednorazowego pomiaru; opisu, e-maila ani plików nie zapisujemy.

## Utrzymanie

- Zachować `quote.js`, `quote-receipt.js`, `zapytanie-przyjete.html` i aktualny adres formularza przy publikacji. Stary `quote-received.json` pozostaje jedynie dla zgodności ze stronami otwartymi przed aktualizacją.
- Nie zmieniać endpointu na `/ajax/…`, bo test wykazał utratę plików.
- Po zmianie domeny lub adresu odbiorcy ponownie sprawdzić aktywację oraz rzeczywiste dostarczenie plików i nagłówek Reply-To.
- Dokumentacja usługi: https://formsubmit.co/documentation; prywatność: https://formsubmit.co/privacy.pdf.
- `generate_lead` mierzy tylko zgłoszenia przyjęte po zgodzie na GA4. Liczba e-maili jest pełniejszą miarą wszystkich zapytań.

Testy: `node --test tests/*.test.cjs`. Nie wysyłają wiadomości. Weryfikacja integracyjna wymaga syntetycznego zapytania na własny adres i sprawdzenia załączników w odebranej wiadomości.
