const UI = {
    currentScreen: "passwordscreen",

    //The goTo method manages screen navigation and initialises form cleanup for relevant menus (profilesearchscreen, addstudentscreen, etc.)
    goTo: function(to, from) {
        document.getElementById(to).style.display = "block";
        document.getElementById(from).style.display = "none";
        //mechanism for single-page application - screen transitions
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
        fridayDetentionFunctions.checkFridayDetentions();
        UI.initEventListeners()
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
        //Another Promise.all statement to execute all write operations in parallel, minimising wait times.
        fridayDetentionFunctions.checkFridayDetentions();
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