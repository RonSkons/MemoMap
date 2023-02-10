<?php
/*
Usage: GET request with well-formed min_lat, max_lat, min_long, max_long, hash.
Requires: min_lat > max_lat, min_long > max_long
Effects: Outputs a JSON array of map markers with latitude and longitude within the specified bounds,
         or string beginning with "Error" if an error occurs. If the marker"s hash matches the provided hash,
         it is indicated accordingly.
*/

// Ensure necessary inputs are present and well-formed
$params = array("min_lat", "min_long", "min_lat", "max_lat");
foreach ($params as $param) {
    if (!isset($_GET[$param]) || !is_numeric($_GET[$param])) {
        die("Error: $param is not well-formed.");
    }
}

if (!isset($_GET["hash"])) {
    die("Error: hash not set.");
}

// If we reached this point, this is safe:
$min_lat = $_GET["min_lat"];
$max_lat = $_GET["max_lat"];
$min_long = $_GET["min_long"];
$max_long = $_GET["max_long"];
$hash = $_GET["hash"];

$min_lat < $max_lat or die("Error: min_lat must be smaller than max_lat");
$min_long < $max_long or die("Error: min_long must be smaller than max_long");

// Establish DB connection
$conn = new mysqli(ini_get("mysqli.default_host"),
                    ini_get("mysqli.default_user"),
                    ini_get("mysqli.default_pw"),
                    "memomap");

if ($conn->connect_error) {
    die("Error: " . $conn->connect_error);
}

$result_array = array();

// Get all markers within specified lat/long range
$sql = "SELECT * FROM markers WHERE latitude >= ? AND latitude <= ? AND longitude >= ? and longitude <= ?";
$stmt = $conn->prepare($sql); 
$stmt->bind_param("dddd", $min_lat, $max_lat, $min_long, $max_long);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $row["message"] = htmlspecialchars($row["message"]);
    $row["author_hash"] = $row["author_hash"] == $hash;
    $result_array[] = $row;
}

// Output results
echo(json_encode($result_array));