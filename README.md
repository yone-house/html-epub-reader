# HTML EPUB Reader

Read EPUBs in your web browser with reflowable and accessible controls, primarily built on [epub.js](https://github.com/futurepress/epub.js). Built specifically with accessible zine & small-press publishing and distribution.

Use it online at [reader.yone.house](https://reader.yone.house), or download the ZIP for offline use and sharing. Both work the same way. Local copies are fully-functional without internet connection.

The reader is an HTML document that opens in your browser. The JavaScript that drives it is in the reader-dependencies folder, and feel free to open any of it in a text editor to see what it does. It saves nothing to your computer, and doesn't connect to the internet on its own when using a local copy (links inside a book can still open websites).


## How to use

 Online: visit [reader.yone.house](https://reader.yone.house).
 
 Offline: [download ZIP folder](html-epub-reader.zip), extract files, and double-click epub-reader.html to open in your default browser.

1. Click "Open book" and choose an .epub file.
2. If the book contains scripts, you'll be asked whether to allow them. Only say yes for books you trust.
3. Read! Click "Open book" again to open a different book. Nothing is remembered between visits.


## Navigation / Toolbar

Turn pages with the arrow keys, the arrows beside the page, or by swiping on a touch screen.

| **Toolbar**     	|                                                                                                                  	|
|-----------------	|------------------------------------------------------------------------------------------------------------------	|
| **Open book**   	| Opens new book from local files                                                                                  	|
| **Contents**    	| Chapter list, search the whole book, jump back to where you were                                                 	|
| **Search**      	| Searches whole book for terms, allows a return to previous location                                              	|
| **Read aloud**  	| Reads from the top of the screen with the computer's voice, turning pages as it goes. Also reads image alt text.                             	|
| **Full screen** 	| Hides the browser's tabs (press Escape or "Exit full screen" to leave)                                           	|
| **Metadata**    	| The book's details, including any accessibility information                                                      	|
| **Options**     	| **Display:** reading mode, theme (including Risograph & ink color), animations, image descriptions, book scripts 	|
|                 	| **Text:** font, size, weight, alignment                                                                          	|
|                 	| **Spacing:** line length, line/paragraph/letter/word spacing, indentation                                        	|


Most fonts come from your computer; if one isn't installed, the browser uses a similar one. OpenDyslexic is built in with fonts.js

The toolbar shows the printed page number, or your progress through the book if it has no page numbers.


## Accessibility

Keyboard navigable: Tab moves through the toolbar, arrow keys turn pages, Escape closes menus and full screen. Skip nav link included.

Screen reader compatible: screen readers hear page and chapter changes, and footnotes open in pop-up dialogs. 

Access settings compliant: reader starts in dark, high-contrast, or reduced-motion setup if the computer asks for one.

Reflowable controls: all sizing, spacing, fonts, and themes can be customized (including built-in OpenDyslexic font).

Alt text descriptions: alt text is read by built-in read aloud function, and can be made visible in text under Options > Display > Image Descriptions.

*Book accessibility metadata is made available in plain text under "Metadata" tab.*

**Known issues:** reader settings and history reset each visit; read aloud uses the book's main language throughout and does not adapt to inline language tags; page numbers are not navigable themselves (but table of contents and search are). 


## Security

Books opened with "Open book" stay on your computer--they're read by your browser and never uploaded, in online or offline version.

No reading history, settings, or local storage is saved. Your browser history (unless you use private browsing) and your computer's recent-files lists may still show that the reader or a book file was opened, but localStorage is not used at all.

Online, the reader is hosted on Cloudflare Pages. Cloudflare handles each visit and may record basic details like IP Address, but does not use cookies or localStorage, according to [its own privacy policy](https://www.cloudflare.com/privacypolicy/). 

The offline copy does not connect to the internet on its own (links inside a book can still open websites).

WARNING: Most EPUB readers block in-book scripts for security. This one allows scripts after asking first, and you can change that setting later under Options > Display > Book Scripts. Don't allow scripts for books you don't trust.


## Files in ZIP

epub-reader.html:     the reader

reader-dependencies/:  reader.js, fonts.js, epub.js, JSZip, Fluoro, their open-source licenses, and the favicon


## Credits

HTML file and reader.js by Yone K, 2026

epub.js by FuturePress: https://github.com/futurepress/epub.js

JSZip: https://github.com/Stuk/jszip

OpenDyslexic: https://opendyslexic.org

Risograph theme made with Fluoro: https://github.com/yafira/fluoro

Open-source licenses are in the reader-dependencies folder.

This project is open-source under [MIT License](LICENSE).


## Feedback

Comments and concerns, especially about accessibility, are welcome at doorbell@yone.house
