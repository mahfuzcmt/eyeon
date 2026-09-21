<?php
/**
 * Database Connection Class using PDO
 */

require_once __DIR__ . '/config.php';

class Database
{
    private static ?PDO $instance = null;

    /**
     * Get PDO instance (singleton)
     */
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            try {
                $dsn = sprintf(
                    'mysql:host=%s;dbname=%s;charset=%s',
                    DB_HOST,
                    DB_NAME,
                    DB_CHARSET
                );

                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                ];

                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                if (DEBUG_MODE) {
                    die('Database connection failed: ' . $e->getMessage());
                } else {
                    die('Database connection failed. Please try again later.');
                }
            }
        }

        return self::$instance;
    }

    /**
     * Execute a query and return all results
     */
    public static function fetchAll(string $sql, array $params = []): array
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Execute a query and return single row
     */
    public static function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Execute a query and return single value
     */
    public static function fetchValue(string $sql, array $params = [])
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    /**
     * Execute an insert query and return last insert ID
     */
    public static function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));

        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";

        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($data);

        return (int)self::getInstance()->lastInsertId();
    }

    /**
     * Execute an update query and return affected rows
     */
    public static function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $setParts = [];
        foreach (array_keys($data) as $column) {
            $setParts[] = "{$column} = :{$column}";
        }
        $setClause = implode(', ', $setParts);

        $sql = "UPDATE {$table} SET {$setClause} WHERE {$where}";

        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute(array_merge($data, $whereParams));

        return $stmt->rowCount();
    }

    /**
     * Execute a delete query and return affected rows
     */
    public static function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM {$table} WHERE {$where}";

        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    /**
     * Execute a raw query
     */
    public static function execute(string $sql, array $params = []): int
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Begin a transaction
     */
    public static function beginTransaction(): bool
    {
        return self::getInstance()->beginTransaction();
    }

    /**
     * Commit a transaction
     */
    public static function commit(): bool
    {
        return self::getInstance()->commit();
    }

    /**
     * Rollback a transaction
     */
    public static function rollback(): bool
    {
        return self::getInstance()->rollBack();
    }

    /**
     * Get paginated results
     */
    public static function paginate(string $sql, array $params, int $page, int $perPage): array
    {
        // Get total count
        $countSql = preg_replace('/SELECT\s+.*?\s+FROM/is', 'SELECT COUNT(*) FROM', $sql);
        $countSql = preg_replace('/ORDER BY.*$/i', '', $countSql);
        $countSql = preg_replace('/LIMIT.*$/i', '', $countSql);

        $total = (int)self::fetchValue($countSql, $params);

        // Calculate pagination
        $totalPages = ceil($total / $perPage);
        $page = max(1, min($page, $totalPages));
        $offset = ($page - 1) * $perPage;

        // Get paginated results
        $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        $items = self::fetchAll($sql, $params);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $totalPages,
            'has_prev' => $page > 1,
            'has_next' => $page < $totalPages
        ];
    }
}

/**
 * Shortcut function for Database instance
 */
function db(): PDO
{
    return Database::getInstance();
}
