delta_lat = 0.05; // Boundaries to load markers within
delta_long = 0.05;

last_known_location = null; // Tracks last-known location
fingerprinting_blocked = false;

// Initialize fingerprinting engine
const fpPromise = import("https://openfpcdn.io/fingerprintjs/v3") // Open source, can use fingerprint pro for better accuracy.
.then(FingerprintJS => FingerprintJS.load())
.catch(e => fingerprinting_blocked = true); // Fingerprinting must be blocked, take note.

function getLocation() {
    if (!navigator.geolocation) {
        geo_error();
    } else {
        navigator.geolocation.getCurrentPosition(function(geo) {
            update_map_markers(geo.coords);
            update_user_location(geo.coords);
        }, geo_error);
    }
  }  

  function geo_error() {
    $("#locationModal").modal({backdrop: "static", keyboard: false}, "show");
  }
  

function update_map_markers(locationEvent) {
    get_fp_promise_safe()
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        const visitorId = result.visitorId;
        last_known_location = locationEvent; // Update last known location
        
        min_lat = locationEvent.latitude - delta_lat;
        max_lat = locationEvent.latitude + delta_lat;
        min_long = locationEvent.longitude - delta_long;
        max_long = locationEvent.longitude + delta_long;

        fetch("get_markers.php?min_lat=" + min_lat + "&max_lat=" + max_lat + "&min_long=" + min_long + "&max_long=" + max_long + "&hash=" + visitorId)
        .then(response => response.json())
        .then(jsonResponse => {
            $("path.leaflet-interactive").remove(); // Clear all circleMarkers so we can redraw them
            jsonResponse.forEach(function(marker) {  
                place_marker(marker);
            });
        });
    });
}

// Draws a circle marker representing a memo
function place_marker(marker_json) {
    if (marker_json.author_hash) { // Current user is author of marker—: show delete button.
        var circleMarker = L.circleMarker([marker_json.latitude, marker_json.longitude], {stroke: true, fillOpacity: 0.75, radius: 16, color: "#fcc201"}).addTo(map);
        circleMarker.bindPopup("<div class=\"text-center\"><p class=\"lead\">" + 
            marker_json.message + 
            "</p><p> Memo Date: " +
            marker_json.creation_date +
            "</p><button class=\"btn btn-danger\" onclick=\"delete_memo(" + marker_json.marker_id + ")\">Delete Memo</button></div>");
    } else { // Current user is not author of marker
        var circleMarker = L.circleMarker([marker_json.latitude, marker_json.longitude], {stroke: true, fillOpacity: 0.75, radius: 16}).addTo(map);
        circleMarker.bindPopup("<div class=\"text-center\"><p class=\"lead\">" + 
            marker_json.message + 
            "</p><p> Memo Date: " +
            marker_json.creation_date +
            "</p></div>");
    }
}

var marker; // Marker representing user location
// Places a marker at the user"s geospatial position on the map
function update_user_location(locationEvent) {
    last_known_location = locationEvent; // Update last known location
    if (!marker) {
        marker = L.marker([locationEvent.latitude, locationEvent.longitude], {interactive: false, bubblingMouseEvents: true});
        marker.addTo(map);
    }
}

// Recenter the map
function recenter() {
    map.locate({setView: true, zoom: 19});
}

// POST the backend to create a new marker
function post_marker() {
    get_fp_promise_safe()
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        const visitorId = result.visitorId;
        if (last_known_location !== null) {
            fetch("place_marker.php", {
                method: "POST",
                headers: {"Content-Type":"application/x-www-form-urlencoded"},
                body: "lat=" + last_known_location.latitude + "&long=" + last_known_location.longitude + "&msg=" + $("#newMemoText").val() + "&hash=" + visitorId,
            })
            .then((response) => response.text())
            .then(text => {
                if (text == "Success") {
                    update_map_markers(last_known_location);
                }
            });
        }
    });
    $("#addModal").modal("hide");
}

// Requests that the server deletes a given memo
function delete_memo(marker_id) {
    get_fp_promise_safe()
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        const visitorId = result.visitorId;
        fetch("delete_marker.php", {
            method: "POST",
            headers: {"Content-Type":"application/x-www-form-urlencoded"},
            body: "id=" + marker_id + "&hash=" + visitorId,
        })
        .then((response) => response.text())
        .then(text => {
            if (text == "Success") {
                update_map_markers(last_known_location);
            }
        });
        map.closePopup();
    });
}

// If fingerprinting is allowed, return fppPromise. If not allowed, return a similarly-structured promise that returns a visitorId of "nofingerprint"
// Dirty hack to avoid errors. Rewrite in the future!
function get_fp_promise_safe() {
    if (fingerprinting_blocked) {
        return Promise.resolve({get: function(){return Promise.resolve({visitorId: "nofingerprint"})}});
    } else {
        return fpPromise;
    }
}
