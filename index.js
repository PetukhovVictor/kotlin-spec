function getQueryParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function loadJSON(url, callback) {
    var request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open("GET", url, true);
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == "200") {
            callback(JSON.parse(request.responseText));
        }
    };
    request.send(null);
 }


function highlightSentence(hashComponents) {
    var section = hashComponents[0];
    var paragraph = hashComponents[1];
    var sentence = hashComponents[2];

    var sectionElement = document.querySelector(section);
    var nextSibling = sectionElement.nextElementSibling;
    var counter = 1;

    while (nextSibling) {
        if (nextSibling.classList && nextSibling.classList.contains('paragraph') && counter++ == paragraph) {
            nextSibling.scrollIntoView();
            var sentenceElement = nextSibling.getElementsByClassName('sentence')[sentence - 1];
            sentenceElement.style.backgroundColor = 'yellow';
            break;
        }
        nextSibling = nextSibling.nextSibling;
    }
}

function showSentenceCoverage(sentenceElement, sentenceTestInfo) {
    sentenceElement.setAttribute("data-d", "4");
    sentenceElement.style.background = "rgb(213, 236, 206)";
    sentenceElement.style.borderRadius = "5px";

    ["diagnostics", "psi", "codegen"].forEach(function(testArea) {
        if (!sentenceTestInfo[testArea]) {
            sentenceTestInfo[testArea] = {};
        }
    });

    console.log(sentenceTestInfo);

    var testsByArea = [];

    for (var area in sentenceTestInfo) {
        var testNumberByType = {}
        for (var testType in sentenceTestInfo[area]) {
            var testCasesNumber = 0
            for (var test in sentenceTestInfo[area][testType]) {
                testCasesNumber += sentenceTestInfo[area][testType][test].cases.length;
            }
            var testNumber = Object.keys(sentenceTestInfo[area][testType]).length;
            testNumberByType[testType] = testNumber + " (cases: " + testCasesNumber + ")";
        }
        var testNumberByTypeInfo = []
        for (var testNumberInfo in testNumberByType) {
            testNumberByTypeInfo.push(testNumberInfo + " — " + testNumberByType[testNumberInfo]);
        }
        testsByArea.push(area.toLocaleUpperCase() + ": " + (testNumberByTypeInfo.length > 0 ? testNumberByTypeInfo.join(", ") : "does not contain"));
    }

    var span = document.createElement("span");
    span.setAttribute("class", "coverage-info");
    span.innerHTML = testsByArea.join("<br />");
    sentenceElement.prepend(span);
}

function markSentenceNotCovered(sentenceElement) {
    sentenceElement.style.background = "rgb(255, 195, 195)";
    sentenceElement.style.borderRadius = "5px";
}

function showCoverage(specTestsMap) {
    for (var section in specTestsMap) {
        var paragraphs = specTestsMap[section];
        var sectionElement = document.querySelector("#" + section);

        if (sectionElement == null) {
            continue
        }

        var nextSibling = sectionElement.nextElementSibling;
        var paragraphCounter = 0;

        while (nextSibling) {
            if (nextSibling.classList && nextSibling.classList.contains("paragraph") && ++paragraphCounter in paragraphs) {
                var sentenceElements = nextSibling.getElementsByClassName("sentence");
                var sentenceObject = paragraphs[paragraphCounter];
                var sentenceCounter = 1;

                Array.from(sentenceElements).forEach(function(sentenceElement) {
                    if (sentenceCounter in sentenceObject) {
                        showSentenceCoverage(sentenceElement, sentenceObject[sentenceCounter]);
                    } else {
                        markSentenceNotCovered(sentenceElement);
                    }
                    sentenceCounter++;
                });
            }
            nextSibling = nextSibling.nextSibling;
        }

        console.log(specTestsMap[section]);
    }
}

window.addEventListener("DOMContentLoaded", function(event) {
    if (location.hash) {
        highlightSentence(location.hash.split(':'));
    }

    if (getQueryParam("mode") == "view_tests_coverage") {
        loadJSON("./specTestsMap.json", showCoverage);
    }
});