deltaLat = 0.07; // Boundaries to load markers within
deltaLong = 0.07;

lastKnownLocation = null; // Tracks last-known location
fingerprintingBlocked = false;

// Initialize fingerprinting engine
const fpPromise = import("https://openfpcdn.io/fingerprintjs/v3") // Open source, can use fingerprint pro for better accuracy.
.then(FingerprintJS => FingerprintJS.load())
.catch(e => fingerprintingBlocked = true); // Fingerprinting must be blocked, take note.

function getLocation() {
    if (!navigator.geolocation) {
        geoError();
    } else {
        navigator.geolocation.getCurrentPosition(function(geo) {
            updateMapMarkers(geo.coords);
            updateUserLocation(geo.coords);
        }, geoError);
    }
  }  

  function geoError() {
    $("#locationModal").modal({backdrop: "static", keyboard: false}, "show");
  }
  

function updateMapMarkers(locationEvent) {
    getFpPromiseSafe()
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        const visitorId = result.visitorId;
        lastKnownLocation = locationEvent; // Update last known location
        
        minLat = locationEvent.latitude - deltaLat;
        maxLat = locationEvent.latitude + deltaLat;
        minLong = locationEvent.longitude - deltaLong;
        maxLong = locationEvent.longitude + deltaLong;

        fetch("get_markers.php?min_lat=" + minLat + "&max_lat=" + maxLat + "&min_long=" + minLong + "&max_long=" + maxLong + "&hash=" + visitorId)
        .then(response => response.json())
        .then(jsonResponse => {
            $("path.leaflet-interactive").remove(); // Clear all circleMarkers so we can redraw them
            $("#nearbyMenu").empty();               // Clear nearbyMenu so we can update it
            jsonResponse.forEach(function(marker) {  
                placeMarker(marker);
                addDropdownItem(marker);
            });
        });
    });
}

placedMarkers = {}; // Stores references to placed markers

// Draws a circle marker representing a memo, and adds it to placedMarkers
function placeMarker(markerJson) {
    if (markerJson.author_hash) { // Current user is author of marker: show delete button.
        var circleMarker = L.circleMarker([markerJson.latitude, markerJson.longitude], 
            {stroke: true, fillOpacity: 0.75, radius: 16, color: "#fcc201"})
            .addTo(map);
        circleMarker.bindPopup("<div class=\"text-center\"><p class=\"lead\">" + 
            markerJson.message + 
            "</p><p> Memo Date: " +
            markerJson.creation_date +
            "</p><button class=\"btn btn-danger\" onclick=\"deleteMemo(" + markerJson.marker_id + ")\">Delete Memo</button></div>");
    } else { // Current user is not author of marker
        var circleMarker = L.circleMarker([markerJson.latitude, markerJson.longitude], 
            {stroke: true, fillOpacity: 0.75, radius: 16})
            .addTo(map);
        circleMarker.bindPopup("<div class=\"text-center\"><p class=\"lead\">" + 
            markerJson.message + 
            "</p><p> Memo Date: " +
            markerJson.creation_date +
            "</p></div>");
    }
    placedMarkers[markerJson.marker_id] = circleMarker;
}

// Adds a link to a memo to the "nearby" dropdown menu
function addDropdownItem(markerJson) {
    shortenedText = shortenText(markerJson.message, 20); // Truncate message to 20 characters
    if (markerJson.author_hash) { // Current user is author of marker: add to TOP of list
        $("#nearbyMenu").prepend(
            $("<a/>")
            .attr("href", "#")
            .addClass("dropdown-item font-weight-bold")
            .append($("<strong/>").text(shortenedText))
            .click(function(){
                placedMarkers[markerJson.marker_id].fire("click");
                map.setView([markerJson.latitude, markerJson.longitude], 19);
            })
        );
    } else { // Current user is not author of marker
        $("#nearbyMenu").append(
            $("<a/>")
            .attr("href", "#")
            .addClass("dropdown-item font-weight-bold")
            .text(shortenedText)
            .click(function(){
                placedMarkers[markerJson.marker_id].fire("click");
                map.setView([markerJson.latitude, markerJson.longitude], 19);
            })
        );
    }
}

// If text is longer than length, truncate to (length - 3) and add ...
// Requires that length is longer than 3
function shortenText(longText, length) {
    if (longText.length > length) {
        return longText.substring(0, length - 3) + "...";
    } else {
        return longText;
    }
}

var userLocationMarker; // Marker representing user location

// Places a marker at the user's geospatial position on the map
function updateUserLocation(locationEvent) {
    lastKnownLocation = locationEvent; // Update last known location
    if (userLocationMarker) {
        map.removeLayer(userLocationMarker); // Remove marker so we can redraw it
    }
    userLocationMarker = L.marker([locationEvent.latitude, locationEvent.longitude], {interactive: false, bubblingMouseEvents: true});
    map.addLayer(userLocationMarker);
}

// Recenter the map
function recenter() {
    map.locate({setView: true, zoom: 19});
}

// POST the backend to create a new marker
function postMarker() {
    getFpPromiseSafe()
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        const visitorId = result.visitorId;
        if (lastKnownLocation !== null) {
            fetch("place_marker.php", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "lat=" + lastKnownLocation.latitude + "&long=" + lastKnownLocation.longitude + "&msg=" + $("#newMemoText").val() + "&hash=" + visitorId,
            })
            .then((response) => response.text())
            .then(text => {
                if (text == "Success") {
                    updateMapMarkers(lastKnownLocation);
                    $("#newMemoText").val("");
                }
            });
        }
    });
    $("#addModal").modal("hide");
}

// Requests that the server deletes a given memo
function deleteMemo(markerId) {
    getFpPromiseSafe()
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        const visitorId = result.visitorId;
        fetch("delete_marker.php", {
            method: "POST",
            headers: {"Content-Type":"application/x-www-form-urlencoded"},
            body: "id=" + markerId + "&hash=" + visitorId,
        })
        .then((response) => response.text())
        .then(text => {
            if (text == "Success") {
                updateMapMarkers(lastKnownLocation);
            }
        });
        map.closePopup();
    });
}

// If fingerprinting is allowed, return fppPromise. If not allowed, return a similarly-structured promise that returns a visitorId of "nofingerprint"
// Dirty hack to avoid errors. Rewrite in the future!
function getFpPromiseSafe() {
    if (fingerprintingBlocked) {
        return Promise.resolve({get: function(){return Promise.resolve({visitorId: "nofingerprint"})}});
    } else {
        return fpPromise;
    }
}