<?php
// api/places.php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/../config/db.php';

$pdo    = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGet($pdo);
} elseif ($method === 'POST') {
    handlePost($pdo);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

/**
 * GET /api/places.php      → semua data
 * GET /api/places.php?id=1 → satu data
 */
function handleGet(PDO $pdo)
{
    if (isset($_GET['id'])) {
        $id = (int) $_GET['id'];

        $stmt = $pdo->prepare('SELECT * FROM places WHERE id = ?');
        $stmt->execute([$id]);
        $place = $stmt->fetch();

        if ($place) {
            echo json_encode($place);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
        }
        return;
    }

    $stmt   = $pdo->query('SELECT * FROM places ORDER BY name ASC');
    $places = $stmt->fetchAll();

    echo json_encode($places);
}

/**
 * POST body JSON:
 * { "action": "create" | "update" | "delete", "data": {...} }
 */
function handlePost(PDO $pdo)
{
    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON body']);
        return;
    }

    $action = $input['action'] ?? null;
    $data   = $input['data']   ?? [];

    switch ($action) {
        case 'create':
            createPlace($pdo, $data);
            break;
        case 'update':
            updatePlace($pdo, $data);
            break;
        case 'delete':
            deletePlace($pdo, $data);
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
}

function createPlace(PDO $pdo, array $data)
{
    $required = ['name', 'category', 'lat', 'lng'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required"]);
            return;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO places (name, category, description, menu, price, address, hours, photo, lat, lng)
        VALUES (:name, :category, :description, :menu, :price, :address, :hours, :photo, :lat, :lng)
    ");

    $stmt->execute([
        ':name'        => $data['name'],
        ':category'    => $data['category'],
        ':description' => $data['description'] ?? null,
        ':menu'        => $data['menu'] ?? null,
        ':price'       => $data['price'] ?? null,
        ':address'     => $data['address'] ?? null,
        ':hours'       => $data['hours'] ?? null,
        ':photo'       => $data['photo'] ?? null,
        ':lat'         => $data['lat'],
        ':lng'         => $data['lng'],
    ]);

    $id = $pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT * FROM places WHERE id = ?');
    $stmt->execute([$id]);
    $place = $stmt->fetch();

    echo json_encode([
        'message' => 'Created',
        'place'   => $place
    ]);
}

function updatePlace(PDO $pdo, array $data)
{
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Field id is required']);
        return;
    }

    $id = (int) $data['id'];

    $stmt = $pdo->prepare("
        UPDATE places
        SET name = :name,
            category = :category,
            description = :description,
            menu = :menu,
            price = :price,
            address = :address,
            hours = :hours,
            photo = :photo,
            lat = :lat,
            lng = :lng
        WHERE id = :id
    ");

    $stmt->execute([
        ':id'          => $id,
        ':name'        => $data['name'] ?? '',
        ':category'    => $data['category'] ?? '',
        ':description' => $data['description'] ?? null,
        ':menu'        => $data['menu'] ?? null,
        ':price'       => $data['price'] ?? null,
        ':address'     => $data['address'] ?? null,
        ':hours'       => $data['hours'] ?? null,
        ':photo'       => $data['photo'] ?? null,
        ':lat'         => $data['lat'] ?? 0,
        ':lng'         => $data['lng'] ?? 0,
    ]);

    $stmt = $pdo->prepare('SELECT * FROM places WHERE id = ?');
    $stmt->execute([$id]);
    $place = $stmt->fetch();

    echo json_encode([
        'message' => 'Updated',
        'place'   => $place
    ]);
}

function deletePlace(PDO $pdo, array $data)
{
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Field id is required']);
        return;
    }

    $id = (int) $data['id'];

    $stmt = $pdo->prepare('DELETE FROM places WHERE id = ?');
    $stmt->execute([$id]);

    echo json_encode(['message' => 'Deleted']);
}