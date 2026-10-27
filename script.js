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