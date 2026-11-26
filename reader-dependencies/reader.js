//simple JS epub reader for epub-reader.html document :-)
//made for the flash drive zines -- open epub-reader.html straight off the drive, no install

const $ = (id) => document.getElementById(id);

let book = null;
let rendition = null;
let lastCfi = null;
let sayPage = false;
let lastSectionHref = null;
let utter = null;

const themes = {
  light: { bg: "white", text: "black", link: "mediumblue" },
  dark: { bg: "black", text: "whitesmoke", link: "skyblue" },
  sepia: { bg: "#fef4e2", text: "#5f4b32", link: "#8b5a2b" },
  highcontrast: { bg: "black", text: "yellow", link: "lightcyan" },
  riso: { bg: "snow", text: "black", link: "blue" },
};

const fonts = {
  "default-sans": "system-ui, -apple-system, sans-serif",
  "default-serif": "serif",
  "arial": "Arial, sans-serif",
  "times-new-roman": "'Times New Roman', Times, Georgia, serif",
  "georgia": "Georgia, serif",
  "garamond": "Garamond, serif",
  "verdana": "Verdana, Geneva, Tahoma, sans-serif",
  "default-monospace": "monospace",
  "consolas": "Consolas, monospace",
  "courier": "Courier, monospace",
  "opendyslexic": '"OpenDyslexic", serif'
};

//---
//Opening book
//---
//can't just fetch() the books off the drive (file:// is blocked), so people pick the file instead

$("open-book").onclick = () => $('book-file').click();

$("book-file").addEventListener("change", async function () {
  const file = $("book-file").files[0];
  stopReading();
  if (book) {
    book.destroy();
  }
  rendition = null;
  const data = await file.arrayBuffer();
  book = ePub(data);
  lastCfi = null;

  let mayHaveScripts = true;
  try {
    await book.loaded.manifest;
    await book.loaded.spine;
    mayHaveScripts = await hasScripts();
  } catch (error) {
    console.error("Script check failed:", error);
  }
  let answer = "off";
  if (mayHaveScripts) {
    const dialog = $("scripts-dialog");
    dialog.returnValue = "";
    answer = await new Promise(function (resolve) {
      dialog.addEventListener("close", function () {
        resolve(dialog.returnValue);
      }, { once: true });
      dialog.showModal();
    });
  }
  $("scripts-control").value = answer === "on" ? "on" : "off";

  const metadata = await book.loaded.metadata;

  const title = metadata.title || file.name;
  $("book-title").textContent = title;
  $("book-title").hidden = false;
  document.title = title;

  showMetadata();

  book.ready.then(function () {
    return book.locations.generate(1600);
  }).then(function () {
    const location = rendition.currentLocation();
    if (location.start) {
      updatePageInfo(location);
    }
  });

  buildContents();
  await render();
  focusBook();

  say(title + " opened.");
});

//---
//Displaying book
//---
//epub.js can't switch flow on the fly, so mode/theme changes throw the rendition away and redo it

async function render() {
  stopReading();
  if (rendition) {
    rendition.destroy();
  }
  $("viewer").innerHTML = "";

  const mode = $("mode-control").value;
  const scrolling = mode === "scrolled";
  const spread = mode === "paginated-spread";
  document.body.setAttribute("data-mode", scrolling ? "scrolled" : "paginated");
  const viewer = $("viewer");
  viewer.style.maxWidth = pageMaxWidth() + "px";
  const width = Math.min(viewer.clientWidth, pageMaxWidth());
  const height = $("viewer-container").clientHeight;

  const pagesPerScreen = spread ? 2 : 1;
  const margin = Math.round(Math.min(Math.max(width * 0.05, 16), 48));
  const gap = Math.min(margin * 2, width / pagesPerScreen / 2);

  const allowScripts = $("scripts-control").value === "on";

  lastSectionHref = null;

  if (scrolling) {
    rendition = book.renderTo("viewer", {
      flow: "scrolled-doc",
      width: "100%",
      height: height,
      overflow: "auto",
      allowScriptedContent: allowScripts
    });
  } else {
    rendition = book.renderTo("viewer", {
      flow: "paginated",
      width: width,
      height: height,
      spread: spread ? "auto" : "none",
      gap: gap,
      allowScriptedContent: allowScripts
    });
  }

  //alt text under images. aria-hidden since screen readers already read the alt
  rendition.hooks.content.register(function (contents) {
    if ($("alt-control").value !== "on") {
      return;
    }
    contents.addStylesheetCss(".reader-alt { display: block; font-size: 0.9em; font-style: italic; margin: 0.25em 0 1em; text-align: left; text-indent: 0; }", "reader-alt");
    const images = contents.document.querySelectorAll("img[alt]");
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const alt = img.getAttribute("alt").trim();
      if (alt === "") {
        continue;
      }
      const figure = img.closest("figure");
      if (figure) {
        const caption = figure.querySelector("figcaption");
        if (caption && caption.textContent.trim() === alt) {
          continue;
        }
      }
      const description = contents.document.createElementNS("http://www.w3.org/1999/xhtml", "span");
      description.className = "reader-alt";
      description.setAttribute("aria-hidden", "true");
      description.textContent = "Image: " + alt;
      img.insertAdjacentElement("afterend", description);
    }
  });

  //only left/justified paragraphs get the Text Align setting -- centred poems etc. stay put
  rendition.hooks.content.register(function (contents) {
    const paras = contents.document.querySelectorAll("p, li");
    for (let i = 0; i < paras.length; i++) {
      const align = contents.window.getComputedStyle(paras[i]).textAlign;
      if (align === "left" || align === "start" || align === "justify") {
        paras[i].classList.add("reader-body-text");
      }
    }
  });

  //has to come AFTER renderTo or rendition is still null on first open (that one took a while)
  rendition.hooks.content.register(function (contents) {
    const all = contents.document.querySelectorAll("a[href], aside");
    for (let i = 0; i < all.length; i++) {
      const type = all[i].getAttribute("epub:type") || "";
      const role = all[i].getAttribute("role") || "";
      const tag = all[i].tagName.toLowerCase();
      if (tag === "a" && (type.indexOf("noteref") !== -1 || role === "doc-noteref")) {
        const link = all[i];
        link.onclick = null;
        link.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showNote(contents, link);
        });
      } else if (tag === "aside" && (type.indexOf("footnote") !== -1 || role === "doc-footnote")) {
        all[i].style.display = "none";
      }
    }
  });

  rendition.hooks.content.register(function (contents) {
    syncBg(contents);
    const watcher = new MutationObserver(function () {
      syncBg(contents);
    });
    const watchStyles = { attributes: true, attributeFilter: ["style", "class"] };
    watcher.observe(contents.document.documentElement, watchStyles);
    watcher.observe(contents.document.body, watchStyles);
  });

  rendition.hooks.content.register(function (contents) {
    contents.addStylesheetCss(fontFaces, "custom-fonts");
  });

  rendition.hooks.content.register(function (contents) {
    const links = contents.document.querySelectorAll("a[href]");
    for (let i = 0; i < links.length; i++) {
      const href = links[i].getAttribute("href");
      if (href.indexOf("http://") === 0 || href.indexOf("https://") === 0) {
        links[i].addEventListener("click", function (event) {
          event.preventDefault();
          window.open(href, "_blank", "noopener");
        });
      }
    }
  });

  //calibre books love page-break-before: always, which does nothing in epub.js columns
  rendition.hooks.content.register(function (contents) {
    if ($("mode-control").value === "scrolled") {
      return;
    }
    const pageBreaks = ["page", "always", "left", "right", "recto", "verso"];
    const all = contents.document.body.querySelectorAll("*");
    for (let i = 0; i < all.length; i++) {
      const style = contents.window.getComputedStyle(all[i]);
      if (pageBreaks.indexOf(style.breakBefore) !== -1 || pageBreaks.indexOf(style.pageBreakBefore) !== -1) {
        all[i].style.setProperty("break-before", "column", "important");
      }
      if (pageBreaks.indexOf(style.breakAfter) !== -1 || pageBreaks.indexOf(style.pageBreakAfter) !== -1) {
        all[i].style.setProperty("break-after", "column", "important");
      }
    }
  });

  //printImage can come back smaller than the original, so pin the size or pagination shifts
  rendition.hooks.content.register(function (contents) {
    if ($("theme-select").value !== "riso" || typeof Fluoro === "undefined") {
      return;
    }
    const inks = $("ink-control").value.split(",");
    const images = contents.document.querySelectorAll("img");
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const convert = function () {
        try {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          const print = Fluoro.printImage(img, {
            inkA: inks[0],
            inkB: inks[1],
            paper: "#fffefa",
            screen: "halftone",
            cell: 3,
            misregistration: 0.5,
            contrast: 1.8,
            density: 0.05,
            grain: 0,
            maxSize: 2000
          });
          img.width = width;
          img.height = height;
          img.src = print.toDataURL();
        } catch (error) {
        }
      };
      if (img.complete && img.naturalWidth) {
        convert();
      } else {
        img.addEventListener("load", convert, { once: true });
      }
    }
  });

  applyStyles();

  const thisRendition = rendition;

  rendition.on("relocated", function (location) {
    if (rendition !== thisRendition) {
      return;
    }
    lastCfi = location.start.cfi;
    // console.log(location.start);

    updatePageInfo(location);

    const href = location.start.href;
    let newChapter = false;
    if (lastSectionHref !== null && href !== lastSectionHref) {
      newChapter = true;
    }
    lastSectionHref = href;
    if (sayPage || newChapter) {
      let message = $("page-info").textContent;
      if (newChapter) {
        const chapter = chapterTitle(href);
        if (chapter !== "") {
          message = chapter + ". " + message;
        }
      }
      say(message);
      sayPage = false;
    }
  });

  rendition.on("rendered", function (section, view) {
    if (rendition !== thisRendition) {
      return;
    }
    let name = chapterTitle(section.href);
    if (name === "") {
      name = book.packaging.metadata.title;
    }
    if (view.iframe) {
      view.iframe.title = "Book text: " + name;
    }
  });

  rendition.on("keydown", handleKeys);
  rendition.on("touchstart", function (event) {
    swipeStartX = event.changedTouches[0].clientX;
    swipeStartY = event.changedTouches[0].clientY;
  });
  rendition.on("touchend", function (event) {
    const across = event.changedTouches[0].clientX - swipeStartX;
    const down = event.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(across) >= 50 && Math.abs(across) >= Math.abs(down)) {
      turnPage(across < 0);
    }
  });

  const unit = scrolling ? "section" : "page";
  $("prev").setAttribute("aria-label", "Previous " + unit);
  $("next").setAttribute("aria-label", "Next " + unit);

  if (lastCfi) {
    try {
      await rendition.display(lastCfi);
    } catch (error) {
      await rendition.display();
    }
  } else {
    await rendition.display();
  }
}

function resizeReader() {
  if (!rendition) {
    return;
  }
  const height = $("viewer-container").clientHeight;
  if ($("mode-control").value === "scrolled") {
    rendition.resize("100%", height);
  } else {
    const width = Math.min($("viewer").clientWidth, pageMaxWidth());
    rendition.resize(width, height);
  }
}

const pageWidths = {
  narrow: { single: 600, spread: 900 },
  medium: { single: 800, spread: 1000 },
  wide: { single: 1000, spread: 1100 }
};

function pageMaxWidth() {
  const widths = pageWidths[$("width-control").value];
  if ($("mode-control").value === "paginated-spread") {
    return widths.spread;
  } else {
    return widths.single;
  }
}

//---
//Styling the book
//---
//these rules go *inside* each chapter iframe -- the page's own CSS can't reach in there

function applyStyles() {
  document.body.setAttribute("data-theme", $("theme-select").value);
  
  const riso = $("theme-select").value === "riso";
  $("riso-options").hidden = !riso;
  if (typeof Fluoro !== "undefined") {
    //remove() on its own only clears lite mode -- without mode:filter the page stays riso'd
    if (Fluoro.isOn()) {
      Fluoro.remove({ mode: "filter" });
    }
    if (riso) {
      const inks = $("ink-control").value.split(",");
      Fluoro.apply({ mode: "filter", misregistration: 0.5, paper: "#fffefa", inkA: inks[0], inkB: inks[1], grain: 0 });
    }
  }

  if (!rendition) {
    return;
  }

  const lineHeight = $("line-height").value + " !important";
  const letterSpacing = $("letter-spacing").value + " !important";
  const wordSpacing = $("word-spacing").value + " !important";
  const family = fonts[$("font-family").value];

  const rules = {
    "html, body": {
      "line-height": lineHeight,
      "letter-spacing": letterSpacing,
      "word-spacing": wordSpacing
    },
    "p, span, li, h1, h2, h3, h4, h5, h6": {
      "line-height": lineHeight,
      "letter-spacing": letterSpacing,
      "word-spacing": wordSpacing,
      "overflow-wrap": "break-word !important"
    },
    ".reader-body-text": { "text-align": $("text-align").value + " !important" },
    "img, svg, video, table": { "max-width": "100% !important", "height": "auto !important" },
    "a": { "text-decoration": "underline !important" },
    "a:focus-visible": { "outline": "2px solid currentColor !important", "outline-offset": "2px !important" }
  };
  if (family) {
    rules["html, body"]["font-family"] = family + " !important";
    rules["p, span, li, h1, h2, h3, h4, h5, h6"]["font-family"] = family + " !important";
  }

  if ($("font-weight").value === "bold") {
    rules["body, body *"] = { "font-weight": "bold !important" };
  }

  const paragraphSpacing = $("paragraph-spacing").value;
  if (paragraphSpacing !== "default") {
    rules["p"] = {
      "margin-top": "0 !important",
      "margin-bottom": paragraphSpacing + " !important"
    };
  }

  const paragraphIndent = $("paragraph-indent").value;
  if (paragraphIndent !== "default") {
    rules["p.reader-body-text"] = { "text-indent": paragraphIndent + " !important" };
  }

  const colors = themes[$("theme-select").value];
  if (colors) {
    rules["*"] = {
      "background-color": "transparent !important",
      "color": colors.text + " !important"
    };
    rules["html, body"]["background"] = colors.bg + " !important";
    rules["html, body"]["color"] = colors.text + " !important";
    rules["p, span, li, h1, h2, h3, h4, h5, h6"]["color"] = colors.text + " !important";
    rules["a"]["color"] = colors.link + " !important";
  }

  rules[".reader-speaking"] = { "outline": "2px solid currentColor !important", "outline-offset": "3px !important" };

  if ($("mode-control").value === "scrolled") {
    rules["body"] = {
      "width": "100% !important",
      "margin": "0 !important",
      "padding": "30px clamp(16px, 5vw, 48px) 0 !important",
      "overflow-x": "hidden !important"
    };
  }

  const reduceMotion = $("animation-control").value === "off";
  if (reduceMotion) {
    if (!rules["*"]) {
      rules["*"] = {};
    }
    rules["*"]["transition"] = "none !important";
    rules["*"]["animation"] = "none !important";
    rules["*"]["scroll-behavior"] = "auto !important";
  }

  const allContents = rendition.getContents();
  for (let i = 0; i < allContents.length; i++) {
    //epub.js adds new CSS after the old instead of replacing it
    const oldRules = allContents[i].document.getElementById("epubjs-inserted-css-default");
    if (oldRules) {
      oldRules.remove();
    }
  }

  rendition.themes.default(rules);
  rendition.themes.fontSize($("font-size").value);

  for (let i = 0; i < allContents.length; i++) {
    syncBg(allContents[i]);
  }

  document.body.classList.toggle("reduce-motion", reduceMotion);
}

function syncBg(contents) {
  const none = "rgba(0, 0, 0, 0)";

  const body = contents.document.body;
  let color = contents.window.getComputedStyle(body).backgroundColor;
  if (color === none) {
    color = contents.window.getComputedStyle(contents.document.documentElement).backgroundColor;
  }
  if (color === none && body.firstElementChild) {
    color = contents.window.getComputedStyle(body.firstElementChild).backgroundColor;
  }

  const theme = $("theme-select").value;
  if ((theme === "default" || theme === "default-dark") && color !== none) {
    document.body.style.setProperty("--bg", color);
    const numbers = color.match(/\d+(\.\d+)?/g);
    const brightness = (Number(numbers[0]) * 299 + Number(numbers[1]) * 587 + Number(numbers[2]) * 114) / 1000;
    document.body.style.setProperty("--page-text", brightness > 128 ? "black" : "white");
  } else {
    document.body.style.removeProperty("--bg");
    document.body.style.removeProperty("--page-text");
  }
}

//---
//Navigation
//---

function turnPage(forward) {
  if (!rendition) {
    return;
  }
  stopReading();
  sayPage = true;
  if (forward) {
    return rendition.next();
  }
  return (rendition.prev());
}

function updatePageInfo(location) {
  const page = currentPage(location);
  if (page !== "") {
    let text = "Page " + page;
    if (!isNaN(book.pageList.lastPage)) {
      text = text + " of " + book.pageList.lastPage;
    }
    $("page-info").textContent = text;
  } else if (book.locations.length() === 0) {
    $("page-info").textContent = "Progress: loading...";
  } else {
    const percent = Math.round(location.start.percentage * 100);
    $("page-info").textContent = "Progress: " + percent + "%";
  }
}



//TODO: tidy this up later -- page-list hrefs point at the nav doc, so match on file name
function currentPage(location) {
  if (!book.pageList || !book.pageList.pageList) {
    return "";
  }

  let contents = null;
  const all_contents = rendition.getContents();
  for (let i = 0; i < all_contents.length; i++) {
    if (all_contents[i].sectionIndex === location.start.index) {
      contents = all_contents[i];
    }
  }

  let screenStart = null;
  if (contents) {
    screenStart = contents.range(location.start.cfi);
  }

  let page = "";
  const entries = book.pageList.pageList;
  for (let i = 0; i < entries.length; i++) {
    if (isNaN(entries[i].page)) {
      continue;
    }
    const parts = entries[i].href.split("#");
    const index = sectionIndexOf(parts[0]);
    if (index !== -1 && index < location.start.index) {
      page = entries[i].page;
    } else if (index === location.start.index) {
      if (parts.length < 2) {
        page = entries[i].page;
      } else if (screenStart) {
        const marker = contents.document.getElementById(decodeURIComponent(parts[1]));
        if (marker && screenStart.comparePoint(marker, 0) <= 0) {
          page = entries[i].page;
        }
      }
    }
  }
  return page;
}

function sectionIndexOf(href) {
  const item = book.spine.spineItems.find((s) => getFileName(s.href) === getFileName(href));
  return item ? item.index : -1;
}

function say(message) {
  $("sr-status").textContent = "";
  setTimeout(function () {
    $("sr-status").textContent = message;
  }, 50);
}

function handleKeys(event) {

  if (event.target.closest?.("dialog")) {
    return;
  }

  if (event.key === "Escape" && event.target.closest?.("#options-bar")) {
    closeOptions();
    $("options-toggle").focus();
    return;
  }

  const tag = event.target.tagName;
  if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) {
    return;
  }
  if (event.target.getAttribute?.("role") === "tab") {
    return;
  }

  if (event.key === "ArrowRight") {
    turnPage(true);
  } else if (event.key === "ArrowLeft") {
    turnPage(false);
  } else if (event.key === "Escape") {
    if ($("metadata-drawer").classList.contains("open")) {
      closeMetadata();
      $("metadata-toggle").focus();
    } else {
      closeContents();
      $("toc-toggle").focus();
    }
  }
}

//swipes come through epub.js, these just remember where a touch began
let swipeStartX = 0;
let swipeStartY = 0;

function focusBook() {
    const frame = document.querySelector("#viewer iframe");
    if (frame) {
        frame.contentWindow.focus();
    } else {
        $("viewer").focus();
    }
}

//---
//Pop-up footnotes
//---

async function showNote(contents, link) {
  const parts = link.getAttribute("href").split("#");
  if (parts.length < 2) {
    return;
  }
  const id = decodeURIComponent(parts[1]);

  let index = contents.sectionIndex;
  if (parts[0] !== "") {
    index = sectionIndexOf(parts[0]);
  }

  let note = null;
  if (index === contents.sectionIndex) {
    note = contents.document.getElementById(id);
  } else if (index !== -1) {
    const chapter = await book.load(book.spine.get(index).url);
    note = chapter.getElementById(id);
  }

  if (!note) {
    if (index !== -1) {
      rendition.display(book.spine.get(index).href + "#" + id);
    }
    return;
  }

  const text = $("note-dialog-text");
  text.textContent = "";
  const copy = document.importNode(note, true);
  copy.style.display = "";
  scrub(copy);
  text.appendChild(copy);

  const dialog = $("note-dialog");
  dialog.addEventListener("close", function () {
    contents.window.focus();
    link.focus();
  }, { once: true });
  dialog.showModal();
}

function scrub(element) {
  const unsafe = element.querySelectorAll("script, style, link, iframe, object, embed, svg, form, base");
  for (let i = 0; i < unsafe.length; i++) {
    unsafe[i].remove();
  }
  const links = element.querySelectorAll("a");
  for (let i = 0; i < links.length; i++) {
    const type = links[i].getAttribute("epub:type") || "";
    if (type.indexOf("backlink") !== -1 || links[i].getAttribute("role") === "doc-backlink") {
      links[i].remove();
    }
  }
  const everything = [element];
  const inside = element.querySelectorAll("*");
  for (let i = 0; i < inside.length; i++) {
    everything.push(inside[i]);
  }
  for (let i = 0; i < everything.length; i++) {
    const attributes = everything[i].attributes;
    for (let j = attributes.length - 1; j >= 0; j--) {
      const name = attributes[j].name.toLowerCase();
      const value = attributes[j].value.trim().toLowerCase();
      if (name.indexOf("on") === 0 || name === "id" || name === "href" || value.indexOf("javascript:") === 0) {
        everything[i].removeAttribute(attributes[j].name);
      }
    }
  }
}

//---
//Reading aloud
//---

function visibleBlocks(contents) {
  const location = rendition.currentLocation();
  const screen = contents.range(location.start.cfi);
  if ($("mode-control").value === "scrolled") {
    screen.setEnd(contents.document.body, contents.document.body.childNodes.length);
  } else {
    const end = contents.range(location.end.cfi);
    screen.setEnd(end.endContainer, end.endOffset);
  }

  const all = contents.document.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, img");
  return [...all].filter((el) => screen.intersectsNode(el));
}

function textFor(element) {
  if (element.localName === "img") {
    if (element.alt && !element.closest("p, li, h1, h2, h3, h4, h5, h6")) {
      return "Image: " + element.alt;
    }
    return "";
  }
  const copy = element.cloneNode(true);
  const parts = copy.querySelectorAll("img, .reader-alt");
  for (let i = 0; i < parts.length; i++) {
    let words = "";
    if (parts[i].localName === "img" && parts[i].alt) {
      words = " Image: " + parts[i].alt + " ";
    }
    parts[i].replaceWith(words);
  }
  return copy.textContent.trim();
}

function readAloud(skip) {
  stopReading();
  const paginated = $("mode-control").value !== "scrolled";
  const language = book.packaging.metadata.language;
  const paragraphs = visibleBlocks(rendition.getContents()[0]);
  let lastElement = skip;

  for (let i=0; i<paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const text = textFor(paragraph);
    if (paragraph === skip || text === "") {
      continue;
    }
    const speech = new SpeechSynthesisUtterance(text);
    if (language) {
      speech.lang = language;
    }
    speech.addEventListener("start", function () {
      paragraph.classList.add("reader-speaking");
      if (!paginated) {
        paragraph.scrollIntoView({ block: "nearest" });
      }
    });
    speech.addEventListener("end", function () {
      paragraph.classList.remove("reader-speaking");
    });
    speechSynthesis.speak(speech);
    utter = speech;
    lastElement = paragraph;
  }

  if (utter === null) {
    if (skip) {
      readNext(lastElement);
    }
    return;
  }

  const finalParagraph = utter;
  finalParagraph.addEventListener("end", function () {
    if (utter !== finalParagraph) {
      return;
    }
    readNext(lastElement);
  });
  $("read-aloud").innerHTML = '<span aria-hidden="true">🗣️</span> Stop reading';
}

async function readNext(lastElement) {
  if (rendition.currentLocation().atEnd) {
    stopReading();
    return;
  }
  //stands in for the speech while the page turns, so Stop still works
  const turning = {};
  utter = turning;
  $("read-aloud").innerHTML = '<span aria-hidden="true">🗣️</span> Stop reading';
  await rendition.next();
  if (utter === turning) {
    readAloud(lastElement);
  }
}

function stopReading() {
  speechSynthesis.cancel();
  utter = null;
  if (rendition && rendition.getContents()[0]) {
    const speaking = rendition.getContents()[0].document.querySelectorAll(".reader-speaking");
    for (let i = 0; i < speaking.length; i++) {
      speaking[i].classList.remove("reader-speaking");
    }
  }
  $("read-aloud").innerHTML = '<span aria-hidden="true">🗣️</span> Read aloud';
}

$("read-aloud").addEventListener("click", function () {
  if (!rendition) {
    return;
  }
  if (utter) {
    stopReading();
  } else {
    readAloud();
  }
});

//---
//TOC
//---

function buildContents() {
  book.loaded.navigation.then(function (nav) {
    $("toc-list").innerHTML = "";
    addChapters(nav.toc, $("toc-list"));
  });
}

function addChapters(chapters, list) {
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.textContent = chapter.label.trim();
    link.href = chapter.href;
    link.addEventListener("click", async function (event) {
      event.preventDefault();
      closeContents();
      await rendition.display(chapter.href);
      focusBook();
    });
    item.appendChild(link);

    if (chapter.subitems.length > 0) {
      const subList = document.createElement("ul");
      addChapters(chapter.subitems, subList);
      item.appendChild(subList);
    }
    list.appendChild(item);
  }
}

function chapterTitle(href, chapters) {
  if (!chapters) {
    chapters = [];
    if (book.navigation) {
      chapters = book.navigation.toc;
    }
  }
  for (let i = 0; i < chapters.length; i++) {
    if (getFileName(chapters[i].href) === getFileName(href)) {
      return chapters[i].label.trim();
    }
    const found = chapterTitle(href, chapters[i].subitems);
    if (found !== "") {
      return found;
    }
  }
  return "";
}

const getFileName = (path) => path.split("#")[0].split("/").pop();

function openContents() {
  closeMetadata();
  $("toc-drawer").classList.add("open");
  $("toc-toggle").setAttribute("aria-expanded", "true");
  $("search-toggle").setAttribute("aria-expanded", "true");
  const firstLink = $("toc-list").querySelector("a");
  if (lastResult && lastResult.isConnected) {
    lastResult.focus();
  } else if (firstLink) {
    firstLink.focus();
  }
}

function closeContents() {
  $("toc-drawer").classList.remove("open");
  $("toc-toggle").setAttribute("aria-expanded", "false");
  $("search-toggle").setAttribute("aria-expanded", "false");
}

$("toc-toggle").addEventListener("click", function () {
  if ($("toc-drawer").classList.contains("open")) {
    closeContents();
  } else {
    openContents();
  }
});

function openMetadata() {
  closeContents();
  $("metadata-drawer").classList.add("open");
  $("metadata-toggle").setAttribute("aria-expanded", "true");
  $("metadata-drawer").focus();
}

function closeMetadata() {
  $("metadata-drawer").classList.remove("open");
  $("metadata-toggle").setAttribute("aria-expanded", "false");
}

$("metadata-toggle").addEventListener("click", function () {
  if ($("metadata-drawer").classList.contains("open")) {
    closeMetadata();
  } else {
    openMetadata();
  }
});

const detailLabels = {
  "dc:title": "Title",
  "belongs-to-collection": "Series",
  "calibre:series": "Series",
  "dc:language": "Language",
  "dc:publisher": "Publisher",
  "dc:description": "Description",
  "dc:subject": "Subjects",
  "dc:rights": "Rights",
  "dc:source": "Source"
};

const roleNames = {
  "aut": "Author",
  "edt": "Editor",
  "ill": "Illustrator",
  "trl": "Translator",
  "nrt": "Narrator",
  "aui": "Introduction",
  "aft": "Afterword",
  "art": "Artist",
  "pht": "Photographer",
  "cov": "Cover designer",
  "dsr": "Designer",
  "com": "Compiler",
  "ann": "Annotator",
  "pbl": "Publisher",
  "bkp": "Book producer",
  "ctb": "Contributor"
};

const accessibilityLabels = {
  "schema:accessMode": "Access modes",
  "schema:accessModeSufficient": "Sufficient access modes",
  "schema:accessibilityFeature": "Features",
  "schema:accessibilityHazard": "Hazards",
  "schema:accessibilitySummary": "Summary",
  "schema:accessibilityAPI": "Accessibility API",
  "schema:accessibilityControl": "Controls",
  "dcterms:conformsTo": "Conforms to",
  "a11y:certifiedBy": "Certified by",
  "a11y:certifierCredential": "Certifier credential",
  "a11y:certifierReport": "Certifier report"
};

async function showMetadata() {
  const list = $("metadata-list");
  list.innerHTML = "";

  let opf = null;
  try {
    opf = await book.load(book.path.path);
  } catch (error) {
    opf = null;
  }
  if (!opf) {
    list.textContent = "This book's details couldn't be read.";
    return;
  }

  const items = opf.getElementsByTagNameNS("*", "metadata")[0].children;

  const roles = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.getAttribute("refines") && item.getAttribute("property") === "role") {
      const id = item.getAttribute("refines").replace("#", "");
      if (!roles[id]) {
        roles[id] = [];
      }
      roles[id].push(item.textContent.trim());
    }
  }

  const details = [];
  const contributors = [];
  const accessibility = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.getAttribute("refines")) {
      continue;
    }
    let name = item.nodeName;
    let value = item.textContent.trim();
    if (item.localName === "meta") {
      if (item.getAttribute("property")) {
        name = item.getAttribute("property");
      } else {
        name = item.getAttribute("name");
        value = item.getAttribute("content");
      }
    } else if (item.localName === "link") {
      name = item.getAttribute("rel");
      value = item.getAttribute("href");
    }
    if (!name || !value) {
      continue;
    }

    if (item.localName === "creator" || item.localName === "contributor") {
      let codes = [];
      if (item.getAttribute("id") && roles[item.getAttribute("id")]) {
        codes = roles[item.getAttribute("id")];
      } else if (item.getAttribute("opf:role")) {
        codes = [item.getAttribute("opf:role")];
      }
      if (codes.length === 0) {
        if (item.localName === "creator") {
          addEntry(contributors, "Creator", value);
        } else {
          addEntry(contributors, "Contributor", value);
        }
      }
      for (let j = 0; j < codes.length; j++) {
        let role = roleNames[codes[j]];
        if (!role) {
          role = codes[j];
        }
        addEntry(contributors, role, value);
      }
    } else if (accessibilityLabels[name]) {
      if (name === "dcterms:conformsTo" && value.indexOf("#wcag-") !== -1) {
        value = "EPUB Accessibility 1.0, WCAG 2.0 Level " + value.split("#wcag-")[1].toUpperCase();
      } else if (name.indexOf("schema:") === 0 && value.indexOf(" ") === -1) {
        value = value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/,/g, ", ");
      }
      addEntry(accessibility, accessibilityLabels[name], value);
    } else if (detailLabels[name]) {
      if (name === "dc:language") {
        try {
          value = new Intl.DisplayNames(["en"], { type: "language" }).of(value);
        } catch (error) {
        }
      } else if (name === "dc:description") {
        value = new DOMParser().parseFromString(value, "text/html").body.textContent.trim();
      }
      addEntry(details, detailLabels[name], value);
    }
  }

  if (accessibility.length > 0) {
    addMetadataSection(list, "Accessibility", accessibility);
  } else {
    const heading = document.createElement("h4");
    heading.textContent = "Accessibility";
    list.appendChild(heading);
    const note = document.createElement("p");
    note.textContent = "This book doesn't include any accessibility information.";
    list.appendChild(note);
  }
  const otherInformation = details.concat(contributors);
  if (otherInformation.length > 0) {
    addMetadataSection(list, "Other information", otherInformation);
  }
}

function addEntry(entries, label, value) {
  const found = entries.find((e) => e.label === label);
  if (found) found.values.push(value);
  else entries.push({ label, values: [value] });
}

function addMetadataSection(list, heading, entries) {
  if (list.children.length > 0) {
    list.appendChild(document.createElement("hr"));
  }

  const title = document.createElement("h4");
  title.textContent = heading;
  list.appendChild(title);

  const terms = document.createElement("dl");
  for (let i = 0; i < entries.length; i++) {
    const term = document.createElement("dt");
    term.textContent = entries[i].label;
    const description = document.createElement("dd");
    description.textContent = entries[i].values.join(", ");
    terms.appendChild(term);
    terms.appendChild(description);
  }
  list.appendChild(terms);
}

//---
//Toolbar stuff
//---

$("prev").addEventListener("click", async function () {
  await turnPage(false);
  focusBook();
});
$("next").addEventListener("click", async function () {
  await turnPage(true);
  focusBook();
});
document.addEventListener("keydown", handleKeys);

$("options-toggle").addEventListener("click", function () {
  const optionsBar = $("options-bar");
  const open = !optionsBar.classList.toggle("collapsed");
  $("options-toggle").setAttribute("aria-expanded", open);
  resizeReader();
});

const optionTabs = document.querySelectorAll('#options-bar [role="tab"]');

function showOptionsTab(chosen) {
  for (let i = 0; i < optionTabs.length; i++) {
    const tab = optionTabs[i];
    const panel = $(tab.getAttribute("aria-controls"));
    if (tab === chosen) {
      tab.setAttribute("aria-selected", "true");
      tab.tabIndex = 0;
      panel.hidden = false;
    } else {
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
      panel.hidden = true;
    }
  }
  resizeReader();
}

$("options-close").addEventListener("click", function () {
  closeOptions();
  $("options-toggle").focus();
});

function closeOptions() {   
  $("options-bar").classList.add("collapsed");
  $("options-toggle").setAttribute("aria-expanded", "false");
  resizeReader();
}

for (let i = 0; i < optionTabs.length; i++) {
  optionTabs[i].addEventListener("click", function () {
    showOptionsTab(optionTabs[i]);
  });
  optionTabs[i].addEventListener("keydown", function (event) {
    const count = optionTabs.length;
    let next = null;
    if (event.key === "ArrowRight") {
      next = (i + 1) % count;
    } else if (event.key === "ArrowLeft") {
      next = (i + count - 1) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }
    if (next === null) {
      return;
    }
    event.preventDefault();
    showOptionsTab(optionTabs[next]);
    optionTabs[next].focus();
  });
}

$("fullscreen-toggle").addEventListener("click", function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

document.addEventListener("fullscreenchange", function () {
  const full = Boolean(document.fullscreenElement);
  document.body.classList.toggle("is-fullscreen", full);
  $("fullscreen-toggle").innerHTML = '<span aria-hidden="true">⛶</span> ' + (full ? "Exit full screen" : "Full screen");
});

$("skip-nav").addEventListener("click", function (event) {
  event.preventDefault();
  focusBook();
});

$("viewer").addEventListener("click", focusBook);

const styleOptions = ["font-size", "font-weight", "line-height", "paragraph-spacing", "paragraph-indent", "letter-spacing",
                      "word-spacing", "text-align", "font-family", "animation-control"];
for (let i = 0; i < styleOptions.length; i++) {
  $(styleOptions[i]).addEventListener("change", applyStyles);
}

for (const id of ["theme-select", "ink-control", "scripts-control", "alt-control", "mode-control", "width-control"]) {
  $(id).addEventListener("change", function () {
    if (book) {
      render();
    } else {
      applyStyles();
    }
  });
}

//errs on the side of asking -- the sandbox can stop scripts anyway, this just decides whether to bother people
async function hasScripts() {
  const manifest = book.packaging.manifest;
  const ids = Object.keys(manifest);
  for (let i = 0; i < ids.length; i++) {
    const item = manifest[ids[i]];
    if (item.properties && item.properties.indexOf("scripted") !== -1) {
      return true;
    }
    if (item.type === "application/javascript" || item.type === "text/javascript" || item.type === "application/ecmascript") {
      return true;
    }
  }

  const chapters = book.spine.spineItems;
  for (let i = 0; i < chapters.length; i++) {
    let chapter = null;
    try {
      chapter = await book.load(chapters[i].url);
    } catch (error) {
      return true;
    }
    if (chapter.querySelector("script, iframe, object, embed")) {
      return true;
    }
    const all = chapter.getElementsByTagName("*");
    for (let j = 0; j < all.length; j++) {
      const attributes = all[j].attributes;
      for (let k = 0; k < attributes.length; k++) {
        const name = attributes[k].name.toLowerCase();
        const value = attributes[k].value.trim().toLowerCase();
        if (name.indexOf("on") === 0 || value.indexOf("javascript:") === 0) {
          return true;
        }
      }
    }
  }
  return false;
}

window.addEventListener("resize", resizeReader);

let scrollbarTimer = null;
$("viewer").addEventListener("scroll", function (event) {
  event.target.classList.add("scrolling");
  clearTimeout(scrollbarTimer);
  scrollbarTimer = setTimeout(function () {
    event.target.classList.remove("scrolling");
  }, 1000);
}, true);

let lastResult = null;
let searchStart = null;

$("search-toggle").addEventListener("click", function () {
  if ($("toc-drawer").classList.contains("open")) {
    closeContents();
  } else {
    openContents();
    $("search-input").focus();
  }
});

$("search-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const query = $("search-input").value.trim();
  const list = $("search-results");
  list.innerHTML = "";
  if (!book || query === "") {
    return;
  }
  searchStart = lastCfi;
  const chapters = book.spine.spineItems;
  for (let i = 0; i < chapters.length; i++) {
    await chapters[i].load(book.load.bind(book));
    const matches = chapters[i].find(query);
    chapters[i].unload();
    for (let j = 0; j < matches.length; j++) {
      const cfi = matches[j].cfi;
      const link = document.createElement("a");
      link.href = "#";
      const chapterName = document.createElement("span");
      chapterName.className = "result-chapter";
      chapterName.textContent = chapterTitle(chapters[i].href);
      link.appendChild(chapterName);
      const excerpt = matches[j].excerpt;
      const start = excerpt.toLowerCase().indexOf(query.toLowerCase());
      if (start === -1) {
        link.appendChild(document.createTextNode(excerpt));
      } else {
        link.appendChild(document.createTextNode(excerpt.slice(0, start)));
        const mark = document.createElement("mark");
        mark.textContent = excerpt.slice(start, start + query.length);
        link.appendChild(mark);
        link.appendChild(document.createTextNode(excerpt.slice(start + query.length)));
      }
      link.addEventListener("click", function (event) {
        event.preventDefault();
        lastResult = link;
        $("search-back").hidden = false;
        const narrow = window.innerWidth < 900;
        if (narrow) {
          closeContents();
        }
        rendition.display(cfi).then(function () {
          rendition.annotations.highlight(cfi);
          if (narrow) {
            focusBook();
          }
        });
      });
      const item = document.createElement("li");
      item.appendChild(link);
      list.appendChild(item);
    }
  }
  say(list.children.length + " results");
});

$("search-input").addEventListener("input", function () {
  if ($("search-input").value === "") {
    $("search-results").innerHTML = "";
  }
});

$("search-back").addEventListener("click", function () {
  $("search-back").hidden = true;
  closeContents();
  rendition.display(searchStart).then(focusBook);
});

//---
//Startup
//---

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  $("animation-control").value = "off";
}

if (window.matchMedia("(prefers-contrast: more), (forced-colors: active)").matches) {
  $("theme-select").value = "highcontrast";
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  $("theme-select").value = "dark";
}
applyStyles();

$("page-info").textContent = "Choose “Open book” to pick an EPUB file.";

const fontStyle = document.createElement("style");
fontStyle.textContent = fontFaces;
document.head.appendChild(fontStyle);