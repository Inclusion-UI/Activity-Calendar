/*
 * Activity Calendar App
 * 2021-09-12
 * PM: Jack Everard
 * Developers: Vaaranan Yogalingam, Kyle Flores, Azhya Knox
 *
 */

/*****************************************************************/
/* IPC FUNCTIONS */
const ipcSettingsRenderer = require("electron").ipcRenderer;

const fs = require("fs");


function getCategories() {
    return ipcSettingsRenderer.invoke("get-categories").then((categories) => {

        return categories;
    });
}

function getSymbols() {
    return ipcSettingsRenderer.invoke("get-symbols").then((symbols) => {
        return symbols;
    });
}


var _categories;

console.log('libdeyim')
getCategories().then((categories) => {
    console.log(categories);
    _categories = categories;
    var categoryList = document.getElementById("categoryList");
    for (var i = 0; i < categories.length; i++) {
        var category = categories[i];
        var categoryDiv = document.createElement("div");
        categoryDiv.classList.add("category");
        categoryDiv.id = category.id;

        var categoryLabel = document.createElement("label");
        categoryLabel.classList.add("categoryLabel");
        categoryLabel.innerHTML = category.name;

       

        categoryDiv.appendChild(categoryLabel);
        categoryList.appendChild(categoryDiv);
    }
    getSymbols().then((symbols) => {
        console.log(symbols);
    });
});



// return to index.html page
function returnToMain() {
    window.history.back();
}



/**
 * 
    ipcSettingsRenderer.invoke("create-symbol", _imagePath, document.getElementById("symbolName").value, _value, _x, _y, zoomLvl, _category).then((res) => {
        console.log(res);
    });
 */
