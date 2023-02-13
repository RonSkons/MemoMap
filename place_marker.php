<?php
/*
Usage: POST request with well-formed lat, long, msg, and hash.
Requires: msg not null and <=200 characters, lat, long well-formed
Effects: If succesful, adds the provided marker to the db and prints the string "Success".
         Prints a string beginning with "Error" on failure.
*/

// Ensure necessary inputs are present and well-formed
if (!isset($_POST["lat"]) || !is_numeric($_POST["lat"])) {
    die("Error: lat not set or non-numeric.");
}
if (!isset($_POST["long"]) || !is_numeric($_POST["long"])) {
    die("Error: long not set or non-numeric.");
}
if (!isset($_POST["msg"]) || trim($_POST["msg"]) == "" || strlen(trim($_POST["msg"])) > 200) {
    die("Error: msg not set or malformed.");
}
if (!isset($_POST["hash"])) {
    die("Error: hash not set.");
}


// If we reached this point, this is safe:
$lat = $_POST["lat"];
$long = $_POST["long"];
$msg = trim($_POST["msg"]);
$hash = $_POST["hash"];

// Establish DB connection
$conn = new mysqli(ini_get("mysqli.default_host"),
                    ini_get("mysqli.default_user"),
                    ini_get("mysqli.default_pw"),
                    "memomap");

if ($conn->connect_error) {
    die("Error: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4"); // Fix for broken diacritics (é, etc.) and emojis

// Prepare statement
if ($hash == "nofingerprint") {
    // User has blocked fingerprinting. Hash should be NULL.
    $sql = "INSERT INTO markers (latitude, longitude, message) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql); 
    $stmt->bind_param("dds", $lat, $long, $msg);
} else {
    $sql = "INSERT INTO markers (latitude, longitude, message, author_hash) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql); 
    $stmt->bind_param("ddss", $lat, $long, $msg, $hash);
}
$stmt->execute();

echo("Success");
