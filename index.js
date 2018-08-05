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
        if (request.readyState === 4 && request.status === 200) {
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

function showSentenceCoverage(sentenceElement, sentenceTestInfo, sentenceNumber, paragraphNumber) {
    sentenceElement.setAttribute("data-d", "4");
    sentenceElement.style.background = "rgb(213, 236, 206)";
    sentenceElement.style.borderRadius = "5px";

    var testTypes = {"pos": "positive", "neg": "negative"};
    var testAreas = ["diagnostics", "psi", "codegen"];

    testAreas.forEach(function(testArea) {
        if (!sentenceTestInfo[testArea]) {
            sentenceTestInfo[testArea] = {};
        }
    });

    var testsByArea = [];

    for (var area in sentenceTestInfo) {
        var testNumberByType = {};
        for (var testType in sentenceTestInfo[area]) {
            var testNumber = Object.keys(sentenceTestInfo[area][testType]).length;
            testNumberByType[testType] = testNumber;
        }
        var testNumberByTypeInfo = [];
        for (var testNumberInfo in testNumberByType) {
            testNumberByTypeInfo.push(testNumberByType[testNumberInfo] + " " + testTypes[testNumberInfo]);
        }
        if (testNumberByTypeInfo.length > 0) {
            testsByArea.push("<b>" + area.toLocaleUpperCase() + "</b>: " + testNumberByTypeInfo.join(", "));
        }
    }

    var coverageInfoSpan = document.createElement("span");
    coverageInfoSpan.setAttribute("class", "coverage-info");
    coverageInfoSpan.innerHTML = testsByArea.join("<br />");
    sentenceElement.prepend(coverageInfoSpan);

    addNumberInfo(sentenceElement, sentenceNumber);
}

function addNumberInfo(sentenceElement, sentenceNumber) {
    var numberInfoSpan = document.createElement("span");
    numberInfoSpan.setAttribute("class", "number-info");
    numberInfoSpan.innerHTML = sentenceNumber;
    sentenceElement.insertBefore(numberInfoSpan, sentenceElement.firstChild);
}

function markSentenceNotCovered(sentenceElement, sentenceNumber) {
    sentenceElement.style.background = "rgb(255, 195, 195)";
    sentenceElement.style.borderRadius = "5px";

    addNumberInfo(sentenceElement, sentenceNumber);
}

function showCoverage(specTestsMap) {
    // for (var section in specTestsMap) {
    //     var paragraphs = specTestsMap[section];
    var sections = document.querySelectorAll("h3");

    Array.from(sections).forEach(function(sectionElement) {
        // if (sectionElement == null) {
        //     continue
        // }

        var nextSibling = sectionElement.nextElementSibling;
        var sectionId = sectionElement.attributes.getNamedItem("id").value;
        var paragraphs = specTestsMap[sectionId];
        var paragraphCounter = 0;

        while (nextSibling) {
            var isNewSection = nextSibling.tagName === "H3" || nextSibling.tagName === "H2";
            if (isNewSection) break;

            var isParagraph = nextSibling.classList && (nextSibling.classList.contains("paragraph") || nextSibling.tagName === "DL" || nextSibling.tagName === "UL" || nextSibling.tagName === "OL");
            var childParagraph = nextSibling.querySelector(".paragraph");

            if (isParagraph || childParagraph) { //  && ++paragraphCounter in paragraphs
                var paragraph = childParagraph || nextSibling;

                paragraphCounter++;

                var sentenceElements = paragraph.querySelectorAll(".sentence");
                var sentenceObject = paragraphs ? paragraphs[paragraphCounter] : null;
                var sentenceCounter = 1;

                Array.from(sentenceElements).forEach(function(sentenceElement) {
                    if (sentenceObject && sentenceCounter in sentenceObject) {
                        showSentenceCoverage(sentenceElement, sentenceObject[sentenceCounter], sentenceCounter, paragraphCounter);
                    } else {
                        markSentenceNotCovered(sentenceElement, sentenceCounter);
                    }
                    sentenceCounter++;
                });
                addNumberInfo(paragraph, paragraphCounter);
            }
            nextSibling = nextSibling.nextElementSibling;
        }
    })
}

window.addEventListener("DOMContentLoaded", function(event) {
    if (location.hash) {
        highlightSentence(location.hash.split(':'));
    }

    if (getQueryParam("mode") === "view_tests_coverage") {
        loadJSON("./specTestsMap.json", showCoverage);
        document.body.classList.add("view-tests-coverage");
    }
});