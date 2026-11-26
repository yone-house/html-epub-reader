HTML EPUB Reader
----------------
Reads EPUBs in your web browser--works offline with nothing to install.

The reader is a web page (epub-reader.html) that opens in your browser. Its JavaScript is plain text in the reader-dependencies folder, so feel free to open any of it in a text editor to see what it does. It saves nothing to your computer and doesn't connect to the internet on its own (links inside a book can still open websites).


How to use
----------
1. Double-click epub-reader.html to open it in your browser.
2. Click "Open book" and choose an .epub file.
3. If the book contains scripts, you'll be asked whether to allow them. Only say yes for books you trust.
4. Read! Click "Open book" again to open a different book. Nothing is remembered between visits.


Navigation / Toolbar
--------------------
Turn pages with the arrow keys, the arrows beside the page, or by swiping on a touch screen.

Contents     chapter list, search the whole book, jump back to where you were
Read aloud   reads from the top of the screen with the computer's voice, turning pages as it goes
Full screen  hides the browser's tabs (press Escape or "Exit full screen" to leave)
Metadata     the book's details, including any accessibility information
Options      Display: reading mode, theme (including Risograph & ink color), animations, image descriptions, book scripts
             Text: font, size, weight, alignment
             Spacing: line length, line/paragraph/letter/word spacing, indentation

Most fonts come from your computer; if one isn't installed, the browser uses a similar one. OpenDyslexic is built in with fonts.js

The toolbar shows the printed page number, or your progress through the book if it has no page numbers.


Accessibility
-------------
Everything works from the keyboard: Tab moves through the toolbar, the arrow keys turn pages, and Escape closes menus and drawers. Screen readers hear page and chapter changes, and footnotes open in a pop-up instead of jumping away. The reader starts in a dark, high-contrast or reduced-motion setup if your computer asks for one.

Known issues: settings reset each visit, and read aloud uses the book's main language throughout.


Security
--------
No reading history, settings, or local storage is saved. Your browser history (unless you use private browsing) and your computer's recent-files lists may still show that the reader or a book file was opened.

WARNING: Most EPUB readers block in-book scripts for security. This one asks first, and you can change it later under Options > Display > Book Scripts. Don't allow scripts for books you don't trust.


Files
-----
epub-reader.html      the reader
reader-dependencies/  reader.js, fonts.js, epub.js, JSZip, Fluoro, their open-source licenses, and the favicon


Credits
-------
reader.js and html file by Yone K, 2026

epub.js by FuturePress: https://github.com/futurepress/epub.js
JSZip: https://github.com/Stuk/jszip
OpenDyslexic: https://opendyslexic.org
Risograph theme made with Fluoro: https://github.com/yafira/fluoro

Open-source licenses are in the reader-dependencies folder.


Feedback
--------
Comments and concerns, especially about accessibility, are welcome at doorbell@yone.house