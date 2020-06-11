const token = new URLSearchParams(window.location.search).get("token")

let bugData, chosenProject, chosenTab, newListItemId, blurTimeout;

$(function(){

    $.post("/sidebar-sync", {"token": token}, RefreshBugTrackerData);

    $("#ValidationCheck").on("change", function(){

        UpdateStatus($(this).is(":checked"), "Validation Validated");

    });

    $("#TestingCheck").on("change", function(){

        UpdateStatus($(this).is(":checked"), "Testing Required");

    });

    $(document).on("keyup", function(event){

        if (event.keyCode === 13){

            document.activeElement.blur();

        }

    });

    $("#Main_Description_Input").on("keydown", DynamicDescriptionSizing);
    
});

$(window).blur(function(){

    if (blurTimeout){

        clearTimeout(blurTimeout);

        blurTimeout = null;

    }

    blurTimeout = setTimeout(function(){

        window.location.href = "/"
        
    }, 300000);

});

$(window).focus(function(){

    if (blurTimeout){

        clearTimeout(blurTimeout);

        blurTimeout = null;

    }

});


/////////////////////////////////////////////
//         Sidebar And Tab Loading         //
/////////////////////////////////////////////
//#region

function RefreshSidebarContents(){

    let sidebarHtml = "";

    for (let projectName in bugData){

        sidebarHtml += `<div ProjectName='${projectName}' class='ProjectSelect' onclick='RefreshTabOptions("${projectName}", this);'>
                            ${projectName}
                        </div>`;

    }

    $("#ProjectSelection").html(sidebarHtml);

    $("#ProjectSelection").children()[0].click();

}

function RefreshTabOptions(projectName, caller){

    $(".DeleteButtonContainer").css("display", "block");
    
    if (chosenProject){

        chosenProject.attr("Opened", "false");

    }

    chosenProject = $(caller);

    chosenProject.attr("Opened", "true");

    let tabHtml = `<div class='Tab' TabName='Main' onclick='SelectTab($(this).attr("TabName"), this)'>Main</div>`;

    for (let tabName in bugData[projectName]){

        if (tabName !== "Main"){

            tabHtml += `<div class='Tab' TabName='${tabName}' onclick='SelectTab($(this).attr("TabName"), this)'>
                            ${tabName}
                        </div>`;

        }

    }

    $("#TabSelection").html(tabHtml);

    $("#TabSelection").children()[0].click();

}

//#endregion



/////////////////////////////////////////////
//            Backend Responses            //
/////////////////////////////////////////////
//#region

function RefreshBugTrackerData(args){

    bugData = args;

    if (Object.keys(bugData).length){

        RefreshSidebarContents();

    }
    else{

        $("#MainContent").css("display", "none");

        $("#TabContent").css("display", "none");

        $(".DeleteButtonContainer").css("display", "none");

    }

}

function TrackerUpdateHandler(args){

    if (args === "403"){

        window.location.href = "/login";

    }

}

function DeleteFile(deleteButtonID){

    let projectName = chosenProject.attr("ProjectName");

    let filePath = $(`#${deleteButtonID}`).parent().children().first().attr("Location");
    
    for (let key = 0 ; key < bugData[projectName]["Main"]["Files"].length ; key++){
        
        if (bugData[projectName]["Main"]["Files"][key].replace(/\s/g, ' ') === filePath.replace(/\s/g, ' ')){
            
            bugData[projectName]["Main"]["Files"].splice(key, 1);

            break;

        }

    }
    
    $(`#${deleteButtonID}`).parent().remove();

    $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

}

//#endregion



/////////////////////////////////////////////
//              Tab Selection              //
/////////////////////////////////////////////
//#region

function SelectTab(tab, caller){

    if (chosenTab){

        chosenTab.attr("Opened", "false");

    }

    chosenTab = $(caller);

    chosenTab.attr("Opened", "true");

    UpdateBugContent();

}

function UpdateBugContent(){

    let projectName = chosenProject.attr("ProjectName");

    let tabName = chosenTab.attr("TabName");

    $("#TabTitle").html(tabName);
    
    if (tabName === "Main"){

        $("#TabContent").css("display", "none");

        $("#MainContent").css("display", "block");

        $("#DeleteButton").html("Delete Project");

        $("#DeleteButton").unbind("click");

        $("#DeleteButton").on("click", function(){

            Confirm(`Are You Sure You Wish To Delete This Project?<br><br><span style='color: #ff8a8a;'>${projectName}</span>`, "DeleteProject();", "")

        });

        $("#Main_Description").css("display", "inline");

        $("#Main_Description_Input").css("display", "none");

        $("#Main_Description").html(bugData[projectName][tabName]["Description"]);

        $("#Main_Description").unbind("mouseover");

        $("#Main_Description_Input").unbind("mouseout");

        $("#Main_Description_Input").unbind("focusout");

        $("#Main_Description_Input").unbind("click");
        
        $("#Main_Description").on("mouseover", function(){

            $(this).css("display", "none");

            $("#Main_Description_Input").css("display", "block");

            $("#Main_Description_Input").val($(this).html())

            $("#Main_Description_Input").keydown();

        });

        $("#Main_Description_Input").one("click", function(){ this.setSelectionRange(this.value.length, this.value.length) });

        $("#Main_Description_Input").on("mouseout", function(){

            if (!$(this).is(":focus")){

                $(this).css("display", "none");
    
                $("#Main_Description").css("display", "inline");

            }

        });

        $("#Main_Description_Input").on("focusout", function(){

            $("#Main_Description_Input").one("click", () => this.setSelectionRange(this.value.length, this.value.length));

            $(this).css("display", "none");

            $("#Main_Description").css("display", "inline");

            if (!$(this).val().length){

                $(this).val("A brief description");

            }

            $("#Main_Description").html($(this).val());

            let projectName = chosenProject.attr("ProjectName");
        
            let tabName = chosenTab.attr("TabName");

            bugData[projectName][tabName]["Description"] = $(this).val();

            $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

        });

        LoadFIles();

    }
    else{

        $("#TabContent").css("display", "block");
        
        $("#MainContent").css("display", "none");

        $("#ValidationCheck").prop("checked", bugData[projectName][tabName]["Validation Validated"]);

        $("#TestingCheck").prop("checked", bugData[projectName][tabName]["Testing Required"]);

        $("#Tasks-List").html(TryGenerateList(bugData[projectName][tabName]["To Do"], "Tasks"));

        $("#Tasks-List").children().each(function(){
            
            $(`#${this.id}_DeleteButton`).on("click", function(){

                Confirm(`Are You Sure You Wish To Delete This Item?`, `DeleteListItem("${this.id.split("_DeleteButton")[0]}");`, "")

            });

        });

        $("#ImportantInformation").css("display", "block");

        $("#ImportantInformation-List").html(TryGenerateList(bugData[projectName][tabName]["Important Information"], "ImportantInformation"));

        $("#ImportantInformation-List").children().each(function(){

            $(`#${this.id}_DeleteButton`).on("click", function(){

                Confirm(`Are You Sure You Wish To Delete This Item?`, `DeleteListItem("${this.id.split("_DeleteButton")[0]}");`, "")

            });

        });

        $("#DeleteButton").html("Delete Tab");

        $("#DeleteButton").unbind("click");

        $("#DeleteButton").on("click", function(){

            Confirm(`Are You Sure You Wish To Delete This Tab?<br><br><span style='color: #ff8a8a;'>${tabName}</span>`, "DeleteTab();", "")

        });

    }

}

function TryGenerateList(data, listName){

    if (data){

        let html = "";
    
        if (data.length){
    
            for (let key = 0 ; key < data.length ; key++){
    
                html += `<li ${listName}="${data[key]}" id='${key}_${listName}'>${data[key]} <i id='${key}_${listName}_DeleteButton' class="fas fa-trash-alt DeleteButton"></i></li>`;
    
            }
    
        }
    
        return html + `<button id='${listName}_AddButton' class="btn btn-secondary" style="margin-top: 1.5vh;" onclick="AddListItemHTML('${listName}')">Add Item</button>`;

    }

}

//#endregion



/////////////////////////////////////////////
//        Project And Tab Management       //
/////////////////////////////////////////////
//#region

function AddNewProject(){

    $("#ProjectSelection").append("<div class='ProjectSelect' opened='false'><input style='margin: auto;' class='NewItemTextbox' id='NewProjectName'></div>");

    $("#NewProjectName").focus();
    
    $("#NewProjectName").on("focusout", function(){

        let newProjectName = $(this).val();

        if (newProjectName.length === 0){

            $(this).parent().remove();

            return;

        }

        if (!bugData.hasOwnProperty(newProjectName)){

            bugData[newProjectName] = {"Main" : {"Description" : "Description goes here", "Files" : []}};

            RefreshSidebarContents();

            $(`div[ProjectName="${newProjectName}"]`).click();

            $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

        }
        else{

            $(this).css("border-color", "red");

            $(this).focus();

        }
        
    });

}

function AddNewTab(){

    $("#TabSelection").append("<div class='Tab' opened='false'><input style='margin: 0.4vw;' class='NewItemTextbox' id='NewTabName'></div>");

    $("#NewTabName").focus();
    
    $("#NewTabName").on("focusout", function(){

        let newTabName = $(this).val();

        let projectName = chosenProject.attr("ProjectName");

        if (newTabName.length === 0){

            $(this).parent().remove();

            return;

        }

        if (!bugData[projectName].hasOwnProperty(newTabName)){

            bugData[projectName][newTabName] = {"Important Information" : [], "Testing Required" : false, "To Do" : [], "Validation Validated" : false};

            RefreshTabOptions(projectName, chosenProject);

            chosenProject.click();

            $(`div[TabName="${newTabName}"]`).click();

            $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

        }
        else{

            $(this).css("border-color", "red");

            $(this).focus();

        }
        
    });

}

function DeleteProject(){

    delete bugData[chosenProject.attr("ProjectName")];

    $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

    RefreshSidebarContents();

}

function DeleteTab(){

    delete bugData[chosenProject.attr("ProjectName")][chosenTab.attr("TabName")];

    chosenProject.click();

    $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

}

//#endregion



/////////////////////////////////////////////
//            Confirmation Popup           //
/////////////////////////////////////////////
//#region

function Confirm(message, confirmCallback, cancelCallback){

    $("#Confirmation-Message").html(message);

    $("#Confirmation-Confirm").attr("onclick", confirmCallback + "ConfirmVisibility(false);");

    $("#Confirmation-Cancel").attr("onclick", cancelCallback + "ConfirmVisibility(false);");

    ConfirmVisibility(true);

}

function ConfirmVisibility(display){
    
    $("#Confirmation-Container").css("display", display ? "block" : "none");

    $("#Confirmation-Backboard").css("display", display ? "block" : "none");

}

//#endregion



/////////////////////////////////////////////
//         Tab Content Interaction         //
/////////////////////////////////////////////
//#region

function Logout(){

    $.post("/logout", {"token": token}, function(){

        window.location.href = "/login"

    });

}

function UpdateStatus(status, type){

    let projectName = chosenProject.attr("ProjectName");

    let tabName = chosenTab.attr("TabName");

    bugData[projectName][tabName][type] = status;

    $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

}

function AddListItemHTML(listToAddTo){

    $(`#${listToAddTo}-List`).append(`<li><input class='NewItemTextbox' id='NewListItem_${listToAddTo}'></li>`);

    newListItemId = `NewListItem_${listToAddTo}`;

    $(`#${listToAddTo}-List`).append($(`#${listToAddTo}_AddButton`));

    $(`#NewListItem_${listToAddTo}`).focus();

    $(`#NewListItem_${listToAddTo}`).on("focusout", function(){

        $(this).unbind("focusout");

        if ($(this).val().length !== 0){

            SaveNewListItem(this.id, $(this).val());

        }

        $(this).parent().remove();

    });

}

function SaveNewListItem(itemID, itemValue){

    let listType = itemID.split("NewListItem_")[1];

    let deleteButtonID = `${$(`#${listType}-List`).children().length - 2}_${listType}_DeleteButton`;

    $(`#${listType}-List`).append(`<li ${listType}="${itemValue}" id='${$(`#${listType}-List`).children().length - 2}_${listType}'>${itemValue} <i id='${deleteButtonID}' class="fas fa-trash-alt DeleteButton"></i></li>`);

    $(`#${listType}-List`).append($(`#${listType}_AddButton`));

    $(`#${deleteButtonID}`).on("click", function(){

        Confirm(`Are You Sure You Wish To Delete This Item?`, `DeleteListItem("${this.id.split("_DeleteButton")[0]}");`, "")

    });

    let projectName = chosenProject.attr("ProjectName");

    let tabName = chosenTab.attr("TabName");

    if (listType === "Tasks"){

        bugData[projectName][tabName]["To Do"].push(itemValue);

    }
    else{

        bugData[projectName][tabName]["Important Information"].push(itemValue);

    }

    $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

}

function DeleteListItem(idToDelete){
    
    $(`#${idToDelete}`).remove();

    let projectName = chosenProject.attr("ProjectName");

    let tabName = chosenTab.attr("TabName");

    let index = idToDelete.split("_")[0];
    
    if (idToDelete.indexOf("_Tasks") !== -1){

        bugData[projectName][tabName]["To Do"].splice(parseInt(index), 1);

    }
    else{

        bugData[projectName][tabName]["Important Information"].splice(index, 1);

    }

    $.post("/tracker-updated", {"bugdata": JSON.stringify(bugData), "token": token}, TrackerUpdateHandler);

    chosenTab.click();

}

//#endregion



/////////////////////////////////////////////
//       Main Tab Content Interaction      //
/////////////////////////////////////////////
//#region

function LoadFIles(){
    
    let projectName = chosenProject.attr("ProjectName");

    $("#Main_Files").children().each(function(){

        if (this.tagName !== "BUTTON"){

            $(this).remove();

        }

    });

    for (let key = 0 ; key < bugData[projectName]["Main"]["Files"].length ; key++){

        let fileName = bugData[projectName]["Main"]["Files"][key].split("\\");

        fileName = fileName[fileName.length - 1];

        $("#Main_Files").append(`<li><a href="vscode://file/${bugData[projectName]["Main"]["Files"][key]}/">${fileName}</a> <i id="${key}_Files_DeleteButton" class="fas fa-trash-alt DeleteButton"></i></li>`);

        $(`#${key}_Files_DeleteButton`).on("click", function(){
            
            Confirm("Are You Sure You Wish To Delete This File From The List?", `DeleteFile('${this.id}');`, "");

        });

    }
    
    $("#Main_Files").children().each(function(){

        $(this).children().first().on("dblclick", function(){

            $.post("/open-file-code", {"location": $(this).attr("Location"), "token": token}, FileOpened);

        });

    });

}

function GetLoadedFiles(){

    let projectName = chosenProject.attr("ProjectName");

    return bugData[projectName]["Main"]["Files"];

}

function DynamicDescriptionSizing(){

	if (this.value.length >= 28){
        
        this.style.width = this.value.length + 6 + "ch"
    
    }
    else{

        this.style.width = "32ch"
    
    }

}

//#endregion