const ipcSettingsRenderer = require("electron").ipcRenderer;

var slider = document.getElementById("delayRange");
var output = document.getElementById("delayValue");

function returnToMain() {
  window.history.back();
}

function initializeSettings() {
  ipcSettingsRenderer.invoke("get-hold-value").then((value) => {
    slider.value = value;
    output.innerHTML = value + "ms";
  });
}

slider.oninput = function () {
  output.innerHTML = this.value + "ms";
};

slider.onchange = function () {
  ipcSettingsRenderer.invoke("set-hold-value", this.value).then((isUpdated) => {
    output.innerHTML = this.value + "ms";
    if (!isUpdated) console.log("ERROR: new value wasn't saved in DB");
  });
};

function goToSymbolCreator() {
  console.log("symbol creator cog has been clicked.");
  window.location.href = "symbol_creator.html";
}

function goToSymbolLibrary() {
  console.log("symbol library cog has been clicked.");
  window.location.href = "symbol_library.html";
}


initializeSettings();
