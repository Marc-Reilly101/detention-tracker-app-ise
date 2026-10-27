const UI = {
    currentScreen: "passwordscreen",
    enteredFridayList: false,

    //The goTo method manages screen navigation and initialises form cleanup for relevant menus (profilesearchscreen, addstudentscreen, etc.)
    goTo: function(to, from) {
        var destinationScreen = to;
        if(from == "addstudentscreen") this.resetScreen(from);
        if(from == "profilesearchscreen" && destinationScreen != "viewprofilescreen") this.resetScreen(from);
        if(from == "viewprofilescreen" && this.enteredFridayList) {
            destinationScreen = "fridaydetentionsneededscreen";
            this.enteredFridayList = false;
        }
        if(destinationScreen != "loadingscreen") this.currentScreen = destinationScreen;
        if(destinationScreen == "viewentryscreen") viewEntryFunctions.viewingFrom = from;

        //If it is detected that the destination screeen is fridaydetentionsneededscreen, proper handler methods are called.
        if(destinationScreen == "fridaydetentionsneededscreen") fridayDetentionFunctions.initNeededFridayDetentionsScreen();

        document.getElementById(destinationScreen).style.display = "block";
        document.getElementById(from).style.display = "none";
    },
    //The updateLoading method manages transitions to the loading screen when needed. The currentScreen property tracks which menu was viewed last so that it can be properly restored.
    updateLoading: function(status) {
        status == "busy" ? this.goTo("loadingscreen", this.currentScreen) : this.goTo(this.currentScreen, "loadingscreen");
    },
    resetScreen: function(screen) {
        if(screen == "addstudentscreen") {
            addstudentscreen_nameBox.value = "";
            addstudentscreen_yearBox.value = "-- Select Year Group --";
            addstudentscreen_singleDetentionRadio.checked = false;
            addstudentscreen_doubleDetentionRadio.checked = false;
            addstudentscreen_fridayDetentionRadio.checked = false;
            addstudentscreen_singleDetentionConfig.style.display = "none";
            addstudentscreen_doubleDetentionConfig.style.display = "none";
            addstudentscreen_fridayDetentionConfig.style.display = "none";
            addstudentscreen_singleDetentionDateBox.value = "";
            addstudentscreen_doubleDetentionDateBoxOne.value = "";
            addstudentscreen_doubleDetentionDateBoxTwo.value = "";
            addstudentscreen_fridayDetentionDateBox.value = "";
            addstudentscreen_reasonBox.value = "Phone not in Pouch";
            addstudentscreen_customReasonConfig.style.display = "none";
            addstudentscreen_customReasonBox.value = "";
            addstudentscreen_teacherBox.value = "-- Scheduled By --";
            addstudentscreen_otherTeacherConfig.style.display = "none";
            addstudentscreen_otherTeacherBox.value = "";
        }
        if(screen == "profilesearchscreen") {
            profilesearchscreen_searchBox.value = "";
            profilesearchscreen_profileList.innerHTML = "";
        }
    },
    //The initEventListeners method adds all event listeners used throughout the app. This predominantly includes addstudentscreen menu elements.
    initEventListeners: function() {

        document.getElementById("mainscreen_yearFilter").addEventListener("change", () => detentionListFunctions.loadDetentionList());
        document.getElementById("mainscreen_timeFilter").addEventListener("change", () => detentionListFunctions.loadDetentionList());
        document.getElementById("recordscreen_dateFilter").addEventListener("change", () => detentionListFunctions.loadDetentionList());
        document.getElementById("recordscreen_nameFilter").addEventListener("change", () => detentionListFunctions.loadDetentionList());

        document.getElementById("addstudentscreen_singleDetentionRadio").addEventListener("change", function(e) {
            if(addstudentscreen_singleDetentionRadio.checked) {
                addstudentscreen_singleDetentionConfig.style.display = "block";
                addstudentscreen_doubleDetentionConfig.style.display = "none";
                addstudentscreen_fridayDetentionConfig.style.display = "none";
            }
        });
        document.getElementById("addstudentscreen_doubleDetentionRadio").addEventListener("change", function(e) {
            if(addstudentscreen_doubleDetentionRadio.checked) {
                addstudentscreen_singleDetentionConfig.style.display = "none";
                addstudentscreen_doubleDetentionConfig.style.display = "block";
                addstudentscreen_fridayDetentionConfig.style.display = "none";
            }
        });
        document.getElementById("addstudentscreen_fridayDetentionRadio").addEventListener("change", function(e) {
            if(addstudentscreen_fridayDetentionRadio.checked) {
                addstudentscreen_singleDetentionConfig.style.display = "none";
                addstudentscreen_doubleDetentionConfig.style.display = "none";
                addstudentscreen_fridayDetentionConfig.style.display = "block";
            }
        });

        document.getElementById("profilesearchscreen_searchBox").addEventListener("change", function(e) {
            profileFunctions.searchProfiles();
        });
    }
};








const App = {
    fetchError: false,
    detentions: [],
    studentProfiles: [],
    reports: [],
    fridayDetentionsNeeded: [],
    attendanceTaken: "",
    attendanceTakenDate: "",
    bins: ["detentions", "studentProfiles", "reports"],
    //The start method initialises the app and all of its helper functions. For example, it loads all data from remote bins via Netlify proxy, and populates the detention lists.
    start: async function() {
        UI.goTo("mainscreen", "passwordscreen")
        UI.updateLoading("busy")
        await this.readData();
        if(this.fetchError) return;
        await this.checkData();
        profileFunctions.syncProfiles();
        fridayDetentionFunctions.checkFridayDetentions();
        UI.initEventListeners()
        detentionListFunctions.loadDetentionList();
        UI.updateLoading("none")
    },
    //The formatDate method generates a string in the yyyy-mm-dd format from a JavaScript date object.
    formatDate: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        //condensed code sourced from AI - works reliably: used .padStart() and .getMonth() methods
        return `${year}-${month}-${day}`;
    },
    //The getCentralDate method gets the current date as it is defined by UTC (Coordinated Universal Time) standards.
    getCentralDate: function() {
        const now = new Date();
        const centralYear = now.getUTCFullYear();
        const centralMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
        const centralDay = String(now.getUTCDate()).padStart(2, "0");
        return `${centralYear}-${centralMonth}-${centralDay}`;
    },
    //The getDay method returns the current day of the week. This method is used throughout the app where needed.
    getDay: function() {
        const today = new Date();
        const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
        return dayName;
    },
    //The getCurrentTimeString method returns a formatted time string in the HH:MM AM/PM format - not in 24-hour format for ease-of-understanding.
    getCurrentTimeString() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    },
    //readData() - Fetches from all three data bins in parallel using Promise.all with an Array.map() function.
    readData: async function() {
        if(localStorage.stcd_authenticated != "true") return;
        //Dedicated to use Promise.all for best performance (simultaneous operations)
        await Promise.all(App.bins.map(async (bin) => {
            try {
                const response = await fetch(`/.netlify/functions/database-proxy?target=${encodeURIComponent(bin)}`, {method: "GET"});
                /*a request is sent to the database-proxy function with the target bin encoded as a URI component to be 
                processed by the function. (See CORS errors in main report)*/

                if(!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                /*If the response is not successful, as indicated by response.ok, an error is thrown to the console. This usually 
                  suggests network issues (caused by loss of wifi, or service outages).
                */

                const data = await response.json();
                const responseData = data.record;
                //extracts raw JSON data from response.record.

                console.log(`Data fetched from bin: ${bin}`, responseData);
                //the extracted data is logged to the console for debugging purposes if ever needed.

                App.parseData(responseData, bin)
                /*tShe raw JSON data is sent to App.parseData() with its corresponding bin argument. 
                This assigns each local array (cache) to its corresponding data object.*/
            } 
            catch(error) {
                console.error("Error fetching data:", error);
                Swal.fire({
                    text: "An error occured while fetching data. Please refresh page. If error persists, please contact appropriate administrators.",
                    icon: "error",
                    confirmButtonText: "OK",
                }).then(() => location.reload());
                App.fetchError = true;
            }
        }));
    },
    //parseData() - Distributes fetched data to appropriate properties
    parseData: async function(data, bin) {
        if(App.fetchError) return;
        if(bin == "detentions") {
            App.detentions = data.detentions;
            App.attendanceTaken = data.attendanceData[0];
            App.attendanceTakenDate = data.attendanceData[1];
        }
        if(bin == "studentProfiles") App.studentProfiles = data.studentProfiles;
        if(bin == "reports") App.reports = data.reports;
    },
    //checkData() - Performs daily reset logic (attendance)
    checkData: async function() {
        var changesMade = false;
        var formattedDate = this.getCentralDate()

        if(App.attendanceTakenDate != formattedDate) {
            App.attendanceTakenDate = formattedDate;
            App.attendanceTaken = "f";
            changesMade = true;
        }
        if(changesMade) await this.writeData(0);
    },
    //writeData() - Persists changes back to specific bin with version checking
    writeData: async function(binIndex) {
        if(App.fetchError) return;

        //Three "bin configs" are initialised here, specifying what data needs to be written, and in what format. It is done so with stored callback functions.
        const binConfigs = [
            {data: () => ({detentions: App.detentions, attendanceData: [App.attendanceTaken, App.attendanceTakenDate]})},
            {data: () => ({studentProfiles: App.studentProfiles})},
            {data: () => App.reports.length > 0 ? {reports: App.reports} : null}
        ];
        const config = binConfigs[binIndex];
        if(!config) return;
        
        const dataObject = config.data();
        if(!dataObject) return;
        const binName = App.bins[binIndex];

        try {
            //The bin name is sent securely with the request at this point for use by the proxy. This is done with the encodeURIComponent() method.
            const response = await fetch(`/.netlify/functions/database-proxy?target=${encodeURIComponent(binName)}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json", "X-Version": version},
                body: JSON.stringify(dataObject)
            });
            if(!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            console.log(`Successfully updated bin: ${binName}`, data);
        } 
        catch(error) {
            console.error("Error updating JSONBin:", error);
            if(!App.staleVersionError) App.showAlert("An error occured while writing data - your changes have not saved. Please check your internet connection and refresh this page.", "error");
        }
    },
    //updateData() - Coordinates full system update across all bins
    updateData: async function(wait = true) {
        if(wait) UI.updateLoading("busy")
        profileFunctions.syncProfiles();
        detentionListFunctions.loadDetentionList()
        fridayDetentionFunctions.checkFridayDetentions();

        //Another Promise.all statement to execute all write operations in parallel, minimising wait times.
        await Promise.all([
            App.writeData(0),
            App.writeData(1),
            App.writeData(2)
        ]);
        UI.updateLoading("none");
    },
    //The fileReport method accepts a type and "changeData" argument that specifies what data needs to be logged, and what bin / action it is relevant to.
    fileReport: function(type, changeData) {
        const currentDate = App.getCentralDate();
        const currentTime = App.getCurrentTimeString();
        const formatDateRange = (data) => data.dateOne ? `${data.dateOne} -- ${data.dateTwo}` : data.date;
        const formatEntry = (data) => `[Name: ${data.name}, Year: ${data.year}, Date(s): ${formatDateRange(data)}, Reason: ${data.reason}]`;
        const logReport = (message) => App.reports.push(`${message} on ${currentDate} at ${currentTime}`);

        //switch statement :D, experiment from python match/case statement.
        switch(type) {
            case "addition":
                logReport(`USER: ${changeData.data.teacher} - ADDED ENTRY: ${formatEntry(changeData)}`);
                break;
            case "removal":
                logReport(`USER - REMOVED ENTRY: ${formatEntry(changeData)}`);
                break;
            case "attendance":
                const attendanceList = changeData.map(data => `(${data.name} - ${data.attendance})`).join("");
                logReport(`USER - SUBMITTED ATTENDANCE: [${attendanceList}]`);
                break;
        }
    },
    //The showAlert method serves as a centralised way to show standard dialogue boxes using the SweetAlert2 API. 
    //Other dialogue options such as prompts or confirmations are not handled by this method
    showAlert: function(text, icon) {
        Swal.fire({
            text,
            icon,
            confirmButtonText: "OK"
        });
    }
};






































const entryAdditionFunctions = {
    //The addDetentionEntry method initialises and manages the entire entry addition sequence.
    addDetentionEntry: async function() {
        const formData = this.getFormData("addstudentscreen");
        const errors = this.validateDetentionEntry(formData);

        //Errors are saved in an array, before handled appropriately in this if-else statement.
        if(errors.length > 0) {
            if(errors[0] == "This student already has a detention on this date." || errors[0] == "This student is already scheduled for detention on one of those dates.") {
                const result = await Swal.fire({
                    text: errors[0] + " Are you sure you want to continue?",
                    icon: "info",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Yes"
                });
                if(!result.isConfirmed) return;
            }
            else {
                App.showAlert(errors[0], "warning");
                return;
            }
        }

        const entryObject = this.createDetentionEntry(formData);
        App.detentions.push(entryObject);
        profileFunctions.updateOrCreateStudentProfile(formData.name, formData.year);
        UI.goTo("mainscreen", "addstudentscreen")
        mainscreen_yearFilter.value = "All Years";
        mainscreen_timeFilter.value = "All";

        App.fileReport("addition", entryObject)
        App.updateData(false);
        App.showAlert("Successfully added student to detention.", "success");
    },

    //getFormData() - Extracts all form values from add student screen
    getFormData: function(screen) {
        if(screen == "addstudentscreen") {
            const name = addstudentscreen_nameBox.value.trim();
            const year = addstudentscreen_yearBox.value;
            
            let detentionType = null;
            if(addstudentscreen_singleDetentionRadio.checked) detentionType = "single";
            if(addstudentscreen_doubleDetentionRadio.checked) detentionType = "double";
            if(addstudentscreen_fridayDetentionRadio.checked) detentionType = "friday";

            const dates = {
                single: addstudentscreen_singleDetentionDateBox.value,
                doubleOne: addstudentscreen_doubleDetentionDateBoxOne.value,
                doubleTwo: addstudentscreen_doubleDetentionDateBoxTwo.value,
                friday: addstudentscreen_fridayDetentionDateBox.value
            };

            const reason = addstudentscreen_reasonBox.value == "Other" ? addstudentscreen_customReasonBox.value : addstudentscreen_reasonBox.value;
            //Checks if the detention is configured as not counting toward a student's total.
            const notCounting = addstudentscreen_countingCheckbox.checked;

            return { name, year, detentionType, dates, reason };
        }
    },
    //validateDetentionEntry() - Performs comprehensive validation checks using various other methods.
    validateDetentionEntry: function(formData) {
        const errors = [];
        const { name, year, detentionType, dates, reason } = formData;

        if(name.length < 1) errors.push("Please enter a valid student name.");
        if(name.includes("-")) errors.push("Invalid character '-' in student name.");
        if(year == "-- Select Year Group --") errors.push("Please select a year group.");

        if(detentionType == "single") this.validateSingleDetention(name, dates.single, errors);
        if(detentionType == "double") this.validateDoubleDetention(name, dates.doubleOne, dates.doubleTwo, errors);
        if(detentionType == "friday") this.validateFridayDetention(name, dates.friday, errors);

        if(reason.length < 1) errors.push("Please enter a reason for detention.");
        return errors;
    },
    //The validateSingleDetention method performs all the necessary checks to avoid scheduling issues.
    validateSingleDetention: async function(name, date, errors) {
        if(!date) {
            errors.push("Please select a date for detention.");
            return;
        }
        if(!this.isValidWeekday(date)) {
            errors.push("Please select a valid weekday (Monday-Thursday) for detention.");
            return;
        }
        if(this.hasDetentionConflict(name, [date])) {
            errors.push("This student already has a detention on this date.");
            return;
        }

        let detentionQuantity = 0;
        App.detentions.forEach((detention) => {
            if(detention.date == date || detention.dateTwo == date || detention.dateOne == date) detentionQuantity++;
        });
        if(detentionQuantity > 20) {
            errors.push("Detention on " + date + " has reached the maximum capacity of twenty entries.");
            return;
        }
    },
    //The validateDoubleDetention method performs all the necessary checks to avoid scheduling issues for both detention dates.
    validateDoubleDetention: async function(name, dateOne, dateTwo, errors) {
        if(!dateOne || !dateTwo) {
            errors.push("Please select both dates for detention.");
            return;
        }
        if(dateTwo <= dateOne) {
            errors.push("The second date must come after the first date.");
            return;
        }
        if(!this.isValidWeekday(dateOne) || !this.isValidWeekday(dateTwo)) {
            errors.push("Please select valid weekdays for both detentions.");
            return;
        }
        if(this.hasDetentionConflict(name, [dateOne, dateTwo])) {
            errors.push("This student is already scheduled for detention on one of those dates.");
            return;
        }

        let detentionQuantityOne = 0;
        let detentionQuantityTwo = 0;
        App.detentions.forEach((detention) => {
            if(detention.dateOne == dateOne || detention.dateTwo == dateOne || detention.date == dateOne) detentionQuantityOne++;
            if(detention.dateTwo == dateOne || detention.dateTwo == dateTwo || detention.date == dateTwo) detentionQuantityTwo++;
        });

        if(detentionQuantityOne > 20) {
            errors.push("Detention on " + dateOne + " has reached the maximum capacity of twenty entries.");
            return;
        }
        if(detentionQuantityTwo > 20) {
            errors.push("Detention on " + dateTwo + " has reached the maximum capacity of twenty entries.");
            return;
        }
    },
    //The validateFridayDetention method performs all the necessary checks to avoid scheduling issues for after-school detentions.
    validateFridayDetention: async function(name, date, errors) {
        if(!date) {
            errors.push("Please select a date for detention.");
            return;
        }
        if(new Date(date).getDay() != 5) {
            errors.push("Please select a Friday for detention.");
            return;
        }
        if(this.hasDetentionConflict(name, [date])) {
            errors.push("This student already has a detention on this date.");
            return;
        }

        let detentionQuantity = 0;
        App.detentions.forEach((detention) => {
            if(detention.date == date || detention.dateOne == date || detention.dateTwo == date) detentionQuantity++;
        });

        //For Friday detentions, there can be up to fourty entries schedules at once, unlike the usual cap of twenty.
        if(detentionQuantity > 40) {
            errors.push("Detention on " + date + " has reached the maximum capacity forty entries.");
            return;
        }
    },
    //This helper method checks if the supplied date in the format yyyy-mm-dd is a valid weekday (Mon-Thu) for detentions that are not on Fridays.
    isValidWeekday: function(formattedDate) {
        const day = new Date(formattedDate).getDay();
        return day >= 1 && day <= 4;
    },
    //This specific method checks if a specific student has a scheduled detention within a specified set of dates. Works to check if scheduling conflicts exist.
    hasDetentionConflict: function(name, datesToCheck) {
        const loweredName = name.toLowerCase();
        var conflictDetected = false;
        datesToCheck.forEach((dateToCheck) => {
            for(let i = 0; i < App.detentions.length; i++) {
                if(App.detentions[i].name.toLowerCase() == loweredName) {
                    if(App.detentions[i].hasOwnProperty("dateOne")) {
                        if(App.detentions[i].dateOne == dateToCheck || App.detentions[i].dateTwo == dateToCheck) conflictDetected = true;
                        //Fixed duplicate dateTwo checks instead of dateOne. Lovely headache.
                    }
                    else {
                        if(App.detentions[i].date == dateToCheck) conflictDetected = true;
                    }
                }
            }
        });
        return conflictDetected;
    },
    //createDetentionEntry() - Constructs detention object with metadata such as scheduling teacher and date and time of addition.
    createDetentionEntry: function(formData) {
        const { name, year, detentionType, dates, reason } = formData;
        const tag = this.generateUniqueTag();
        const baseEntry = {
            name,
            year,
            reason,
            tag,
        };

        //The baseEntry specified above is copied using "..." notation, and the date properties are assigned based on detention type for the completed entry object.
        if(detentionType == "single") return { ...baseEntry, date: dates.single };
        if(detentionType == "double") return { ...baseEntry, dateOne: dates.doubleOne, dateTwo: dates.doubleTwo };
        if(detentionType == "friday") return { ...baseEntry, date: dates.friday };
    },
    //generateUniqueTag() - Creates collision-free 8-digit identifier
    generateUniqueTag: function() {
        let tag;
        const existingTags = new Set(App.detentions.map(detention => detention.tag));
        //Uses do / while statements to generate a tag that has no exact match in the database.
        do {
            tag = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
        } 
        while(existingTags.has(tag));
        return tag;
    }
};






















const entryRemovalFunctions = {
    removeDetentionEntry: async function() {
        const container = this.parentElement;
        const entryTag = entryRemovalFunctions.extractTagFromContainer(container);
        if(!entryTag) {
            App.showAlert("An unexpected error occured while deleting this entry.", "error");
            console.error("Could not extract tag from container");
            return;
        }
        const detention = entryRemovalFunctions.findDetentionByTag(App.detentions, entryTag);
        if(!detention) {
            App.showAlert("An unexpected error occured while deleting this entry.", "error");
            console.error(`No detention found with tag: ${entryTag}`);
            return;
        }
        const confirmed = await entryRemovalFunctions.confirmRemoval();
        if(confirmed) await entryRemovalFunctions.performDetentionRemoval(entryTag);
    },
    //extractTagFromContainer() - Parses the 8-digit tag from DOM element
    extractTagFromContainer: function(container) {
        const tagElement = Array.from(container.children).find(child => child.innerHTML.includes("Tag"));
        return tagElement ? tagElement.innerHTML.split(" ")[1] : null;
    },
    //findDetentionByTag() - Locates the detention record in App.detentions array
    findDetentionByTag: function(detentions, tag) {
        return detentions.find(detention => detention.tag == tag);
    },
    //getDetentionType() helper identifies detention category based on data structure:
    getDetentionType: function(detention) {
        if(detention.dateOne) return "double";
        const detentionDate = new Date(detention.date);
        detentionDate.setHours(0, 0, 0, 0);

        /*I used to declare a seperate variable for temporary values like that seen below, and then return that variable, but
          I learned that a tertiary statement can be used to both remove the need for that, and unnecessary if/else statements.
        */
        return detentionDate.getDay() == 5 ? "friday" : "single";
    },
    //confirmRemoval() - Prompts user for confirmation via modal dialog
    confirmRemoval: async function() {
        const result = await Swal.fire({
            text: "Are you sure you want to remove this entry? (Note: removing an entry removes both current and record entries.)",
            icon: "info",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes"
        });
        return result.isConfirmed;
    },
    //performDetentionRemoval() - Executes deletion and triggers data sync
    performDetentionRemoval: async function(entryTag) {
        const detentionIndex = App.detentions.findIndex(detention => detention.tag == entryTag);
        App.fileReport("removal", App.detentions[detentionIndex])
        if(detentionIndex != -1) App.detentions.splice(detentionIndex, 1);
        App.showAlert("Entry successfully removed. Please do not close tab.", "success")
        await App.updateData(false);
    }
};
























const fridayDetentionFunctions = {
    /*
    initNeededFridayDetentionsScreen() - Renders clickable list of students
    who qualify but haven't been scheduled yet
    */
    initNeededFridayDetentionsScreen: function() {
        fridaydetentionsneededscreen_studentList.innerHTML = "";
        for(let i = 0; i < App.fridayDetentionsNeeded.length; i++) {
            var newProfile = document.createElement("h3");
            newProfile.innerHTML = App.fridayDetentionsNeeded[i];
            newProfile.className = "underline-hover";
            newProfile.onclick = function() { 
                profileViewerFunctions.viewStudentProfile(this); 
            };
            document.getElementById("fridaydetentionsneededscreen_studentList").appendChild(newProfile);

            var horizontalRuling = document.createElement("hr");
            horizontalRuling.style.marginBottom = "12px";
            document.getElementById("fridaydetentionsneededscreen_studentList").appendChild(horizontalRuling);
        }
    },

    /*
    checkFridayDetentions() - Calculates which students need Friday detention
    (detentions ÷ 3 > fridayDetentions already scheduled)
    */
    checkFridayDetentions: function() {
        mainscreen_fridayDetentionNotice.style.display = "none";
        App.fridayDetentionsNeeded = [];
        for(let i = 0; i < App.studentProfiles.length; i++) {
            if(Math.floor(App.studentProfiles[i].detentions / 3) > App.studentProfiles[i].fridayDetentions) App.fridayDetentionsNeeded.push(App.studentProfiles[i].name + " - " + App.studentProfiles[i].year);
        }
        //Displays notification banner on main screen when students need scheduling.
        mainscreen_fridayDetentionNotice.innerHTML = "There are " + App.fridayDetentionsNeeded.length + " Friday detention(s) in need of scheduling.";
        if(App.fridayDetentionsNeeded.length > 0) mainscreen_fridayDetentionNotice.style.display = "block";
    }
};

//It's a bit bare-bones, but for this use-case, it works perfectly fine.








































const detentionListFunctions = {
    //loadDetentionList() - Master function that clears, filters, and renders both lists
    loadDetentionList: function() {
        const currentList = document.getElementById("mainscreen_detentionsList");
        const recordList = document.getElementById("recordscreen_detentionsList");
        currentList.innerHTML = "";
        recordList.innerHTML = "";
        mainscreen_emptyLabel.style.display = "none";
        recordscreen_emptyLabel.style.display = "none";
        
        const requiredEntries = this.filterMainScreenDetentions();
        const requiredRecordEntries = this.filterRecordScreenDetentions();
    
        this.renderDetentionList(requiredEntries, currentList);
        this.renderDetentionList(requiredRecordEntries, recordList);

        //Displays "empty" message when no detentions match current filters.
        if(currentList.innerHTML == "") mainscreen_emptyLabel.style.display = "block";
        if(recordList.innerHTML == "") recordscreen_emptyLabel.style.display = "block";
    },
    //filterMainScreenDetentions() - Filters by completion date and year group
    filterMainScreenDetentions: function() {
        const timeFilter = mainscreen_timeFilter.value;
        const yearFilter = mainscreen_yearFilter.value;
        const now = App.getCentralDate();
        
        return App.detentions.filter(detention => {
            const finishingDate = detentionListFunctions.getFinishingDate(detention);
            const startingDate = detentionListFunctions.getStartingDate(detention);
            const passesTimeFilter = (timeFilter == "All" && finishingDate >= now) || (timeFilter == "Today" && (finishingDate == now || startingDate == now)) || (timeFilter == "Upcoming" && finishingDate > now);
            if(!passesTimeFilter) return false;
            return yearFilter == "All Years" || detention.year == yearFilter;
        });
    },
    //filterRecordScreenDetentions() - Searches by specific date or student name
    filterRecordScreenDetentions: function() {
        const dateFilter = recordscreen_dateFilter.value;
        const nameFilter = recordscreen_nameFilter.value;
        
        if(!dateFilter && !nameFilter) return App.detentions;
        return App.detentions.filter(detention => {
            const passesDateFilter = !dateFilter || detentionListFunctions.matchesDateFilter(detention, dateFilter);
            const passesNameFilter = !nameFilter || detention.name.toLowerCase().includes(nameFilter.toLowerCase());
            return passesDateFilter && passesNameFilter;
        });
    },
    getFinishingDate: function(detention) {
        return detention.dateTwo || detention.date;
    },
    getStartingDate: function(detention) {
        return detention.dateOne || detention.date;
    },
    matchesDateFilter: function(detention, dateFilter) {
        if(detention.dateOne) return dateFilter == detention.dateOne || dateFilter == detention.dateTwo;
        return dateFilter == detention.date;
    },
    renderDetentionList: function(detentions, listElement) {
        detentions.forEach(detention => {
            const entryDiv = detentionListFunctions.createDetentionEntry(detention);
            listElement.appendChild(entryDiv);
        });
    },
    //createDetentionEntry() - Builds DOM element with detention info, View, and Remove buttons
    createDetentionEntry: function(detention) {
        const entryDiv = document.createElement("div");
        entryDiv.style.marginBottom = "8px";
        
        entryDiv.innerHTML = detentionListFunctions.createDetentionHTML(detention);
        entryDiv.appendChild(detentionListFunctions.createViewButton());
        entryDiv.appendChild(detentionListFunctions.createRemoveButton());
        return entryDiv;
    },
    //Populates each entry division element with appropriate HTML and CSS code. Returns a completed element.
    createDetentionHTML: function(detention) {
        const baseStyle = "float: left; border: 1px solid gray; width: 300px; padding: 8px;";
        const leftStyle = baseStyle + " border-top-left-radius: 5px; border-bottom-left-radius: 5px;";
        const rightStyle = baseStyle + " border-top-right-radius: 5px; border-bottom-right-radius: 5px;";
        
        const nameCell = `<div style="${leftStyle}">Name: ${detention.name}</div>`;
        const yearCell = `<div style="${baseStyle}">Year: ${detention.year}</div>`;
        var tagCell;
        detention.notCounting ? tagCell = `<div style="${rightStyle}">Tag: ${detention.tag} (Rescheduled)</div>` : tagCell = `<div style="${rightStyle}">Tag: ${detention.tag}</div>`;
        
        let dateCell;
        if(detention.dateOne) {
            dateCell = `<div style="${baseStyle}">Dates: ${detention.dateOne} -- ${detention.dateTwo}</div>`;
        } 
        else {
            const detentionDate = new Date(detention.date);
            const weekDay = detentionDate.toLocaleDateString("en-US", { weekday: "long" });
            dateCell = `<div style="${baseStyle}">Date: ${detention.date} (${weekDay})</div>`;
        }

        //Appends each component to each other to be returned
        return nameCell + yearCell + dateCell + tagCell;
    },
    //Adds a view button to the side of the division element
    createViewButton: function() {
        const button = document.createElement("button");
        button.className = "smallbutton";
        button.style.marginRight = "5px";
        button.style.marginLeft = "5px";
        button.innerHTML = "View";
        button.onclick = viewEntryFunctions.viewEntry;
        return button;
    },
    //Adds a remove button to the side of the division element
    createRemoveButton: function() {
        const button = document.createElement("button");
        button.className = "smallbutton-red";
        button.innerHTML = "Remove";
        //uses the .bind() method to assign the removeDetentionEntry method caller to this button element. Solution sourced from AI.
        button.onclick = entryRemovalFunctions.removeDetentionEntry.bind(button);
        return button;
    }
};

/*Creating and maintaining a lot of DOM elements this way proved challenging. Unfortunately, I found implementing a UI library such
  as React difficult for this project. Given my limited knowledge of react, and the complexity of this so-far, I decided to just
  handle dynamic UI this way.
*/






















const viewEntryFunctions = {
    //this flag determines which menu the user entered a particular entry's menu from - record screen or the main menu.
    viewingFrom: "",
    //Populates viewentryscreen and then toggles its visibility
    viewEntry: function() {
       const container = this.parentElement;
        const entryTag = viewEntryFunctions.extractTagFromContainer(container);
        const detentionEntry = viewEntryFunctions.findDetentionByTag(App.detentions, entryTag);
        
        //This should never happen, but if something goes wrong, and a hidden element is not populated with the entry's tag, the method will stop.
        if(!detentionEntry) {
            App.showAlert("An unexpected error occured while viewing detention entry.", "warning");
            console.error(`No detention found with tag: ${entryTag}`);
            return;
        }

        viewEntryFunctions.displayDetentionDetails(detentionEntry);
        UI.goTo("viewentryscreen", UI.currentScreen);
    },
    //Extracts an entry's tag from its HTML element.
    extractTagFromContainer: function(container) {
        const tagElement = Array.from(container.children).find(child => child.innerHTML.includes("Tag"));
        if(!tagElement) {
            App.showAlert("An unexpected error occured while viewing detention entry.", "warning");
            console.error("No tag element found in container");
            return null;
        }
        return tagElement.innerHTML.split(" ")[1];
    },
    //Returns a particular detention entry based on its unique tag identifer
    findDetentionByTag: function(detentions, tag) {
        return detentions.find(detention => detention.tag == tag);
    },
    //Populates specific labels in the view entry screen with information sourced from the entry's dedicated object
    displayDetentionDetails: function(detention) {
        viewentryscreen_nameLabel.innerHTML = detention.name;
        viewentryscreen_dateLabel.innerHTML = viewEntryFunctions.formatDetentionDates(detention);
        viewentryscreen_entryDataLabel.innerHTML = viewEntryFunctions.formatTeacherInfo(detention);
        viewentryscreen_reasonLabel.innerHTML = detention.reason;
        viewentryscreen_absentLabel.innerHTML = "";
        viewentryscreen_rescheduledLabel.innerHTML = "";
        viewentryscreen_tagLabel.innerHTML = detention.tag;

        var wasAbsent = false;
        var detentionType = "single";
        if(detention.hasOwnProperty("dateOne")) detentionType = "double";

        App.studentProfiles.forEach((profile) => {
            if(detentionType == "single") {
                if(profile.detentionsMissed.includes(detention.date) && (profile.name == detention.name && profile.year == detention.year)) wasAbsent = true;
            }
            else {
                if((profile.detentionsMissed.includes(detention.dateOne) || profile.detentionsMissed.includes(detention.dateTwo)) && (profile.name == detention.name && profile.year == detention.year)) wasAbsent = true;
            }
        });

        //Appends dedicated absent labels
        if(wasAbsent && detentionType == "single") viewentryscreen_absentLabel.innerHTML = "This student was absent for this detention.";
        if(wasAbsent && detentionType == "double") viewentryscreen_absentLabel.innerHTML = "This student was absent for one or both dates of this detention.";

    },
    //Formats single and double detention dates
    formatDetentionDates(detention) {
        if(detention.dateOne && detention.dateTwo) return viewEntryFunctions.formatTwoDateDetention(detention.dateOne, detention.dateTwo);
        return viewEntryFunctions.formatSingleDateDetention(detention.date);
    },
    //Returns a string providing clear calender information regarding an entry
    formatTwoDateDetention(dateOne, dateTwo) {
        const dayOne = viewEntryFunctions.getWeekdayName(dateOne);
        const dayTwo = viewEntryFunctions.getWeekdayName(dateTwo);
        return `Detentions on ${dateOne} (${dayOne}) -- ${dateTwo} (${dayTwo})`;
    },
    //Returns a string providing clear calender information regarding an entry
    formatSingleDateDetention: function(date) {
        const weekday = viewEntryFunctions.getWeekdayName(date);
        return `Detention on ${date} (${weekday})`;
    },
    //Returns the weekday from a particular date string
    getWeekdayName: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { weekday: "long" });
    },
    exitEntryScreen: function() {
        UI.goTo(this.viewingFrom, "viewentryscreen")
    }
};

















const profileFunctions = {
    //updateOrCreateStudentProfile() - Creates new profile if student doesn't exist
    updateOrCreateStudentProfile: function(name, year) {
        const profileIndex = App.studentProfiles.findIndex(profile => profile.name.toLowerCase() == name.toLowerCase() && profile.year == year);
        if(profileIndex == -1) {
            App.studentProfiles.push({
                name,
                year,
                detentions: 0,
                fridayDetentions: 0,
                detentionsMissed: [],
                detentionsLate: []
            });
        }
    },
    syncProfiles: function() {
        /*
            syncProfiles() - Recalculates detention counts by scanning all detention entries,
            distinguishes between regular (Mon-Thu) and Friday detentions, and cleans up
            stale attendance records (missed / late) for deleted detentions
        */
        for(let i = 0; i < App.studentProfiles.length; i++) {
            var profileIndex = i;
            var studentName = App.studentProfiles[profileIndex].name.toLowerCase();
            var yearGroup = App.studentProfiles[profileIndex].year;
            var foundProfileDetentions = [];
            var foundProfileFridayDetentions = [];
            App.studentProfiles[profileIndex].detentions = 0;
            App.studentProfiles[profileIndex].fridayDetentions = 0;

            for(let j = 0; j < App.detentions.length; j++) {
                if(App.detentions[j].name.toLowerCase() == studentName && App.detentions[j].year == yearGroup) {
                    if(!App.detentions[j].hasOwnProperty("notCounting") || (App.detentions[j].hasOwnProperty("notCounting") && App.detentions[j].notCounting == false)) {
                        if(App.detentions[j].hasOwnProperty("dateOne")) {
                            foundProfileDetentions.push(App.detentions[j].dateOne);
                            foundProfileDetentions.push(App.detentions[j].dateTwo);
                        }
                        if(App.detentions[j].hasOwnProperty("date") && new Date(App.detentions[j].date).getDay() != 5) foundProfileDetentions.push(App.detentions[j].date);
                        if(App.detentions[j].hasOwnProperty("date") && new Date(App.detentions[j].date).getDay() == 5) foundProfileFridayDetentions.push(App.detentions[j].date);
                    }
                }
            }
            App.studentProfiles[profileIndex].detentions = foundProfileDetentions.length;
            App.studentProfiles[profileIndex].fridayDetentions = foundProfileFridayDetentions.length;

            var removingAbsentDates = [];
            var removingLateDates = [];
            App.studentProfiles[profileIndex].detentionsMissed.forEach((date) => {
                if(!foundProfileDetentions.includes(date) && !foundProfileFridayDetentions.includes(date)) removingAbsentDates.push(date);
            });
            App.studentProfiles[profileIndex].detentionsLate.forEach((date) => {
                if(!foundProfileDetentions.includes(date) && !foundProfileFridayDetentions.includes(date)) removingLateDates.push(date);
            });

            removingAbsentDates.forEach((date) => {
                var dateIndex = App.studentProfiles[profileIndex].detentionsMissed.indexOf(date);
                App.studentProfiles[profileIndex].detentionsMissed.splice(dateIndex, 1);
            });
            removingLateDates.forEach((date) => {
                var dateIndex = App.studentProfiles[profileIndex].detentionsMissed.indexOf(date);
                App.studentProfiles[profileIndex].detentionsMissed.splice(dateIndex, 1);
            });
        }
        var validProfiles = App.studentProfiles.filter((profile) => profile.detentions > 0 || profile.fridayDetentions > 0);
        App.studentProfiles = validProfiles;
    },

    /*
    searchProfiles() - Filters and displays students by name, only showing those
    with at least one detention on record
    */
    searchProfiles: function() {
        const searchTerm = profilesearchscreen_searchBox.value.trim().toLowerCase();
        const listContainer = document.getElementById("profilesearchscreen_profileList");
        listContainer.innerHTML = "";
        if(searchTerm.length == 0) return;
        const matchingStudents = this.findMatchingStudents(searchTerm);
        if(matchingStudents.length == 0) {
            this.displayNoResults(listContainer);
            return;
        }
        this.displayStudentList(matchingStudents, listContainer);
    },
    //Finds matching student profiles based on entered the search term
    findMatchingStudents: function(searchTerm) {
        return App.studentProfiles.filter(profile => profile.name.toLowerCase().includes(searchTerm) && this.hasDetentions(profile));
    },
    hasDetentions: function(profile) {
        return profile.detentions > 0 || profile.fridayDetentions > 0;
        //Forgot to include profile.detentions > 0 check!
    },
    //Displays search results - list of matching students added to the reference of a container element
    displayStudentList: function(students, container) {
        students.forEach(student => {
            container.appendChild(this.createStudentElement(student));
            container.appendChild(this.createDivider());
        });
    },
    //Creates a dedicated search result elements that includes an onclick handler to bring the user to profile menu
    createStudentElement: function(student) {
        const element = document.createElement("h3");
        element.innerHTML = `${student.name} - ${student.year}`;
        element.className = "underline-hover";
        element.onclick = function() { 
            profileViewerFunctions.viewStudentProfile(this); 
        };
        return element;
    },
    createDivider: function() {
        const hr = document.createElement("hr");
        hr.style.marginBottom = "12px";
        return hr;
    },
    displayNoResults: function(container) {
        container.innerHTML = `
            <i>No Results</i>
            <h6><i>Note: Only students that have received a detention this year will appear here.</i></h6>
        `;
    }
};

























const profileViewerFunctions = {
    //viewStudentProfile() - Main entry point that orchestrates profile display
    viewStudentProfile: function(element) {
        if(UI.currentScreen == "fridaydetentionsneededscreen") UI.enteredFridayList = true;
        const { studentName, yearGroup } = this.parseStudentInfo(element.innerHTML);
        const profile = this.findStudentProfile(studentName, yearGroup);
        if(!profile) {
            App.showAlert("An unexpected error occured.", "error");
            console.error(`Student profile not found: ${studentName} - ${yearGroup}`);
            return;
        }
        this.displayProfileHeader(studentName, yearGroup, profile);
        this.displayFridayDetentionWarning(studentName);
        this.displayIncidentReport(studentName, yearGroup, profile);
        this.displayBehaviorClassification(profile);
        
        UI.goTo("viewprofilescreen", UI.currentScreen);
    },
    parseStudentInfo: function(text) {
        const [studentName, yearGroup] = text.split(" - ");
        return { studentName, yearGroup };
    },
    findStudentProfile: function(name, year) {
        return App.studentProfiles.find(profile => profile.name.toLowerCase() == name.toLowerCase() && profile.year == year);
    },
    //displayProfileHeader() - Shows detention counts (regular, Friday, missed, late)
    displayProfileHeader: function(name, year, profile) {
        viewprofilescreen_studentNameLabel.innerHTML = name;
        viewprofilescreen_yearGroupLabel.innerHTML = year;
        viewprofilescreen_detentionsLabel.innerHTML = `Detentions: ${profile.detentions}`;
        viewprofilescreen_fridayDetentionsLabel.innerHTML = `Friday Detentions: ${profile.fridayDetentions}`;
        viewprofilescreen_detentionsMissedLabel.innerHTML = `Detentions Missed: ${profile.detentionsMissed.length}`;
        viewprofilescreen_detentionsLateLabel.innerHTML = `Detentions Late To: ${profile.detentionsLate.length}`;
    },
    displayFridayDetentionWarning: function(studentName) {
        const needsFridayDetention = App.fridayDetentionsNeeded.some(entry => {
            const name = entry.split(" - ")[0].toLowerCase();
            return name == studentName.toLowerCase();
        });
        viewprofilescreen_fridayDetentionNeededLabel.innerHTML = needsFridayDetention ? "This student may be assigned a Friday detention." : "";
    },

    /*displayIncidentReport() - Lists all detention incidents with status badges:
        * "Friday" for Friday detentions (red)
        * "Absent" / "Late" markers for attendance issues (red)
        * Handles single and double detentions differently
    */
    displayIncidentReport: function(studentName, yearGroup, profile) {
        const container = viewprofilescreen_incidentReportList;
        container.innerHTML = "";
        const studentDetentions = this.getStudentDetentions(studentName, yearGroup);
        
        studentDetentions.forEach(detention => {
            const incident = this.createIncidentElement(detention, profile);
            container.appendChild(incident);
            container.appendChild(this.createDivider());
        });
    },
    getStudentDetentions: function(studentName, yearGroup) {
        return App.detentions.filter(detention => 
            detention.name.toLowerCase() == studentName.toLowerCase() && 
            detention.year == yearGroup
        );
    },
    createIncidentElement: function(detention, profile) {
        const element = document.createElement("div");
        element.style.textAlign = "left";
        
        let html = `${detention.reason} ${this.formatDetentionDate(detention)} `;
        html += this.addRescheduledBadge(detention);
        html += this.addFridayBadge(detention);
        html += this.addAbsenceBadges(detention, profile);
        html += this.addLateBadges(detention, profile);
        
        element.innerHTML = html;
        return element;
    },
    formatDetentionDate: function(detention) {
        if(detention.dateOne) return `<b>(${detention.dateOne} -- ${detention.dateTwo})</b> `;
        return `<b>(${detention.date})</b>`;
    },
    addFridayBadge: function(detention) {
        if(detention.date && new Date(detention.date).getDay() == 5) return "- <b style='color: red'>Friday</b> ";
        return "";
    },
    addAbsenceBadges: function(detention, profile) {
        if(detention.date) return profile.detentionsMissed.includes(detention.date) ? "- <b style='color: red'>Absent</b> " : "";
        const missedDayOne = profile.detentionsMissed.includes(detention.dateOne);
        const missedDayTwo = profile.detentionsMissed.includes(detention.dateTwo);
        
        if(missedDayOne && missedDayTwo) {
            return "- <b style='color: red'>Absent Both Days</b> ";
        } 
        else if(missedDayOne) {
            return "- <b style='color: red'>Absent Day One</b> ";
        } 
        else if(missedDayTwo) {
            return "- <b style='color: red'>Absent Day Two</b> ";
        }
        return "";
    },
    addLateBadges: function(detention, profile) {
        if(detention.date) return profile.detentionsLate.includes(detention.date) ? " - <b style='color: red'>Late</b>" : "";
        const lateDayOne = profile.detentionsLate.includes(detention.dateOne);
        const lateDayTwo = profile.detentionsLate.includes(detention.dateTwo);
        
        if(lateDayOne && lateDayTwo) {
            return " - <b style='color: red'>Late Both Days</b>";
        } 
        else if(lateDayOne) {
            return " - <b style='color: red'>Late Day One</b>";
        }
        else if(lateDayTwo) {
            return " - <b style='color: red'>Late Day Two</b>";
        }
        return "";
    },
    addRescheduledBadge: function(detention) {
        if(detention.notCounting) return " <b><i>Rescheduled</i></b>";
        return "";
    },
    createDivider: function() {
        const hr = document.createElement("hr");
        hr.style.marginBottom = "12px";
        return hr;
    },
    calculateBehaviorPoints: function(profile) {
        return profile.detentions + profile.fridayDetentions + profile.detentionsMissed.length + profile.detentionsLate.length;
    },
    getBehaviorClassification: function(points) {
        /*
        displayBehaviorClassification() - Calculates behavior score from all incidents
        and classifies as: Good (< or = 2) => Satisfactory => Medium => Bad => Very Bad => Terrible (>10)
        */

        if (points <= 2) return "Good";
        if (points <= 4) return "Satisfactory";
        if (points <= 6) return "Medium";
        if (points <= 8) return "Bad";
        if (points <= 10) return "Very Bad";
        return "Terrible";
    },
    displayBehaviorClassification: function(profile) {
        const points = this.calculateBehaviorPoints(profile);
        const classification = this.getBehaviorClassification(points);
        viewprofilescreen_behaviorLabel.innerHTML = `Behavior this year: ${classification}`;
    }
};

/*This object above with the various "badges" a student's record can earn
  is another example of the active DOM manipulation that this project made heavy use of.*/

































const attendanceFunctions = {
    /*
    verifyDetentionToday() - Checks if detentions are scheduled today and if
    attendance hasn't been submitted yet (prevents duplicate submissions)
    */
    verifyDetentionToday: function() {
        const formattedDate = App.getCentralDate();
        let detentionsToday = false;
        App.detentions.forEach((detention) => {
            if(detention.dateOne && (detention.dateOne == formattedDate || detention.dateTwo == formattedDate)) detentionsToday = true;
            if(detention.date && detention.date == formattedDate) detentionsToday = true; 
        });

        if(!detentionsToday) {
            App.showAlert("There are no detentions scheduled for today.", "info");
            return;
        }
        if(App.attendanceTaken == "t") {
            App.showAlert("Today's attendance has already been submitted.", "info");
            return
        }
        attendanceFunctions.loadAttendance()
        UI.goTo("attendancescreen", "mainscreen")
    },

    /*
    loadAttendance() - Builds attendance form showing all students with detention
    today (handles both single date and double detention matches)
    */
    loadAttendance: function() {
        const formattedDate = App.getCentralDate();
        attendancescreen_dateLabel = `Detention on ${formattedDate} (${new Date(formattedDate).toLocaleDateString("en-US", { weekday: "long"})})`;
        document.getElementById("attendancescreen_studentList").innerHTML = "";

        let presentDetentions = App.detentions.filter((detention) => {
            if(detention.dateOne && (detention.dateOne == formattedDate || detention.dateTwo == formattedDate)) return true;
            if(detention.date && detention.date == formattedDate) return true;
        });

        presentDetentions.forEach((detention) => {
            var newEntry = document.createElement("div");
            newEntry.innerHTML = attendanceFunctions.createAttendanceHTML(detention);
            newEntry.style.display = "flex";
            newEntry.style.marginBottom = "8px";
            newEntry.style.gap = "0px";
            document.getElementById("attendancescreen_studentList").appendChild(newEntry);
        });
    },
    //Returns a selection input (present, absent, late) for each student element in the attendance input.
    createAttendanceHTML: function(detention) {
        return `
            <div style="border: 1px solid gray; border-top-left-radius: 5px; border-bottom-left-radius: 5px; width: 300px; padding: 8px;">${detention.name}</div>
            <div style="border: 1px solid gray; border-top-right-radius: 5px; border-bottom-right-radius: 5px; width: 200px;"><select class="selectionBox" style="height: 40px; width: 200px; border: none;">
                <option>Present</option>
                <option>Absent</option>
                <option>Late</option>
            </select></div>
        `;
    },

    /*
    submitAttendance() - Records attendance status (Present/Absent/Late), updates
    student profiles with missed/late arrays, marks attendance as taken, and logs
    to reports.
    */
    submitAttendance: async function() {
        const absentStudents = [];

        App.attendanceTaken = "t";
        const formattedDate = App.getCentralDate();
        App.attendanceTakenDate = formattedDate;
        const studentList = document.getElementById("attendancescreen_studentList");
        const attendanceReport = [];

        for(let i = 0; i < studentList.children.length; i++) {
            const element = studentList.children[i];
            const name = element.children[0].innerHTML;
            const attendance = element.children[1].children[0].value;
            if(attendance == "Absent") absentStudents.push(name);

            App.studentProfiles.forEach((profile) => {
                if(profile.name.toLowerCase() == name.toLowerCase()) {
                    attendanceReport.push({name: profile.name, attendance: attendance});
                    const profileIndex = App.studentProfiles.findIndex((profile) => profile.name.toLowerCase() == name.toLowerCase());
                    if(attendance == "Absent") App.studentProfiles[profileIndex].detentionsMissed.push(App.attendanceTakenDate);
                    if(attendance == "Late") App.studentProfiles[profileIndex].detentionsLate.push(App.attendanceTakenDate);
                }
            });
        }

        App.showAlert("Successfully submitted attendance. Please do not close tab.", "success");
        UI.goTo("mainscreen", "attendancescreen");
        App.fileReport("attendance", attendanceReport);
        App.updateData(false);
    }
};