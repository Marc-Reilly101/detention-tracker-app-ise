
/*
    app.js works to make the application mobile friendly. It does this by making use of numerous document.querySelectorAll()
    calls to select elements that would render incorrectly in a reduced viewport, and adjust them as appropraite.

    This code is only executed if the client's screen is below a certain size, as determined by window.innerWidth.
*/

var screenLayout = "default"
if(window.innerWidth <= 500) screenLayout = "decreased";

if(screenLayout == "decreased") {
    document.querySelectorAll(".lineBreak").forEach(element => { 
        const lineBreak = document.createElement("p");
        element.appendChild(lineBreak);
    });
    document.querySelectorAll(".container").forEach(element => { element.style.maxWidth = "300px"; });
    document.querySelectorAll(".textbox").forEach(element => { element.style.width = "300px"; });
    document.querySelectorAll(".selectionBox").forEach(element => { element.style.width = "250px"; });
    document.querySelectorAll(".long-selectionBox").forEach(element => { element.style.width = "310px"; });
    mainscreen_toolbar.style.float = "none";
}