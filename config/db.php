<?php
// config/db.php

$DB_HOST = 'localhost';
$DB_NAME = 'semarasa';   
$DB_USER = 'root';       
$DB_PASS = '';           

/**
 * Mengembalikan instance PDO (singleton sederhana).
 */
function getPDO()
{
    static $pdo = null;

    if ($pdo === null) {
        global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;

        $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        try {
            $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }

    return $pdo;
}