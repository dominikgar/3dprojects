# Formularz wyceny 3D Make

Odbiorca: dgarbicz@gmail.com. Darmowa usługa FormSubmit została aktywowana dla https://3dmake.pl/. Nie jest potrzebny abonament, własny serwer ani klucz API. Odpowiedź na otrzymaną wiadomość kieruje się do e-maila podanego przez klienta.

## Obsługa zapytań

Temat zawiera rodzaj zlecenia i liczbę sztuk. Treść jest tabelą z zastosowaniem, wymiarami, materiałem, terminem i linkiem, jeśli zostały podane. Pliki są rzeczywistymi załącznikami poczty. Formularz przyjmuje do 5 plików o łącznym rozmiarze do 10 MB; większe można przekazać linkiem. Serwer dostawcy także egzekwuje limit rozmiaru. Warto sprawdzać folder Spam i kategorie Gmail.

Klient otrzymuje potwierdzenie na stronie. Nie włączono automatycznej wiadomości zwrotnej. Potwierdzenie oznacza przyjęcie przez usługę, a nie zawarcie zamówienia. Cena gotowego druku od 30 zł nie obejmuje projektu, prób ani dostawy. Prace zaczynają się po uzgodnieniu ceny i zakresu.

## Dlaczego endpoint standardowy

W rzeczywistym teście `/ajax/…` przyjmował formularz, lecz pomijał załączniki. `quote.js` wysyła więc multipart do standardowego endpointu FormSubmit, a każdy plik otrzymuje osobne pole `attachment`, `attachment2` itd. CORS po stronie dostawcy pozwala użyć fetch. `_captcha=false` umożliwia obsługę bez przechodzenia na zewnętrzny ekran; ukryte pole `_honey` uzupełnia filtrowanie dostawcy. Jeśli pojawi się spam, trzeba zmienić ochronę formularza.

Dostawca po przyjęciu przekierowuje do `quote-received.json` z losowym identyfikatorem bieżącej próby. Kod wymaga dokładnie tego przekierowania i prawidłowej odpowiedzi JSON. Sama odpowiedź HTTP 200, strona aktywacji lub komunikat błędu nie są sukcesem. JSON potwierdzenia nie zawiera żadnych danych klienta i samodzielne otwarcie go nie generuje zdarzenia analitycznego. Hosting musi pozwalać na CORS dla tego publicznego pliku (GitHub Pages zwraca `Access-Control-Allow-Origin: *`).

Przy błędzie pola i wybrane pliki pozostają w formularzu. Po 45 sekundach oczekiwanie jest przerywane, bez automatycznego ponawiania. Po zerwanym połączeniu wiadomość może mimo wszystko dotrzeć — klient widzi taką informację. Odświeżenie zamyka stan formularza: treści i załączników nie zapisujemy w localStorage ani w GA4.

## Utrzymanie

- Zachować `quote.js`, `quote-received.json` i aktualny adres formularza przy publikacji.
- Nie zmieniać endpointu na `/ajax/…`, bo test wykazał utratę plików.
- Po zmianie domeny lub adresu odbiorcy ponownie sprawdzić aktywację oraz rzeczywiste dostarczenie plików i nagłówek Reply-To.
- Dokumentacja usługi: https://formsubmit.co/documentation; prywatność: https://formsubmit.co/privacy.pdf.
- `generate_lead` mierzy tylko zgłoszenia przyjęte po zgodzie na GA4. Liczba e-maili jest pełniejszą miarą wszystkich zapytań.

Testy: `node --test tests/*.test.cjs`. Nie wysyłają wiadomości. Weryfikacja integracyjna wymaga syntetycznego zapytania na własny adres i sprawdzenia załączników w odebranej wiadomości.
