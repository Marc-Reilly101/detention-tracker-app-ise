![image](https://i.imgur.com/Qyl1uVl.png)
# Detention Tracker Application - ISE Entrance Submission
*Technology Project Report for University of Limerick - ISE Submission*

---
The Detention Tracker Application is a web service designed to record and keep track of detentions in a school environment. It is a deployed service actively used by nine administrators.
The purpose of this README is to provide additional architectural details of the app's codebase.<br>
[See the live deployed application here (not production version)](https://detention-tracker-ul.netlify.app/)<br>
*The password is: ise2027*

### Note on Repository
The application was not developed alongside git. This repository's commit history may not be fully representative of the actual development timeline - it's existing version of events serves to provide a basic idea of development history and some small problems that occured.

---
## Tech Stack
- Vanilla JavaScript, without the use of a front-end framework such as ReactJS.
- Deployed using Netlify.
- Backend using two serverless functions *(See Section 3 in main report)*.
- Database store via two JSONBin endpoints.
- Uses SweetAlert2 for dialogue and confirmation boxes.

## Architecture
- Heavy use made of individual objects dedicated to different areas of service (detention addition, detention removal, attendance, etc.)
  ```javascript
    /*
    Attendance Functions Module
    Manages daily detention attendance tracking with one-time submission per day.
    Attendance resets daily at midnight Coordinated Universal Time (handled by App.checkData).
    */
    const attendanceFunctions = {...}
  ```
- Numerous methods in these objects dedicated to particular tasks. Large tasks separated into multiple methods for debugging purposes.
  ```javascript
    /*
    verifyDetentionToday() - Checks if detentions are scheduled today and if
    attendance hasn't been submitted yet (prevents duplicate submissions)
    */
    verifyDetentionToday: function() {
       ...
    },
    ...
  ```
---
- The app is displayed in one singular page. Its menus are divided into different div elements called "screens" who's visibility can be toggled via the ```UI``` object's ```goTo()``` method.
  ```html
    <div id="mainscreen" class="hidden">
        <div class="header"><b>St. Colman's | Detention Book</b></div>
        <!-- webcontent classes used to establish margin sizes, and element alignment -->
        <div class="webcontent">
            ...
        </div>
    </div>
  ```
  ```javascript
    const UI = {
      currentScreen: "...",

      //The goTo method manages screen navigation and initialises form cleanup for relevant menus (profilesearchscreen, addstudentscreen, etc.)
      goTo: function(to, from) {
          var destinationScreen = to;
          //Additional menu-specific code goes here...
  
          document.getElementById(destinationScreen).style.display = "block";
          document.getElementById(from).style.display = "none";
      },
      ...
    };
  ```
  
### Note on use of AI
Certain areas of the codebase were developed with *the help* of artificial intelligence. Usage was limited to where assistance was genuinely needed to solve an issue, or to suggest
ways to improve existing infrastructure. In limited circumstances, AI-generated concepts were sourced and deployed, however the core architecture and codebase as it stands is my work. All usage of AI is recorded, and is labelled accordingly in the repository. All concepts derived from AI were tested rigorously before deployment.
*The design of this application's user interface, the codebase architecture and the application's features are exclusively my work.*
