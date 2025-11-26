<?php
// config/db.php

$DB_HOST = 'localhost';
$DB_NAME = 'semarasa_db';   
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

        $dsnDb = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";
        $dsnServer = "mysql:host=$DB_HOST;charset=utf8mb4";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        try {
            // Coba koneksi langsung ke database
            $pdo = new PDO($dsnDb, $DB_USER, $DB_PASS, $options);
        } catch (PDOException $e) {
            // Jika gagal (misal database belum ada), coba buat database terlebih dahulu
            try {
                $pdoServer = new PDO($dsnServer, $DB_USER, $DB_PASS, $options);
                $pdoServer->exec("CREATE DATABASE IF NOT EXISTS `$DB_NAME` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
                // Setelah DB dipastikan ada, koneksi ulang ke DB
                $pdo = new PDO($dsnDb, $DB_USER, $DB_PASS, $options);
            } catch (PDOException $e2) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Database connection failed']);
                exit;
            }
        }
    }

    return $pdo;
}