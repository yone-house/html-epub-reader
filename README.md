# HTML EPUB Reader

Read EPUBs in your web browser! Works offline with nothing to install.

Use it online at [reader.yone.house](https://reader.yone.house), or download the ZIP for offline use & sharing. Both work the same way.

The reader is an HTML document that opens in your browser. The JavaScript that drives it is in the reader-dependencies folder, and feel free to open any of it in a text editor to see what it does. It saves nothing to your computer, and doesn't connect to the internet on its own when using a local copy (links inside a book can still open websites).


## How to use

 Online: go to [reader.yone.house](https://reader.yone.house).
 Offline: double-click epub-reader.html to open it in your browser.

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

Everything works from the keyboard: Tab moves through the toolbar, the arrow keys turn pages, and Escape closes menus and drawers. Screen readers hear page and chapter changes, and footnotes open in a pop-up instead of jumping away. The reader starts in a dark, high-contrast or reduced-motion setup if your computer asks for one.

Known issues: settings reset each visit, and read aloud uses the book's main language throughout.


## Security

Books opened with "Open book" stay on your computer--they're read by your browser and never uploaded, online or offline.

No reading history, settings, or local storage is saved. Your browser history (unless you use private browsing) and your computer's recent-files lists may still show that the reader or a book file was opened.

Online, the reader is hosted on Cloudflare Pages. Like any website host, Cloudflare handles each visit and may record basic technical details such as your IP address, under its own privacy policy. The offline copy doesn't connect to the internet on its own (links inside a book can still open websites).

WARNING: Most EPUB readers block in-book scripts for security. This one asks first, and you can change it later under Options > Display > Book Scripts. Don't allow scripts for books you don't trust.


## Files

epub-reader.html      the reader
reader-dependencies/  reader.js, fonts.js, epub.js, JSZip, Fluoro, their open-source licenses, and the favicon


## Credits

html file and reader.js by Yone K, 2026

epub.js by FuturePress: https://github.com/futurepress/epub.js
JSZip: https://github.com/Stuk/jszip
OpenDyslexic: https://opendyslexic.org
Risograph theme made with Fluoro: https://github.com/yafira/fluoro

Open-source licenses are in the reader-dependencies folder.

This project is open-source under MIT License.


## Feedback

Comments and concerns, especially about accessibility, are welcome at doorbell@yone.house
