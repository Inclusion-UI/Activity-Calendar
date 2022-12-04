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

var base64img;
var type = "people";
var slider = document.getElementById("zoomSlider");
var image;
var pimage = document.getElementById("previewImg");

var previewLabel = document.getElementById("previewLabel");

var nameInputContainer = document.getElementById("nameInputContainer");
var _imagePath;


previewLabel.style.height = "64px";
previewLabel.style.width = "229px";
previewLabel.style.backgroundColor = "#fff";
previewLabel.style.color = "#000";
previewLabel.style.position = "absolute";
previewLabel.style.textAlign = "center";
previewLabel.style.fontFamily = "Billionary";
previewLabel.style.bottom = "0px";
previewLabel.style.borderBottomLeftRadius = "45px";
previewLabel.style.borderBottomRightRadius = "45px";
previewLabel.style.fontSize = "30px";
previewLabel.style.fontWeight = "bold";
previewLabel.style.display = "flex";
previewLabel.style.justifyContent = "center";
previewLabel.style.alignItems = "center";
previewLabel.style.zIndex = "1";

var previewContainer = document.getElementById("previewContainer");
previewContainer.style.height = "229px";
previewContainer.style.width = "229px";

var _img;

// the mouse
var m = {
    x: 0,
    y: 0
}; // mouse coords on mouse down
var last_m = {
    x: 0,
    y: 0
};
// mouse coords on dragging
// distance
var d = {
    x: 0,
    y: 0
}; // distance while dragging
var D = {
    x: 0,
    y: 0
}; // distance on mouse up

var _x = 0;
var _y = 0;
var _img;
var _value = "people";
var _category;

var _image;

var dragging = false;

var zoomLvl = 1;
var themeDropdown = document.getElementById("themeSelector");
// WIP: theme selection logic

// Theme colors
var themeColors = [
    "#FBEACC", // Settings background color
    "Black", // General text color
    "#FBEBCC", // Table Mon/Wed/Fri/Sun color
    "#FBF7EF", // Table Tue/Thu/Sat color
    "#FBD988", // Sidebar color
];
var themeColorVarNames = [
    "--settings-bg-color",
    "--general-text-color",
    "--table-mwfu-color",
    "--table-trs-color",
    "--sidebar-color",
];

// Call to open electron dialog and select image file
// returns base64 encoded image string
async function selectImage() {
    return ipcSettingsRenderer.invoke("select-image").then((img) => { // console.log(fs)
        _imagePath = img.filePaths[0];
        console.log(_imagePath);
        _img = fs.readFileSync(img.filePaths[0]).toString("base64");
        return _img;
    });
}
//test commit
/*****************************************************************/
var _initX;
var _initY;

pimage.addEventListener("mousedown", (evt) => {
    evt.preventDefault();
    _initX = evt.clientX;
    _initY = evt.clientY;

    // console.log('mouse down')
    dragging = true;
    console.log("dragging");
    console.log(pimage.style.left);
    // the mouse position
    // m = oMousePos(imgCanvas, evt);
    // console.log(m)
    // drawImage();
});

previewImg.addEventListener("mouseup", (evt) => { // console.log('mouse up')
    dragging = false;
    _x = pimage.style.left;
    _y = pimage.style.top;

    // drawImage();
});

previewImg.addEventListener("mousemove", (evt) => {
    if (dragging) {
        var _x = evt.clientX - _initX;
        var _y = evt.clientY - _initY;
        pimage.style.left = _x + "px";
        pimage.style.top = _y + "px";
    }
});

function oMousePos(canvas, evt) {
    var ClientRect = canvas.getBoundingClientRect();
    var x = evt.clientX - ClientRect.left;
    var y = evt.clientY - ClientRect.top;
    return {x: x, y: y};
}

function selectSymbolImage(event) {
    var type = event.currentTarget.id.split("-")[0];
    _value = document.querySelector("#type-dropdown").value;

    var cat = type;
    if (type === "activities") {
        cat = document.querySelector("#type-dropdown").value;
    }
    // console.log(type);
    selectImage().then((_base64img) => {
        image = new Image();
        base64img = _base64img;
        _img = _base64img;
        image.src = "data:image/png;base64," + base64img;
        document.getElementById("imageContainer").style.display = "block";
        image.onload = function () { // drawImage();
            applyChanges();
        };
    });
}

// return to index.html page
function returnToMain() {
    window.history.back();
}

slider.oninput = function () { // console.log(this.value)
    zoomLvl = this.value / 100;
    applyChanges();
};

function symbolNameChange() {
    var name = document.getElementById("symbolName").value;
    // console.log(name)
    previewLabelText.innerHTML = name;
    applyChanges();
}

function changeSymbolType() {
    _value = document.querySelector("#type-dropdown").value;
    type = _value;
    if (_value === "people") {
        previewContainer.width = 229;
        previewContainer.height = 229;
        previewContainer.style.borderRadius = "45px";
        nameInputContainer.style.display = "flex";
    } else if (_value === "transportation") {
        previewContainer.width = 285;
        previewContainer.height = 270;
        previewContainer.style.borderRadius = "0px";
        nameInputContainer.style.display = "none";
    } else if (_value === "activities") {
        previewContainer.width = 300;
        previewContainer.height = 290;
        previewContainer.style.borderRadius = "55px";

        nameInputContainer.style.display = "block";
    }
    if (cw && ch) {
        cw = previewContainer.width;
        ch = previewContainer.height;
    }

    if (base64img) {
        drawImage();
        applyChanges();
    }
}

function changeSymbolCategory() {
    _category = document.querySelector("#category-dropdown").value;
}

async function submitForm() { // imagePath, name, type, posX, posY, zoom, categoryId

    ipcSettingsRenderer.invoke("create-symbol", _imagePath, document.getElementById("symbolName").value, _value, _x, _y, zoomLvl, _category).then((res) => {
        console.log(res);
    });
}

function applyChanges() {
    pimage.src = "data:image/png;base64," + _img;

    previewContainer.style.position = "relative";
    previewContainer.style.overflow = "hidden";
    pimage.style.zoom = zoomLvl * 100 + "%";
    // console.log(zoomLvl*100+'%')
    if (_value === "people") { 
        pimage.style.width = "229px";
        pimage.style.height = "229px";
        pimage.style.position = "absolute";
        pimage.style.top = _y + "px";
        pimage.style.left = _x + "px";

        previewContainer.style.borderRadius = "45px";
        previewLabel.style.borderBottomLeftRadius = "45px";
        previewLabel.style.borderBottomRightRadius = "45px";
        previewContainer.style.height = "229px";
        previewContainer.style.width = "229px";
        previewLabel.style.width = "229px";
        previewLabel.style.display = "flex";
    } else if (_value === "transportation") { // console.log('transport')

        pimage.style.width = "285px";
        pimage.style.height = "270px";
        pimage.style.position = "absolute";
        pimage.style.top = _x;
        pimage.style.left = _y;

        previewContainer.style.borderRadius = "0px";
        previewContainer.style.height = "270px";
        previewContainer.style.width = "285px";
        previewLabel.style.display = "none";
    } else if (_value === "activities") { // console.log('activity')

        pimage.style.width = "300px";
        pimage.style.height = "290px";
        pimage.style.position = "absolute";
        pimage.style.top = _x;
        pimage.style.left = _y;

        previewContainer.style.borderRadius = "55px";
        previewLabel.style.height = "64px";
        previewLabel.style.width = "300px";
        previewLabel.style.borderBottomLeftRadius = "55px";
        previewLabel.style.borderBottomRightRadius = "55px";
        previewContainer.style.height = "290px";
        previewContainer.style.width = "300px";
        previewLabel.style.display = "flex";
    }
    _image = pimage;

    previewContainer.appendChild(pimage);
}

function getChangedStyles(obj) {
    var styles = Object.keys(obj.style).reduce(
        // return key if obj.style[key] is not ""
            function (a, k) {
            if (obj.style[k] && isNaN(k)) {
                a[k] = obj.style[k];
            }
            return a;
        },
        {}
    );
    return styles;
}
