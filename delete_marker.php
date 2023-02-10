<?php
/*
Usage: POST request with id and hash
Requires: the hash must match the hash of the marker with given id
Effects: If succesful, deletes the specified marker from the db and prints the string "Success".
         Prints a string beginning with "Error" on failure.
*/

// Ensure necessary inputs are present and well-formed
if (!isset($_POST["id"]) || !is_numeric($_POST["id"])) {
    die("Error: id not set or malformed.");
}
if (!isset($_POST["hash"])) {
    die("Error: hash not set.");
}


// If we reached this point, this is safe:
$id = $_POST["id"];
$hash = $_POST["hash"];

// Establish DB connection
$conn = new mysqli(ini_get("mysqli.default_host"),
                    ini_get("mysqli.default_user"),
                    ini_get("mysqli.default_pw"),
                    "memomap");

if ($conn->connect_error) {
    die("Error: " . $conn->connect_error);
}

// Prepare delete statement
$sql = "DELETE FROM markers WHERE marker_id = ? AND author_hash = ?"; // Make sure the hash is correct!
$stmt = $conn->prepare($sql); 
$stmt->bind_param("ds", $id, $hash);
$stmt->execute();
echo("Success"); // Note, success doesn"t necessarily mean we deleted a marker. It just means that there were no errors.