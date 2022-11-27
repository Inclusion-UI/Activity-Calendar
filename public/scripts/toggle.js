var open = false;
let leftSideMenu = document.querySelector(".sidemenu");
let sideBarImg = document.querySelector(".sidebar");
let switchTitle = document.querySelector(".switch-title");
var isLeft = false;
const sideToggleBtn = document.querySelector("#toggle_left");

//gets current page
var path = window.location.pathname;
var page = path.split("/").pop();

// this function is to transition settings sidebar from right to left side of screen
function switchToLeft() {
  console.log(leftSideMenu);
  console.log("toggle has been clicked!");
  //reset isLeft based on
  isLeft = sideToggleBtn.checked;

  //when toggle is clicked
  if (!isLeft) {
    //left settings should be on
    //swap classes to -left
    leftSideMenu.classList.remove("sidemenu");
    leftSideMenu.classList.add("menuOnLeft");

    //swap classes and text of the "Switch to..." title
    switchTitle.classList.remove("switch-title");
    switchTitle.classList.add("switch-title-left");
    switchTitle.innerHTML = "Switch to right";
    //swap bar classes too
    sideBarImg.classList.remove("sidebar");
    sideBarImg.classList.add("barOnLeft");
    //set the toggle btn based on new class
    leftSideMenu = document.querySelector(".menuOnLeft");
    sideBarImg = document.querySelector(".barOnLeft");

    /* Switch position of menu toggle */
    document
      .querySelector("#divSidemenu")
      .insertBefore(
        document.querySelector("#menuWrapper"),
        document.querySelector("#toggleBar")
      );

    //set the toggle to ON (blue)
    setTimeout(() => {
      sideToggleBtn.checked = true;
      console.log(sideToggleBtn);
      console.log(sideToggleBtn.checked);
      //set isLeft boolean to TRUE
      console.log("done");
    }, 1500);
    isLeft = true;
    console.log("finished!!!");
  } else {
    //left settings should be off
    leftSideMenu.style = "";
    //swap classes to default
    leftSideMenu.classList.remove("menuOnLeft");
    leftSideMenu.classList.add("sidemenu");
    //swap classes and text of "Switch to..." title to its defaults
    switchTitle.classList.remove("switch-title-left");
    switchTitle.classList.add("switch-title");
    switchTitle.innerHTML = "Switch to left";
    //swap bar classes too
    sideBarImg.classList.remove("barOnLeft");
    sideBarImg.classList.add("sidebar");
    //set the toggle btn based on new class
    leftSideMenu = document.querySelector(".sidemenu");

    // Leave side menu open after toggling
    leftSideMenu.style.right = "0px";
    sideBarImg = document.querySelector(".sidebar");

    /* Switch position of menu toggle */
    document
      .querySelector("#divSidemenu")
      .insertBefore(
        document.querySelector("#toggleBar"),
        document.querySelector("#menuWrapper")
      );

    //set toggle to OFF (grey)
    setTimeout(() => {
      sideToggleBtn.checked = false;
      console.log(sideToggleBtn);
      console.log(sideToggleBtn.checked);
      //set isLeft boolean to FALSE

      console.log("done 2");
    }, 1500);
    isLeft = false;
    console.log("finished 2!!!");
  }
}

//open the settings page from the sidebar button
function goToSettings() {
  console.log("settings cog has been clicked.");
  window.location.href = "settings.html";
}
