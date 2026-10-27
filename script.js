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