const ipcRenderer = require("electron").ipcRenderer;

const toggleSidemenu = (() => {
  var open = false;
  var isLeft = document.querySelector(".isLeftToggle").checked;

  // Slide-in library menu functionality initialization
  return () => {
    const sideMenu = document.getElementById("divSidemenu");
    sideMenu.style[isLeft ? "left" : "right"] = open
      ? isLeft
        ? "0px"
        : "0px"
      : "0px";

    document
      .querySelector("#divSidemenu")
      .setAttribute("sidemenu-is-visible", !open);
    document.getElementById("menuWrapper").classList.toggle("d-none");

    open = !open;
  };
})();

document.getElementById("toggleBar").addEventListener("click", toggleSidemenu);

function setUpDate() {
  var page = window.location.pathname.split("/").pop();

  if (page === "index.html") {
    const days = document.querySelectorAll("#p1 table tr th:not(.extra-col)");

    const containers = document.querySelectorAll(
      "#p1 table tr td:not(.extra-col)"
    );

    let day = new Date().getDay();
    // We handle 'Sunday' differently than the Date library.
    if (day == 0) {
      day = 7;
    }

    days[day].style.backgroundColor = "#c5e6f5";
    for (var j = day - 1; j < 21; j += 7) {
      containers[j].style.backgroundColor = "#c5e6f5";
    }
  }
}

setUpDate();

function showDeletionBox() {
  document.getElementById("trash-box-container").style.display = "flex";
  console.log("Show deletion box triggered.");
}

function hideDeletionBox() {
  document.getElementById("trash-box-container").style.display = "none";
  console.log("Hide deletion box triggered.");
}

const getSymbolsById = async () => {
  const symbols = await ipcRenderer.invoke("get-symbols");
  const symbolsById = {};
  for (let symbol of symbols) {
    symbolsById[symbol.id] = symbol;
  }
  return symbolsById;
};

const createSymbolElement = (symbol) => {
  const symbolEl = document.createElement("div");
  symbolEl.classList.add("symbol");
  symbolEl.classList.add(`${symbol.type}-symbol`, "col-2", "ms-2", "mb-2");
  symbolEl.setAttribute("data-id", symbol.id);

  const img = document.createElement("img");
  img.setAttribute("src", symbol.imageFilePath);
  img.setAttribute("alt", symbol.name);
  img.classList.add("img-lib");
  symbolEl.appendChild(img);

  if (symbol.category) {
    const label = document.createElement("div");
    label.classList.add("symbol-label");
    label.innerHTML = symbol.name;
    label.setAttribute("title", symbol.name);
    symbolEl.appendChild(label);
  }

  return symbolEl;
};

const createSymbolPlacementElement = (symbolsById, placement) => {
  const elem = createSymbolElement(symbolsById[placement.symbolId]);
  elem.setAttribute("symbol-placement-id", placement.id);
  elem.classList.add("symbol-placement");

  elem.style.left = parseInt(placement.posX) - elem.offsetWidth / 2 + "px";
  elem.style.top = parseInt(placement.posY) - elem.offsetHeight / 2 + "px";

  return elem;
};

const initSymbolLibrary = (symbols) => {
  const populateRow = (row, symbol) => {
    row.appendChild(createSymbolElement(symbol));
  };

  // Add types that don't have categories.
  for (const type of ["people", "transportation"]) {
    const row = document.getElementById(`${type}-imgs-row`);
    for (const symbol of symbols.filter((symbol) => symbol.type === type)) {
      populateRow(row, symbol);
    }
  }

  const activitySymbols = symbols.filter(
    (symbol) => symbol.type === "activities"
  );
  const categoryToSymbol = {};
  for (const symbol of activitySymbols) {
    const category = symbol.category.name;
    if (!(category in categoryToSymbol)) {
      categoryToSymbol[category] = [];
    }

    categoryToSymbol[category].push(symbol);
  }

  for (const [category, symbols] of Object.entries(categoryToSymbol)) {
    const tableBody = document.getElementById("img-library-table");

    const title = document.createElement("h3");
    title.classList.add("fw-semibold", "px-3", "mt-2");
    title.setAttribute("id", "activities-img-row-title");
    title.textContent = category;

    tableBody.appendChild(title);

    const row = document.createElement("div");
    row.classList.add("d-flex", "row", "px-2", "py-3", "w-100");
    row.setAttribute("id", "activities-imgs-row");

    tableBody.appendChild(row);

    for (const symbol of symbols) {
      populateRow(row, symbol);
    }
  }
};

const initSymbolPlacements = async (symbolsById, symbolPlacements) => {
  for (const placement of symbolPlacements) {
    document.body.append(createSymbolPlacementElement(symbolsById, placement));
  }
};

const elPosForPointerPos = (el, x, y) => {
  return [x - el.offsetWidth / 2 + "px", y - el.offsetHeight / 2 + "px"];
};

// Weeks start on Monday and end on Sunday.
const getWeekBoundaries = (now, inCurrentWeek) => {
  // Monday
  const weekStart = new Date(now);
  if (!inCurrentWeek) {
    weekStart.setDate(weekStart.getDate() + 7);
  }
  // We handle 'Sunday' differently than the Date library. Mon-Sat are [0,5].
  let day = (weekStart.getDay() + 6) % 7;

  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return [weekStart, weekEnd];
};

(async () => {
  const symbolsInLibrary = document.getElementsByClassName("symbol");
  const inCurrentWeek = document.querySelector("#hdnWeek").value === "1";

  const [weekStart, weekEnd] = getWeekBoundaries(new Date(), inCurrentWeek);

  const [symbolsById, symbolPlacements, touchDelay] = await Promise.all([
    getSymbolsById(),
    ipcRenderer.invoke("get-symbol-placements", weekStart, weekEnd),
    ipcRenderer.invoke("get-hold-value"),
  ]);

  const dragStartEvents = ["touchstart", "mousedown"];
  const dragMoveEvents = ["touchmove", "mousemove"];
  const dragEndEvents = ["touchend", "mouseup"];

  const sideMenuWrapper = document.getElementById("divSidemenu");

  let delay;

  function clickDrag() {
    Array.prototype.forEach.call(symbolsInLibrary, (symbol) => {
      function removeDelayChecks() {
        clearTimeout(delay);

        dragEndEvents.forEach((event) =>
          symbol.removeEventListener(event, removeDelayChecks)
        );
        dragMoveEvents.forEach((event) =>
          document.removeEventListener(event, removeDelayChecks)
        );
      }

      const dragStart = (event) => {
        removeDelayChecks();
        document.querySelector(".isLeftToggle").checked
          ? (sideMenuWrapper.style.left = "-100%")
          : (sideMenuWrapper.style.right = "-100%");
        if (!symbol.classList.contains("symbol-placement")) {
          const clone = symbol.cloneNode(true);
          clone.setAttribute("listener", "false");
          let parent = symbol.parentNode;
          parent.append(clone);

          //finally add copy class to image
          dragStartEvents.forEach((event) => {
            symbol.removeEventListener(event, dragDelay);
            symbol.addEventListener(event, dragStart);
          });

          symbol.classList.add("symbol-placement");
        }

        symbol.style.zIndex = 2;
        document.body.append(symbol);

        showDeletionBox();

        event.preventDefault();

        const centerImageUnderPointer = (event) => {
          const { pageX, pageY } =
            event instanceof TouchEvent ? event.changedTouches[0] : event;

          const [left, top] = elPosForPointerPos(symbol, pageX, pageY);
          symbol.style.left = left;
          symbol.style.top = top;
        };

        centerImageUnderPointer(event);

        // (2) move the image on mousemove
        dragMoveEvents.forEach((event) =>
          document.addEventListener(event, centerImageUnderPointer)
        );
        var toggleBarPageX = document
          .getElementById("toggleBar")
          .getBoundingClientRect().x;

        const deletionContainer = document.getElementsByClassName(
          "trash-box-container"
        );
        if (deletionContainer.length == 0) {
          // this shouldn't happen but just in case
          throw new Error(
            "Unable to find element trash-box-container by class name"
          );
        }
        const deletionBox = document.getElementsByClassName(
          "trash-box-container"
        )[0];
        const deletionBoxBottom = deletionBox.getBoundingClientRect().bottom;
        console.debug(`DeletionBox bottom (Y coord): ${deletionBoxBottom}`);

        // (3) drop the image, remove unneeded handlers
        const dragEnd = (endEvent) => {
          document.querySelector(".isLeftToggle").checked
            ? (sideMenuWrapper.style.left = 0)
            : (sideMenuWrapper.style.right = 0);
          hideDeletionBox();
          dragMoveEvents.forEach((event) =>
            document.removeEventListener(event, centerImageUnderPointer)
          );

          dragEndEvents.forEach((dragEndEvent) =>
            event.target.removeEventListener(dragEndEvent, dragEnd)
          );

          const symbolPlacementId = symbol.getAttribute("symbol-placement-id");

          const { pageX, pageY } =
            endEvent instanceof TouchEvent
              ? endEvent.changedTouches[0]
              : endEvent;

          const [elX, elY] = elPosForPointerPos(symbol, pageX, pageY);

          // We preemptively remove the symbol and have later logic add it back
          // in when appropriate.
          symbol.remove();
          // Check if in deletion area
          if (pageY < deletionBoxBottom) {
            if (symbolPlacementId) {
              ipcRenderer.invoke("delete-symbol-placement", symbolPlacementId);
            }
            return;
          }

          if (open && pageX < toggleBarPageX == isLeft) {
            return;
          }

          const symbolId = symbol.getAttribute("data-id");

          // For now, we don't place symbols in the exact day and arbitrarily
          // choose `weekStart` as the date that fits within the boundary.
          if (symbolPlacementId) {
            document.body.appendChild(symbol);
            symbol.style.zIndex = 0; //Drop the image below the sidebar
            ipcRenderer.invoke(
              "update-symbol-placement",
              symbolPlacementId,
              weekStart,
              elX,
              elY
            );
          } else {
            ipcRenderer
              .invoke("create-symbol-placement", symbolId, weekStart, elX, elY)
              .then((placement) => {
                document.body.append(
                  createSymbolPlacementElement(symbolsById, placement)
                );
              });
          }
        };

        dragEndEvents.forEach((event) =>
          symbol.addEventListener(event, dragEnd)
        );

        symbol.ondragstart = function () {
          return false;
        };
      };

      function dragDelay(event) {
        console.log(`touchDelay: ${touchDelay}`);
        if (event instanceof MouseEvent) {
          dragStart(event);
        } else {
          delay = setTimeout(dragStart, touchDelay, event);
        }

        dragEndEvents.forEach((event) =>
          symbol.addEventListener(event, removeDelayChecks)
        );
        dragMoveEvents.forEach((event) =>
          document.addEventListener(event, removeDelayChecks)
        );
      }

      if (symbol.getAttribute("listener") !== "true") {
        const dragEvent = symbol.classList.contains("copy")
          ? dragStart
          : dragDelay;
        dragStartEvents.forEach((event) =>
          symbol.addEventListener(event, dragEvent)
        );
        symbol.setAttribute("listener", "true");
      }
    });
  }

  initSymbolLibrary(Object.values(symbolsById));
  initSymbolPlacements(symbolsById, symbolPlacements);
  //check for new clones every 3 secs
  setInterval(() => {
    clickDrag();
  }, 1000);
})();
